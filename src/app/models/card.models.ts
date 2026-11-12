export type CeremonyType = 'Review' | 'Retrospective';

/** WentWell=o que foi bom, WentBad=o que foi ruim, CanImprove=pode melhorar, Praise=parabenização, ImprovementSuggestion=sugestão. */
export type CardType = 'WentWell' | 'WentBad' | 'CanImprove' | 'Praise' | 'ImprovementSuggestion';

/** Espelha CardDto ("meus cards"). */
export interface CardResponse {
  id: string;
  sprintId: string;
  ceremony: CeremonyType;
  type: CardType;
  content: string;
  createdAt: string;
}

/** Espelha BoardCardDto: anônimo, sem autor e sem data. */
export interface BoardCard {
  id: string;
  ceremony: CeremonyType;
  type: CardType;
  content: string;
}

/** Espelha BoardDto. */
export interface BoardResponse {
  sprintId: string;
  sprintNumber: number;
  sprintStatus: 'Open' | 'Closed';
  ceremony: CeremonyType | null;
  totalCards: number;
  cards: BoardCard[];
}

/** Espelha CreateCardRequest. */
export interface CreateCardRequest {
  ceremony: CeremonyType;
  type: CardType;
  content: string;
}
