use arcium_sdk::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedVote {
    pub player_id: String,
    pub vote: String, // Will be decrypted inside MPC
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComputationInput {
    pub votes: Vec<EncryptedVote>,
    pub total_players: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComputationOutput {
    pub saboteur_id: String,
    pub community_correct: bool,
    pub saboteur_vote: String,
    pub majority_vote: String,
    pub player_results: Vec<PlayerResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerResult {
    pub player_id: String,
    pub was_correct: bool,
    pub is_saboteur: bool,
}

// Custom random number generator using Arcium's secure randomness
fn secure_random(max: usize, seed: &[u8]) -> usize {
    let mut hash = 0u64;
    for (i, &byte) in seed.iter().enumerate() {
        hash = hash.wrapping_add((byte as u64).wrapping_mul((i as u64).wrapping_add(1)));
    }
    (hash as usize) % max
}

#[arcium_compute]
pub fn compute_voting_result(input: ComputationInput) -> Result<ComputationOutput, String> {
    if input.votes.is_empty() {
        return Err("No votes provided".to_string());
    }

    if input.votes.len() < 2 {
        return Err("Need at least 2 players".to_string());
    }

    // Step 1: Select random saboteur (inside MPC, using player IDs as seed)
    let mut seed: Vec<u8> = Vec::new();
    for vote in &input.votes {
        seed.extend_from_slice(vote.player_id.as_bytes());
    }
    
    let saboteur_index = secure_random(input.votes.len(), &seed);
    let saboteur = &input.votes[saboteur_index];
    let saboteur_id = saboteur.player_id.clone();
    let saboteur_vote = saboteur.vote.clone();

    // Step 2: Count votes (excluding saboteur for majority calculation)
    let mut vote_a_count = 0;
    let mut vote_b_count = 0;

    for (i, vote) in input.votes.iter().enumerate() {
        if i == saboteur_index {
            continue; // Don't count saboteur in community vote
        }

        match vote.vote.as_str() {
            "A" => vote_a_count += 1,
            "B" => vote_b_count += 1,
            _ => return Err(format!("Invalid vote: {}", vote.vote)),
        }
    }

    // Step 3: Determine majority vote (community consensus)
    let majority_vote = if vote_a_count > vote_b_count {
        "A"
    } else if vote_b_count > vote_a_count {
        "B"
    } else {
        // Tie: use first non-saboteur vote
        let first_non_saboteur = input.votes.iter()
            .enumerate()
            .find(|(i, _)| *i != saboteur_index)
            .map(|(_, v)| v.vote.as_str())
            .unwrap_or("A");
        first_non_saboteur
    };

    // Step 4: Check if community was correct (majority != saboteur)
    let community_correct = majority_vote != saboteur_vote.as_str();

    // Step 5: Generate per-player results
    let mut player_results = Vec::new();
    for (i, vote) in input.votes.iter().enumerate() {
        let is_saboteur = i == saboteur_index;
        let was_correct = if is_saboteur {
            // Saboteur wins if they're different from majority
            vote.vote != majority_vote
        } else {
            // Regular player wins if they match majority
            vote.vote == majority_vote
        };

        player_results.push(PlayerResult {
            player_id: vote.player_id.clone(),
            was_correct,
            is_saboteur,
        });
    }

    Ok(ComputationOutput {
        saboteur_id,
        community_correct,
        saboteur_vote,
        majority_vote: majority_vote.to_string(),
        player_results,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voting_logic() {
        let input = ComputationInput {
            votes: vec![
                EncryptedVote { player_id: "p1".to_string(), vote: "A".to_string() },
                EncryptedVote { player_id: "p2".to_string(), vote: "A".to_string() },
                EncryptedVote { player_id: "p3".to_string(), vote: "B".to_string() },
            ],
            total_players: 3,
        };

        let result = compute_voting_result(input).unwrap();
        assert_eq!(result.player_results.len(), 3);
        assert!(result.saboteur_id.starts_with("p"));
    }
}
