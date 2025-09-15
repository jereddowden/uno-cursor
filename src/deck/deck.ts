import { CardType, Color } from '../types';

import { Card } from '../card';

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.initializeDeck();
  }

  private initializeDeck(): void {
    const colors: Color[] = ['red', 'blue', 'green', 'yellow'];
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const specialTypes: CardType[] = ['skip', 'reverse', 'draw2'];

    // Create number cards
    colors.forEach((color) => {
      numbers.forEach((number) => {
        // Add two cards for each number (except 0)
        if (number === 0) {
          this.cards.push(new Card(color, 'number', number));
        } else {
          this.cards.push(new Card(color, 'number', number));
          this.cards.push(new Card(color, 'number', number));
        }
      });

      // Add special cards (2 of each type per color)
      specialTypes.forEach((type) => {
        this.cards.push(new Card(color, type));
        this.cards.push(new Card(color, type));
      });
    });

    // Add wild cards (4 of each type)
    for (let i = 0; i < 4; i++) {
      this.cards.push(new Card('black', 'wild'));
      this.cards.push(new Card('black', 'wild4'));
    }
  }

  public shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  public drawCard(): Card | undefined {
    return this.cards.pop();
  }

  public addCard(card: Card): void {
    this.cards.push(card);
  }

  public getRemainingCards(): number {
    return this.cards.length;
  }
}
