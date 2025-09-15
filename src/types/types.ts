export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'black';
export type Number = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  color: Color;
  type: CardType;
  number?: number; // Only for number cards
}

export interface Deck {
  cards: Card[];
}
