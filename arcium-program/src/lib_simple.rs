use anchor_lang::prelude::*;

declare_id!("51JDkhaM8nWP3NEEtDAs28WKZH8bM5Wr6YGVyuMxHfZu");

#[program]
pub mod veil {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>, room_code: String, player_count: u8) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.room_code = room_code;
        game.player_count = player_count;
        game.votes = vec![0; player_count as usize];
        game.status = GameStatus::WaitingForVotes;
        game.saboteur_index = 255; // Will be set during reveal
        
        msg!("Game created for room: {}", game.room_code);
        Ok(())
    }

    pub fn submit_vote(ctx: Context<SubmitVote>, player_index: u8, vote: u8) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require!(player_index < game.player_count, ErrorCode::InvalidPlayerIndex);
        require!(game.status == GameStatus::WaitingForVotes, ErrorCode::InvalidGameStatus);
        
        game.votes[player_index as usize] = vote;
        
        emit!(VoteSubmittedEvent {
            room_code: game.room_code.clone(),
            player_index,
        });
        
        Ok(())
    }

    pub fn reveal_result(ctx: Context<RevealResult>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require!(game.status == GameStatus::WaitingForVotes, ErrorCode::InvalidGameStatus);
        
        // Simple random saboteur selection (use clock for randomness)
        let clock = Clock::get()?;
        game.saboteur_index = (clock.unix_timestamp % game.player_count as i64) as u8;
        
        // Count votes
        let safe_votes: u8 = game.votes.iter().filter(|&&v| v == 1).count() as u8;
        let unsafe_votes: u8 = game.votes.iter().filter(|&&v| v == 2).count() as u8;
        
        // Determine winner
        let saboteur_vote = game.votes[game.saboteur_index as usize];
        game.status = if saboteur_vote == unsafe_votes && unsafe_votes > safe_votes {
            GameStatus::SaboteurWins
        } else if safe_votes > unsafe_votes {
            GameStatus::CrewWins
        } else {
            GameStatus::Tie
        };
        
        emit!(GameResultEvent {
            room_code: game.room_code.clone(),
            saboteur_index: game.saboteur_index,
            safe_votes,
            unsafe_votes,
            winner: game.status.clone(),
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(room_code: String, player_count: u8)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GameAccount::INIT_SPACE,
        seeds = [b"game", room_code.as_bytes()],
        bump
    )]
    pub game: Account<'info, GameAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitVote<'info> {
    #[account(
        mut,
        seeds = [b"game", game.room_code.as_bytes()],
        bump
    )]
    pub game: Account<'info, GameAccount>,
}

#[derive(Accounts)]
pub struct RevealResult<'info> {
    #[account(
        mut,
        seeds = [b"game", game.room_code.as_bytes()],
        bump
    )]
    pub game: Account<'info, GameAccount>,
}

#[account]
#[derive(InitSpace)]
pub struct GameAccount {
    #[max_len(6)]
    pub room_code: String,
    pub player_count: u8,
    #[max_len(8)]
    pub votes: Vec<u8>,
    pub saboteur_index: u8,
    pub status: GameStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum GameStatus {
    WaitingForVotes,
    CrewWins,
    SaboteurWins,
    Tie,
}

#[event]
pub struct VoteSubmittedEvent {
    pub room_code: String,
    pub player_index: u8,
}

#[event]
pub struct GameResultEvent {
    pub room_code: String,
    pub saboteur_index: u8,
    pub safe_votes: u8,
    pub unsafe_votes: u8,
    pub winner: GameStatus,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid player index")]
    InvalidPlayerIndex,
    #[msg("Invalid game status")]
    InvalidGameStatus,
}
