import { BotPlayer } from './botPlayer';
import { Card } from '../card';

describe('BotPlayer', () => {
  test('prefers exact number match over color match', () => {
    const bot = new BotPlayer('CPU');
    const top = new Card('red', 'number', 5);
    bot.addCard(new Card('blue', 'number', 5));
    bot.addCard(new Card('red', 'number', 7));
    bot.addCard(new Card('green', 'number', 9));

    const idx = bot.chooseCardToPlay(top, false);
    expect(idx).not.toBeNull();
    const chosen = idx !== null ? bot.getHand()[idx] : null;
    expect(chosen?.type).toBe('number');
    expect(chosen?.number).toBe(5);
  });

  test('falls back to color match when no number match', () => {
    const bot = new BotPlayer('CPU');
    const top = new Card('yellow', 'number', 1);
    const yellowNine = new Card('yellow', 'number', 9); // color match only
    bot.addCard(yellowNine);
    bot.addCard(new Card('green', 'number', 2)); // not playable

    const idx = bot.chooseCardToPlay(top, false);
    expect(idx).not.toBeNull();
    const chosen = idx !== null ? bot.getHand()[idx] : null;
    expect(chosen).toBe(yellowNine);
  });

  test('uses any playable including specials when no number/color match', () => {
    const bot = new BotPlayer('CPU');
    const top = new Card('red', 'number', 3);
    bot.addCard(new Card('green', 'number', 9));
    const wild = new Card('blue', 'wild');
    bot.addCard(wild);

    const idx = bot.chooseCardToPlay(top, false);
    expect(idx).not.toBeNull();
    const chosen = idx !== null ? bot.getHand()[idx] : null;
    expect(chosen).toBe(wild);
  });

  test('returns null when no playable', () => {
    const bot = new BotPlayer('CPU');
    const top = new Card('red', 'number', 3);
    bot.addCard(new Card('green', 'number', 9));
    bot.addCard(new Card('blue', 'number', 1));

    const idx = bot.chooseCardToPlay(top, false);
    expect(idx).toBeNull();
  });
});
