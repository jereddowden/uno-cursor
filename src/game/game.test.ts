import { BotPlayer, Player } from '../player';

import { Card } from '../card';
import { Game } from './game';

// Helper to stub askQuestion / prompts
class TestGame extends Game {
  public __setPlayers(players: (Player | BotPlayer)[]): void {
    // @ts-expect-error accessing private
    this.players = players as any;
  }
  public __setDiscard(cards: Card[]): void {
    // @ts-expect-error accessing private
    this.discardPile = cards as any;
  }
  public __setVsCpu(v: boolean): void {
    // @ts-expect-error accessing private
    this.vsCpu = v;
  }
}

describe('Game CPU behaviors', () => {
  test('CPU draws are summarized and not revealed', async () => {
    const game = new TestGame() as any as Game;
    const bot = new BotPlayer('CPU');
    const human = new Player('HUMAN');
    (game as any).players = [human, bot];
    (game as any).deck = {
      drawCard: jest
        .fn()
        .mockReturnValueOnce(new Card('red', 'number', 1)) // initial draws stub if needed
        .mockReturnValueOnce(new Card('blue', 'number', 2))
        .mockReturnValueOnce(new Card('green', 'number', 3)),
      addCard: jest.fn(),
      shuffle: jest.fn(),
    };

    const printed: string[] = [];
    (game as any).printWithDelay = async (msg: string) => {
      printed.push(msg);
    };

    // Call drawCard with CPU
    await (game as any).drawCard(bot, 2);
    expect(printed.some((m) => /CPU drew 2 cards\./.test(m))).toBe(true);
  });

  test('CPU Wild Draw 4 challenge is automated; human is prompted', async () => {
    const game = new TestGame() as any as Game;
    const current = new Player('CURRENT');
    const next = new BotPlayer('CPU');
    (game as any).players = [current, next];
    (game as any).discardPile = [
      new Card('red', 'number', 5),
      new Card('black', 'wild4'),
      new Card('blue', 'number', 7),
    ];

    // Current player's hand contains a blue, meaning challenge should succeed
    current.addCard(new Card('blue', 'number', 9));

    (game as any).askQuestion = jest.fn();

    // Force CPU to challenge by mocking Math.random
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    await (game as any).handleWildDraw4Challenge(current, next);
    // Validate that a challenge outcome was recorded
    expect((game as any).challengeResult).not.toBeNull();
    randomSpy.mockRestore();

    // Now set human as next player and ensure prompt is used
    const humanNext = new Player('HUMAN');
    (game as any).players = [current, humanNext];
    (game as any).askQuestion = jest.fn().mockResolvedValue('y');
    await (game as any).handleWildDraw4Challenge(current, humanNext);
    expect((game as any).askQuestion).toHaveBeenCalledWith('Challenge the Wild Draw 4? (y/N): ');
  });
});
