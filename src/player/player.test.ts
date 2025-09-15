import { CardType, Color } from '../types';

import { Card } from '../card';
import { Player } from '../player';

const stripAnsi = (s: string): string => s.replace(/\x1B\[[0-9;]*m/g, '');

describe('Player', () => {
  let player: Player;
  let card1: Card;
  let card2: Card;
  let card3: Card;

  beforeEach(() => {
    player = new Player('Test Player');
    card1 = new Card('red', 'number', 5);
    card2 = new Card('blue', 'skip');
    card3 = new Card('black', 'wild');
  });

  describe('constructor', () => {
    it('should create a player with the given name', () => {
      const player = new Player('John');
      expect(player.name).toBe('John');
    });

    it('should initialize with an empty hand', () => {
      expect(player.getHandSize()).toBe(0);
      expect(player.getHand()).toEqual([]);
    });
  });

  describe('addCard', () => {
    it("should add a card to the player's hand", () => {
      player.addCard(card1);
      expect(player.getHandSize()).toBe(1);
      expect(player.getHand()).toContainEqual(card1);
    });

    it('should add multiple cards in order', () => {
      player.addCard(card1);
      player.addCard(card2);
      player.addCard(card3);
      expect(player.getHandSize()).toBe(3);
      expect(player.getHand()).toEqual([card1, card2, card3]);
    });

    it('should handle adding cards of all types', () => {
      const cards: Card[] = [
        new Card('red', 'number', 5),
        new Card('blue', 'skip'),
        new Card('green', 'reverse'),
        new Card('yellow', 'draw2'),
        new Card('black', 'wild'),
        new Card('black', 'wild4'),
      ];

      cards.forEach((card) => player.addCard(card));
      expect(player.getHandSize()).toBe(cards.length);
      expect(player.getHand()).toEqual(cards);
    });
  });

  describe('removeCard', () => {
    it('should remove and return the card at the specified index', () => {
      player.addCard(card1);
      player.addCard(card2);
      const removedCard = player.removeCard(0);
      expect(removedCard).toEqual(card1);
      expect(player.getHandSize()).toBe(1);
      expect(player.getHand()).not.toContainEqual(card1);
    });

    it('should return undefined for invalid index', () => {
      expect(player.removeCard(0)).toBeUndefined();
      expect(player.removeCard(-1)).toBeUndefined();
      expect(player.removeCard(999)).toBeUndefined();
    });

    it('should maintain hand order after removing a card', () => {
      player.addCard(card1);
      player.addCard(card2);
      player.addCard(card3);
      player.removeCard(1);
      expect(player.getHand()).toEqual([card1, card3]);
    });

    it('should handle removing cards from different positions', () => {
      player.addCard(card1);
      player.addCard(card2);
      player.addCard(card3);

      // Remove from middle
      expect(player.removeCard(1)).toEqual(card2);
      expect(player.getHand()).toEqual([card1, card3]);

      // Remove from end
      expect(player.removeCard(1)).toEqual(card3);
      expect(player.getHand()).toEqual([card1]);

      // Remove from start
      expect(player.removeCard(0)).toEqual(card1);
      expect(player.getHand()).toEqual([]);
    });
  });

  describe('getHand', () => {
    it("should return a copy of the player's hand", () => {
      player.addCard(card1);
      const hand = player.getHand();
      expect(hand).toEqual([card1]);
      hand.push(card2); // Modify the returned array
      expect(player.getHand()).toEqual([card1]); // Original hand should be unchanged
    });

    it('should return an empty array for new player', () => {
      expect(player.getHand()).toEqual([]);
    });

    it('should return all cards in the correct order', () => {
      const cards = [card1, card2, card3];
      cards.forEach((card) => player.addCard(card));
      expect(player.getHand()).toEqual(cards);
    });
  });

  describe('getHandSize', () => {
    it('should return the correct number of cards', () => {
      expect(player.getHandSize()).toBe(0);
      player.addCard(card1);
      expect(player.getHandSize()).toBe(1);
      player.addCard(card2);
      expect(player.getHandSize()).toBe(2);
    });

    it('should return 0 for new player', () => {
      expect(player.getHandSize()).toBe(0);
    });

    it('should update correctly after adding and removing cards', () => {
      expect(player.getHandSize()).toBe(0);
      player.addCard(card1);
      expect(player.getHandSize()).toBe(1);
      player.addCard(card2);
      expect(player.getHandSize()).toBe(2);
      player.removeCard(0);
      expect(player.getHandSize()).toBe(1);
      player.removeCard(0);
      expect(player.getHandSize()).toBe(0);
    });
  });

  describe('displayHand', () => {
    it('should return a string array representation of the hand', () => {
      player.addCard(card1);
      player.addCard(card2);
      const arr = player.displayHand();
      expect(arr.length).toBe(2);
      expect(stripAnsi(arr[0])).toBe('1: RED 5');
      expect(stripAnsi(arr[1])).toBe('2: BLUE SKIP');
    });

    it('should return an empty array for empty hand', () => {
      expect(player.displayHand()).toEqual([]);
    });

    it('should handle all card types correctly', () => {
      const cards = [
        new Card('red', 'number', 5),
        new Card('blue', 'skip'),
        new Card('green', 'reverse'),
        new Card('yellow', 'draw2'),
        new Card('black', 'wild'),
        new Card('black', 'wild4'),
      ];
      cards.forEach((card) => player.addCard(card));

      const arr = player.displayHand();
      expect(arr.length).toBe(cards.length);
      for (let i = 0; i < cards.length; i++) {
        expect(stripAnsi(arr[i])).toBe(
          `${i + 1}: ${cards[i].color.toUpperCase()} ${
            cards[i].type === 'number' ? cards[i].number : cards[i].type.toUpperCase()
          }`
        );
      }
    });
  });

  describe('hasPlayableCard', () => {
    it('should return true when player has a playable card', () => {
      const topCard = new Card('red', 'number', 7);
      player.addCard(card1); // red 5
      expect(player.hasPlayableCard(topCard)).toBe(true);
    });

    it('should return true when player has a wild card', () => {
      const topCard = new Card('red', 'number', 7);
      const wildCard = new Card('black', 'wild');
      player.addCard(wildCard);
      expect(player.hasPlayableCard(topCard)).toBe(true);
    });

    it('should return false when player has no playable cards', () => {
      const topCard = new Card('red', 'number', 7);
      player.addCard(new Card('blue', 'number', 5));
      expect(player.hasPlayableCard(topCard)).toBe(false);
    });

    it('should handle all card type combinations', () => {
      const topCard = new Card('red', 'number', 7);
      const testCases: Array<[Card, boolean]> = [
        [new Card('red', 'number', 5), true], // Same color
        [new Card('blue', 'number', 7), true], // Same number
        [new Card('blue', 'number', 5), false], // Different color and number
        [new Card('red', 'skip'), true], // Same color, different type
        [new Card('blue', 'skip'), false], // Different color and type
        [new Card('black', 'wild'), true], // Wild card
        [new Card('black', 'wild4'), true], // Wild4 card
      ];

      testCases.forEach(([card, expected]) => {
        player = new Player('Test Player');
        player.addCard(card);
        expect(player.hasPlayableCard(topCard)).toBe(expected);
      });
    });

    it('should handle special cards correctly', () => {
      const testCases: Array<[Card, Card, boolean]> = [
        // Color matches
        [new Card('red', 'skip'), new Card('red', 'number', 5), true], // Same color
        [new Card('red', 'draw2'), new Card('red', 'skip'), true], // Same color
        [new Card('red', 'reverse'), new Card('red', 'number', 5), true], // Same color

        // Type matches (only for special cards)
        [new Card('red', 'skip'), new Card('blue', 'skip'), true], // Same type
        [new Card('red', 'draw2'), new Card('blue', 'draw2'), true], // Same type
        [new Card('red', 'reverse'), new Card('blue', 'reverse'), true], // Same type

        // Wild cards
        [new Card('red', 'number', 5), new Card('black', 'wild'), true], // Wild card
        [new Card('red', 'number', 5), new Card('black', 'wild4'), true], // Wild4 card

        // No matches
        [new Card('red', 'skip'), new Card('blue', 'number', 5), false], // Different color and type
        [new Card('red', 'draw2'), new Card('blue', 'skip'), false], // Different color and type
        [new Card('red', 'reverse'), new Card('blue', 'number', 5), false], // Different color and type
      ];

      testCases.forEach(([topCard, handCard, expected]) => {
        player = new Player('Test Player');
        player.addCard(handCard);
        expect(player.hasPlayableCard(topCard)).toBe(expected);
      });
    });
  });
});
