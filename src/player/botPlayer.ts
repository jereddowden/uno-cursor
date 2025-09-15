import { Card } from '../card';
import { Player } from './player';

export class BotPlayer extends Player {
  constructor(name: string = 'CPU') {
    super(name);
  }

  public chooseCardToPlay(topCard: Card, isFirstTurn: boolean = false): number | null {
    const hand = this.getHand();
    // Prefer number match, then color match, then specials
    let bestIndex: number | null = null;

    // Exact number match
    for (let i = 0; i < hand.length; i++) {
      if (
        hand[i].canBePlayedOn(topCard, isFirstTurn) &&
        hand[i].type === 'number' &&
        topCard.type === 'number' &&
        hand[i].number === topCard.number
      ) {
        return i;
      }
    }

    // Color match
    for (let i = 0; i < hand.length; i++) {
      if (hand[i].canBePlayedOn(topCard, isFirstTurn) && hand[i].color === topCard.color) {
        return i;
      }
    }

    // Any playable (including specials)
    for (let i = 0; i < hand.length; i++) {
      if (hand[i].canBePlayedOn(topCard, isFirstTurn)) {
        bestIndex = i;
        break;
      }
    }

    return bestIndex;
  }
}
