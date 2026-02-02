export interface Player {
  id: string;
  ws: any;
  name: string;
}

export interface Vote {
  playerId: string;
  encryptedVote: string;
}

export interface GameState {
  players: Map<string, Player>;
  votes: Map<string, Vote>;
  phase: 'waiting' | 'voting' | 'computing' | 'results';
  computationId?: string;
}

export interface ArciumResult {
  saboteurId: string;
  communityCorrect: boolean;
  saboteurVote: string;
  majorityVote: string;
  playerResults: Array<{
    playerId: string;
    wasCorrect: boolean;
    isSaboteur: boolean;
  }>;
}