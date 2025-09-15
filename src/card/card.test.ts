import { CardType, Color } from '../types';

import { Card } from '../card';

describe('Card', () => {
  describe('constructor', () => {
    it('should create a number card with correct properties', () => {
      const card = new Card('red', 'number', 5);
      expect(card.color).toBe('red');
      expect(card.type).toBe('number');
      expect(card.number).toBe(5);
    });

    it('should create a special card with correct properties', () => {
      const card = new Card('blue', 'skip');
      expect(card.color).toBe('blue');
      expect(card.type).toBe('skip');
      expect(card.number).toBeUndefined();
    });

    it('should create a wild card with correct properties', () => {
      const card = new Card('black', 'wild');
      expect(card.color).toBe('black');
      expect(card.type).toBe('wild');
      expect(card.number).toBeUndefined();
    });
  });

  describe('toString', () => {
    it('should return correct string for number card', () => {
      const card = new Card('red', 'number', 5);
      expect(card.toString()).toBe('red 5');
    });

    it('should return correct string for special card', () => {
      const card = new Card('blue', 'skip');
      expect(card.toString()).toBe('blue skip');
    });

    it('should return correct string for wild card', () => {
      const card = new Card('black', 'wild');
      expect(card.toString()).toBe('black wild');
    });

    it('should return correct string for wild4 card', () => {
      const card = new Card('black', 'wild4');
      expect(card.toString()).toBe('black wild4');
    });

    it('should handle all colors correctly', () => {
      const colors: Color[] = ['red', 'blue', 'green', 'yellow', 'black'];
      colors.forEach((color) => {
        const card = new Card(color, 'number', 5);
        expect(card.toString()).toBe(`${color} 5`);
      });
    });
  });

  describe('canBePlayedOn', () => {
    it('should allow playing wild card on any card', () => {
      const wildCard = new Card('black', 'wild');
      const anyCard = new Card('red', 'number', 5);
      expect(wildCard.canBePlayedOn(anyCard)).toBe(true);
    });

    it('should allow playing wild4 card on any card', () => {
      const wild4Card = new Card('black', 'wild4');
      const anyCard = new Card('red', 'number', 5);
      expect(wild4Card.canBePlayedOn(anyCard)).toBe(true);
    });

    it('should allow playing card of same color', () => {
      const card1 = new Card('red', 'number', 5);
      const card2 = new Card('red', 'number', 7);
      expect(card1.canBePlayedOn(card2)).toBe(true);
    });

    it('should allow playing card of same number', () => {
      const card1 = new Card('red', 'number', 5);
      const card2 = new Card('blue', 'number', 5);
      expect(card1.canBePlayedOn(card2)).toBe(true);
    });

    it('should allow playing special card of same color', () => {
      const card1 = new Card('red', 'skip');
      const card2 = new Card('red', 'draw2');
      expect(card1.canBePlayedOn(card2)).toBe(true);
    });

    it('should allow playing special card of same type', () => {
      const card1 = new Card('red', 'skip');
      const card2 = new Card('blue', 'skip');
      expect(card1.canBePlayedOn(card2)).toBe(true);
    });

    it('should not allow playing card of different color and number', () => {
      const card1 = new Card('red', 'number', 5);
      const card2 = new Card('blue', 'number', 7);
      expect(card1.canBePlayedOn(card2)).toBe(false);
    });

    it('should not allow playing card of different color and type', () => {
      const card1 = new Card('red', 'skip');
      const card2 = new Card('blue', 'draw2');
      expect(card1.canBePlayedOn(card2)).toBe(false);
    });

    it('should handle all color combinations correctly', () => {
      const colors: Color[] = ['red', 'blue', 'green', 'yellow'];
      colors.forEach((color1) => {
        colors.forEach((color2) => {
          const card1 = new Card(color1, 'number', 5);
          const card2 = new Card(color2, 'number', 7);
          expect(card1.canBePlayedOn(card2)).toBe(color1 === color2);
        });
      });
    });
  });

  describe('isSpecialCard', () => {
    it('should return false for number card', () => {
      const card = new Card('red', 'number', 5);
      expect(card.isSpecialCard()).toBe(false);
    });

    it('should return true for special cards', () => {
      const specialCards: CardType[] = ['skip', 'reverse', 'draw2', 'wild', 'wild4'];
      specialCards.forEach((type) => {
        const card = new Card('red', type);
        expect(card.isSpecialCard()).toBe(true);
      });
    });

    it('should handle all card types correctly', () => {
      const allTypes: CardType[] = ['number', 'skip', 'reverse', 'draw2', 'wild', 'wild4'];
      allTypes.forEach((type) => {
        const card = new Card('red', type);
        expect(card.isSpecialCard()).toBe(type !== 'number');
      });
    });
  });

  describe('getEffect', () => {
    it('should return correct effect for each card type', () => {
      const testCases: Array<[CardType, 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4' | 'none']> =
        [
          ['skip', 'skip'],
          ['reverse', 'reverse'],
          ['draw2', 'draw2'],
          ['wild', 'wild'],
          ['wild4', 'wild4'],
          ['number', 'none'],
        ];

      testCases.forEach(([type, expectedEffect]) => {
        const card = new Card('red', type);
        expect(card.getEffect()).toBe(expectedEffect);
      });
    });

    it('should return none for number cards with any number', () => {
      for (let i = 0; i <= 9; i++) {
        const card = new Card('red', 'number', i);
        expect(card.getEffect()).toBe('none');
      }
    });

    it('should return correct effect regardless of color', () => {
      const colors: Color[] = ['red', 'blue', 'green', 'yellow', 'black'];
      colors.forEach((color) => {
        const card = new Card(color, 'skip');
        expect(card.getEffect()).toBe('skip');
      });
    });
  });
});
