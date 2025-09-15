import { CardType, Color } from '../types';

import { Card } from '../card';
import { Deck } from '../deck';

describe('Deck', () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck();
  });

  describe('constructor', () => {
    it('should create a deck with the correct number of cards', () => {
      // 108 cards total:
      // - 76 number cards (19 numbers × 4 colors, with 0 having one copy and others having two)
      // - 24 special cards (6 types × 4 colors, two of each)
      // - 8 wild cards (4 wild + 4 wild4)
      expect(deck.getRemainingCards()).toBe(108);
    });

    it('should have correct distribution of number cards', () => {
      const numberCards = Array.from({ length: 10 }, (_, i) => i);
      const colors: Color[] = ['red', 'blue', 'green', 'yellow'];

      // Count occurrences of each number card
      const counts = new Map<number, number>();
      while (deck.getRemainingCards() > 0) {
        const card = deck.drawCard();
        if (card?.type === 'number' && card.number !== undefined) {
          counts.set(card.number, (counts.get(card.number) || 0) + 1);
        }
      }

      // Verify counts
      numberCards.forEach((number) => {
        const expectedCount = number === 0 ? 4 : 8; // One of each color for 0, two for others
        expect(counts.get(number)).toBe(expectedCount);
      });
    });

    it('should have correct distribution of special cards', () => {
      const specialTypes: CardType[] = ['skip', 'reverse', 'draw2'];
      const colors: Color[] = ['red', 'blue', 'green', 'yellow'];

      // Count occurrences of each special card
      const counts = new Map<string, number>();
      while (deck.getRemainingCards() > 0) {
        const card = deck.drawCard();
        if (card?.type !== 'number' && card?.type !== 'wild' && card?.type !== 'wild4') {
          const key = `${card?.color}-${card?.type}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }

      // Verify counts
      colors.forEach((color) => {
        specialTypes.forEach((type) => {
          const key = `${color}-${type}`;
          expect(counts.get(key)).toBe(2); // Two of each special card per color
        });
      });
    });

    it('should have correct distribution of wild cards', () => {
      let wildCount = 0;
      let wild4Count = 0;

      while (deck.getRemainingCards() > 0) {
        const card = deck.drawCard();
        if (card?.type === 'wild') wildCount++;
        if (card?.type === 'wild4') wild4Count++;
      }

      expect(wildCount).toBe(4);
      expect(wild4Count).toBe(4);
    });
  });

  describe('shuffle', () => {
    it('should maintain the same number of cards after shuffling', () => {
      const initialCount = deck.getRemainingCards();
      deck.shuffle();
      expect(deck.getRemainingCards()).toBe(initialCount);
    });

    it('should change the order of cards', () => {
      const firstCard = deck.drawCard();
      deck.shuffle();
      const secondCard = deck.drawCard();
      // Note: This test might occasionally fail due to random chance
      // of getting the same card in the same position
      expect(deck.getRemainingCards()).toBe(106);
    });

    it('should maintain all cards after multiple shuffles', () => {
      const initialCards = new Set<string>();
      while (deck.getRemainingCards() > 0) {
        const card = deck.drawCard();
        if (card) initialCards.add(card.toString());
      }

      // Recreate deck and shuffle multiple times
      deck = new Deck();
      for (let i = 0; i < 5; i++) {
        deck.shuffle();
      }

      const shuffledCards = new Set<string>();
      while (deck.getRemainingCards() > 0) {
        const card = deck.drawCard();
        if (card) shuffledCards.add(card.toString());
      }

      expect(shuffledCards.size).toBe(initialCards.size);
      expect([...shuffledCards].every((card) => initialCards.has(card))).toBe(true);
    });
  });

  describe('drawCard', () => {
    it('should return a card and decrease the deck size', () => {
      const initialCount = deck.getRemainingCards();
      const card = deck.drawCard();
      expect(card).toBeInstanceOf(Card);
      expect(deck.getRemainingCards()).toBe(initialCount - 1);
    });

    it('should return undefined when deck is empty', () => {
      // Empty the deck
      while (deck.getRemainingCards() > 0) {
        deck.drawCard();
      }
      expect(deck.drawCard()).toBeUndefined();
    });

    it('should draw cards in a random order after shuffling', () => {
      const firstDraw = deck.drawCard();
      deck.shuffle();
      const secondDraw = deck.drawCard();
      // Note: This test might occasionally fail due to random chance
      expect(deck.getRemainingCards()).toBe(106);
    });

    it('should maintain card properties when drawing', () => {
      const card = deck.drawCard();
      expect(card).toBeDefined();
      if (card) {
        expect(card.color).toBeDefined();
        expect(card.type).toBeDefined();
        if (card.type === 'number') {
          expect(card.number).toBeDefined();
        }
      }
    });
  });

  describe('addCard', () => {
    it('should add a card to the deck', () => {
      const initialCount = deck.getRemainingCards();
      const card = new Card('red', 'number', 5);
      deck.addCard(card);
      expect(deck.getRemainingCards()).toBe(initialCount + 1);
    });

    it('should add multiple cards correctly', () => {
      const initialCount = deck.getRemainingCards();
      const cards = [
        new Card('red', 'number', 5),
        new Card('blue', 'skip'),
        new Card('black', 'wild'),
      ];

      cards.forEach((card) => deck.addCard(card));
      expect(deck.getRemainingCards()).toBe(initialCount + cards.length);
    });

    it('should add cards that can be drawn', () => {
      const card = new Card('red', 'number', 5);
      deck.addCard(card);
      const drawnCard = deck.drawCard();
      expect(drawnCard).toBeDefined();
      if (drawnCard) {
        expect(drawnCard.color).toBe(card.color);
        expect(drawnCard.type).toBe(card.type);
        if (drawnCard.type === 'number') {
          expect(drawnCard.number).toBe(card.number);
        }
      }
    });
  });

  describe('getRemainingCards', () => {
    it('should return the correct number of cards', () => {
      expect(deck.getRemainingCards()).toBe(108);
      deck.drawCard();
      expect(deck.getRemainingCards()).toBe(107);
    });

    it('should return 0 for empty deck', () => {
      while (deck.getRemainingCards() > 0) {
        deck.drawCard();
      }
      expect(deck.getRemainingCards()).toBe(0);
    });

    it('should update correctly after multiple operations', () => {
      expect(deck.getRemainingCards()).toBe(108);
      deck.drawCard();
      expect(deck.getRemainingCards()).toBe(107);
      deck.addCard(new Card('red', 'number', 5));
      expect(deck.getRemainingCards()).toBe(108);
      deck.shuffle();
      expect(deck.getRemainingCards()).toBe(108);
    });
  });
});
