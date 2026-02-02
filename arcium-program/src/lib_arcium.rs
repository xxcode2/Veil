use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

// Computation definition offsets
const COMP_DEF_OFFSET_INIT_GAME: u32 = comp_def_offset("init_game");
const COMP_DEF_OFFSET_VOTE: u32 = comp_def_offset("vote");
const COMP_DEF_OFFSET_REVEAL: u32 = comp_def_offset("reveal_result");

declare_id!("51JDkhaM8nWP3NEEtDAs28WKZH8bM5Wr6YGVyuMxHfZu");

#[arcium_program]
pub mod veil {
    use super::*;

    // ===== INIT GAME COMPUTATION DEFINITION =====
    pub fn init_game_comp_def(ctx: Context<InitGameCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Creates a new voting game session
    /// Initializes encrypted vote counters using MPC
    /// Selects random saboteur inside MPC enclave (server never knows)
    pub fn create_game(
        ctx: Context<CreateGame>,
        computation_offset: u64,
        game_id: u32,
        num_players: u8,
        nonce: u128,
    ) -> Result<()> {
        msg!("Creating new Veil game with {} players", num_players);

        require!(num_players >= 2 && num_players <= 8, ErrorCode::InvalidPlayerCount);

        ctx.accounts.game_account.game_id = game_id;
        ctx.accounts.game_account.bump = ctx.bumps.game_account;
        ctx.accounts.game_account.authority = ctx.accounts.payer.key();
        ctx.accounts.game_account.num_players = num_players;
        ctx.accounts.game_account.nonce = nonce;
        ctx.accounts.game_account.vote_state = [[0; 32]; 8]; // Max 8 players
        ctx.accounts.game_account.status = GameStatus::Lobby as u8;

        let args = ArgBuilder::new()
            .plaintext_u128(nonce)
            .plaintext_u8(num_players)
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![InitGameCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.game_account.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "init_game")]
    pub fn init_game_callback(
        ctx: Context<InitGameCallback>,
        output: SignedComputationOutputs<InitGameOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(InitGameOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.game_account.vote_state = o.ciphertexts;
        ctx.accounts.game_account.nonce = o.nonce;
        ctx.accounts.game_account.status = GameStatus::Voting as u8;

        Ok(())
    }

    // ===== VOTE COMPUTATION DEFINITION =====
    pub fn init_vote_comp_def(ctx: Context<InitVoteCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Submit encrypted vote
    /// Vote is encrypted client-side using x25519 + Rescue cipher
    /// Server receives only ciphertext
    pub fn submit_vote(
        ctx: Context<SubmitVote>,
        computation_offset: u64,
        game_id: u32,
        player_index: u8,
        encrypted_vote: [u8; 32],
        vote_encryption_pubkey: [u8; 32],
        vote_nonce: u128,
    ) -> Result<()> {
        require!(
            ctx.accounts.game_account.status == GameStatus::Voting as u8,
            ErrorCode::InvalidGameStatus
        );

        require!(player_index < ctx.accounts.game_account.num_players, ErrorCode::InvalidPlayerIndex);

        msg!("Submitting vote for player {} in game {}", player_index, game_id);

        let args = ArgBuilder::new()
            .x25519_pubkey(vote_encryption_pubkey)
            .plaintext_u128(vote_nonce)
            .encrypted_bool(encrypted_vote) // Vote: true = SAFE, false = UNSAFE
            .plaintext_u128(ctx.accounts.game_account.nonce)
            .plaintext_u8(player_index)
            .account(
                ctx.accounts.game_account.key(),
                8 + 1, // discriminator + bump
                32 * 8, // 8 vote slots, 32 bytes each
            )
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![VoteCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.game_account.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "vote")]
    pub fn vote_callback(
        ctx: Context<VoteCallback>,
        output: SignedComputationOutputs<VoteOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(VoteOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.game_account.vote_state = o.ciphertexts;
        ctx.accounts.game_account.nonce = o.nonce;
        ctx.accounts.game_account.votes_received += 1;

        // If all votes in, mark ready for reveal
        if ctx.accounts.game_account.votes_received == ctx.accounts.game_account.num_players {
            ctx.accounts.game_account.status = GameStatus::Computing as u8;
        }

        emit!(VoteSubmittedEvent {
            game_id: ctx.accounts.game_account.game_id,
            votes_received: ctx.accounts.game_account.votes_received,
            total_players: ctx.accounts.game_account.num_players,
        });

        Ok(())
    }

    // ===== REVEAL COMPUTATION DEFINITION =====
    pub fn init_reveal_comp_def(ctx: Context<InitRevealCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Reveal game result
    /// MPC computes:
    /// 1. Decrypt all votes
    /// 2. Select random saboteur (inside MPC, server never knows until reveal)
    /// 3. Determine majority vote (excluding saboteur)
    /// 4. Check if community won
    pub fn reveal_result(
        ctx: Context<RevealResult>,
        computation_offset: u64,
        game_id: u32,
    ) -> Result<()> {
        require!(
            ctx.accounts.payer.key() == ctx.accounts.game_account.authority,
            ErrorCode::InvalidAuthority
        );

        require!(
            ctx.accounts.game_account.status == GameStatus::Computing as u8,
            ErrorCode::InvalidGameStatus
        );

        msg!("Revealing result for game {}", game_id);

        let args = ArgBuilder::new()
            .plaintext_u128(ctx.accounts.game_account.nonce)
            .plaintext_u8(ctx.accounts.game_account.num_players)
            .account(
                ctx.accounts.game_account.key(),
                8 + 1, // discriminator + bump
                32 * 8, // 8 encrypted votes
            )
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![RevealResultCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.game_account.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "reveal_result")]
    pub fn reveal_result_callback(
        ctx: Context<RevealResultCallback>,
        output: SignedComputationOutputs<RevealResultOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(RevealResultOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.game_account.status = GameStatus::Finished as u8;

        emit!(GameResultEvent {
            game_id: ctx.accounts.game_account.game_id,
            saboteur_index: o.saboteur_index,
            saboteur_voted_safe: o.saboteur_voted_safe,
            community_voted_safe: o.community_voted_safe,
            community_won: o.community_won,
            player_results: o.player_results,
        });

        Ok(())
    }
}

// ===== ACCOUNT STRUCTURES =====

#[queue_computation_accounts("init_game", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, game_id: u32)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: Checked by Arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: Checked by Arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: Checked by Arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_GAME))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        init,
        payer = payer,
        space = 8 + GameAccount::INIT_SPACE,
        seeds = [b"game", payer.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub game_account: Account<'info, GameAccount>,
}

#[callback_accounts("init_game")]
#[derive(Accounts)]
pub struct InitGameCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_GAME))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: Checked by Arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: Sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
}

#[init_computation_definition_accounts("init_game", payer)]
#[derive(Accounts)]
pub struct InitGameCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: Checked by Arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("vote", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, game_id: u32, player_index: u8)]
pub struct SubmitVote<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: Checked by Arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: Checked by Arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: Checked by Arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VOTE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = game_account.authority)]
    /// CHECK: Game authority
    pub authority: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"game", authority.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump = game_account.bump,
        has_one = authority
    )]
    pub game_account: Account<'info, GameAccount>,
}

#[callback_accounts("vote")]
#[derive(Accounts)]
pub struct VoteCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VOTE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: Checked by Arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: Sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
}

#[init_computation_definition_accounts("vote", payer)]
#[derive(Accounts)]
pub struct InitVoteCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: Checked by Arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("reveal_result", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, game_id: u32)]
pub struct RevealResult<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: Checked by Arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: Checked by Arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: Checked by Arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        mut,
        seeds = [b"game", payer.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump = game_account.bump
    )]
    pub game_account: Account<'info, GameAccount>,
}

#[callback_accounts("reveal_result")]
#[derive(Accounts)]
pub struct RevealResultCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: Checked by Arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: Sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
}

#[init_computation_definition_accounts("reveal_result", payer)]
#[derive(Accounts)]
pub struct InitRevealCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: Checked by Arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ===== DATA STRUCTURES =====

#[account]
#[derive(InitSpace)]
pub struct GameAccount {
    pub bump: u8,
    pub game_id: u32,
    pub authority: Pubkey,
    pub num_players: u8,
    pub votes_received: u8,
    pub status: u8, // GameStatus enum
    pub nonce: u128,
    pub vote_state: [[u8; 32]; 8], // Max 8 players, encrypted votes
}

#[repr(u8)]
pub enum GameStatus {
    Lobby = 0,
    Voting = 1,
    Computing = 2,
    Finished = 3,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid player count (must be 2-8)")]
    InvalidPlayerCount,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Computation was aborted")]
    AbortedComputation,
    #[msg("Cluster not set")]
    ClusterNotSet,
    #[msg("Invalid game status")]
    InvalidGameStatus,
    #[msg("Invalid player index")]
    InvalidPlayerIndex,
}

#[event]
pub struct VoteSubmittedEvent {
    pub game_id: u32,
    pub votes_received: u8,
    pub total_players: u8,
}

#[event]
pub struct GameResultEvent {
    pub game_id: u32,
    pub saboteur_index: u8,
    pub saboteur_voted_safe: bool,
    pub community_voted_safe: bool,
    pub community_won: bool,
    pub player_results: Vec<bool>, // Per-player: did they win?
}
