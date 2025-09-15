import { Card } from '../card';

export class Player {
  private hand: Card[] = [];

  constructor(public name: string) {}

  public addCard(card: Card): void {
    this.hand.push(card);
  }

  public removeCard(index: number): Card | undefined {
    if (index >= 0 && index < this.hand.length) {
      return this.hand.splice(index, 1)[0];
    }
    return undefined;
  }

  public getHand(): Card[] {
    return [...this.hand];
  }

  public getHandSize(): number {
    return this.hand.length;
  }

  public displayHand(topCard?: Card, isFirstTurn: boolean = false): string[] {
    return this.hand.map((card, index) => {
      const playable = topCard ? card.canBePlayedOn(topCard, isFirstTurn) : false;
      const label = `${index + 1}: `;
      const cardText = card.toString({ bold: playable });
      return label + cardText;
    });
  }

  public hasPlayableCard(topCard: Card, isFirstTurn: boolean = false): boolean {
    return this.hand.some((card) => card.canBePlayedOn(topCard, isFirstTurn));
  }
}
