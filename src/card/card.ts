import { Card as CardType, CardType as CardTypeEnum, Color } from '../types';

import { colorizeCard, colorizeCardBold } from '../utils/colors';

export class Card implements CardType {
  constructor(
    public color: Color,
    public type: CardTypeEnum,
    public number?: number
  ) {}

  public toString(options?: { bold?: boolean }): string {
    const isBold = options?.bold === true;
    const text =
      this.type === 'number'
        ? `${this.color.toUpperCase()} ${this.number}`
        : `${this.color.toUpperCase()} ${this.type.toUpperCase()}`;
    return isBold ? colorizeCardBold(this.color, text) : colorizeCard(this.color, text);
  }

  public canBePlayedOn(topCard: Card, isFirstTurn: boolean = false): boolean {
    // Special case for first turn of the game with wild/wild4
    if (isFirstTurn && (topCard.type === 'wild' || topCard.type === 'wild4')) {
      return true;
    }

    // Check color match first (applies to all cards)
    if (this.color === topCard.color) {
      return true;
    }

    // Wild and Wild4 cards can be played on any card
    if (this.type === 'wild' || this.type === 'wild4') {
      return true;
    }

    // For number cards, check number match
    if (this.type === 'number' && topCard.type === 'number') {
      return this.number === topCard.number;
    }

    // For special cards, check type match
    if (this.type !== 'number' && topCard.type !== 'number') {
      return this.type === topCard.type;
    }

    return false;
  }

  public isSpecialCard(): boolean {
    return this.type !== 'number';
  }

  public getEffect(): 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4' | 'none' {
    switch (this.type) {
      case 'skip':
        return 'skip';
      case 'reverse':
        return 'reverse';
      case 'draw2':
        return 'draw2';
      case 'wild':
        return 'wild';
      case 'wild4':
        return 'wild4';
      default:
        return 'none';
    }
  }
}
