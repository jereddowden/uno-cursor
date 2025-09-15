import * as readline from 'readline';

import { BotPlayer, Player } from '../player';
import { box, colorize } from '../utils/colors';

import { Card } from '../card';
import { Color } from '../types';
import { Deck } from '../deck';

class ControlFlowError extends Error {
  constructor(public code: 'RESTART') {
    super(code);
    Object.setPrototypeOf(this, ControlFlowError.prototype);
  }
}

export class Game {
  private deck: Deck;
  private players: Player[];
  private currentPlayerIndex: number;
  private discardPile: Card[];
  private rl: readline.Interface;
  private lastUnoCall: number | null = null;
  private isFirstTurn: boolean = true;
  private challengeResult: {
    type: 'successful' | 'failed';
    player: Player;
    cardsDrawn: number;
  } | null = null;
  private specialCardMessage: string | null = null;
  private draw2Result: { player: Player; cardsDrawn: number } | null = null;
  private drawnCards: { player: Player; cards: Card[] }[] = []; // Accumulates drawn cards to display at player's next human turn
  private vsCpu: boolean = false;
  private isRestarting: boolean = false;

  constructor() {
    this.deck = new Deck();
    this.players = [];
    this.currentPlayerIndex = 0;
    this.discardPile = [];
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.isFirstTurn = true;
  }

  private resetState(): void {
    this.deck = new Deck();
    this.players = [];
    this.currentPlayerIndex = 0;
    this.discardPile = [];
    this.lastUnoCall = null;
    this.isFirstTurn = true;
    this.challengeResult = null;
    this.specialCardMessage = null;
    this.draw2Result = null;
    this.drawnCards = [];
    this.vsCpu = false;
  }

  private async confirmReset(): Promise<boolean> {
    while (true) {
      const ans = (await this.askRaw('Reset and start over? (y/n): ')).trim().toLowerCase();
      if (ans === 'y') return true;
      if (ans === 'n') return false;
    }
  }

  private async askRaw(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => resolve(answer));
    });
  }

  private formatPrompt(question: string): string {
    return question.includes('type x to reset') ? question : `${question} (type x to reset)`;
  }

  private async askQuestion(question: string): Promise<string> {
    const answer = await this.askRaw(question);
    if (answer.trim().toLowerCase() === 'x') {
      const shouldReset = await this.confirmReset();
      if (shouldReset) {
        this.isRestarting = true;
        throw new ControlFlowError('RESTART');
      }
      // Continue normal flow: re-ask the original question
      return this.askQuestion(question);
    }
    return answer;
  }

  private async askCatchUnoPrompt(timeoutMs: number): Promise<boolean> {
    process.stdout.write(
      `Type "uno" within ${Math.round(timeoutMs / 1000)} seconds to catch CPU! `
    );
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          process.stdout.write('\n');
          resolve(false);
        }
      }, timeoutMs);

      const lineHandler = async (input: string): Promise<void> => {
        if (resolved) return;
        const trimmed = input.trim().toLowerCase();
        if (trimmed === 'x') {
          const doReset = await this.confirmReset();
          if (doReset) {
            resolved = true;
            clearTimeout(timer);
            this.rl.removeListener('line', lineHandler as any);
            this.isRestarting = true;
            throw new ControlFlowError('RESTART');
          } else {
            return;
          }
        }
        resolved = true;
        clearTimeout(timer);
        this.rl.removeListener('line', lineHandler as any);
        resolve(trimmed === 'uno');
      };

      this.rl.once('line', lineHandler as any);
    });
  }

  private initializeGame(): void {
    console.log('Initializing game...');
    this.deck.shuffle();

    for (let i = 0; i < 7; i++) {
      for (const player of this.players) {
        const card = this.deck.drawCard();
        if (card) {
          player.addCard(card);
        }
      }
    }

    const firstCard = this.deck.drawCard();
    if (firstCard) {
      this.discardPile.push(firstCard);
      console.log(`First card on discard pile: ${firstCard.toString()}`);
    } else {
      throw new Error('Failed to draw first card');
    }
  }

  private getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  private nextTurn(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  private reshuffleDeck(): void {
    if (this.discardPile.length <= 1) {
      console.log('Not enough cards to reshuffle!');
      return;
    }

    const topCard = this.discardPile.pop();
    if (!topCard) return;

    while (this.discardPile.length > 0) {
      const card = this.discardPile.pop();
      if (card) {
        this.deck.addCard(card);
      }
    }

    this.deck.shuffle();

    this.discardPile.push(topCard);
    console.log('Deck has been reshuffled!');
  }

  private async handleWildDraw4Challenge(
    currentPlayer: Player,
    nextPlayer: Player
  ): Promise<boolean> {
    // If CPU is the one facing the Draw 4, automate decision
    if (nextPlayer instanceof BotPlayer) {
      const willChallenge = Math.random() < 0.5;
      if (!willChallenge) {
        await this.printWithDelay(`${nextPlayer.name} accepts the Draw 4.`);
        return false;
      }
      await this.printWithDelay(`${nextPlayer.name} challenges the Draw 4!`);
    } else {
      // Human decides whether to challenge
      const answer = await this.askQuestion('Challenge the Wild Draw 4? (y/N): ');
      const doChallenge = answer.trim().toLowerCase() === 'y';
      if (!doChallenge) {
        await this.printWithDelay(`${nextPlayer.name} accepts the Draw 4.`);
        return false;
      }
      await this.printWithDelay(`${nextPlayer.name} challenges the Draw 4!`);
    }

    // Check if the current player had a card of the same color as the previous top card
    const previousTopCard = this.discardPile[this.discardPile.length - 3];
    const hasMatchingColor = currentPlayer.getHand().some((card) => {
      if (card.color === 'black') return false;
      return card.color === previousTopCard.color;
    });

    if (hasMatchingColor) {
      this.challengeResult = {
        type: 'successful',
        player: currentPlayer,
        cardsDrawn: 4,
      };
      await this.drawCard(currentPlayer, 4, currentPlayer === this.getCurrentPlayer());
      return true;
    } else {
      this.challengeResult = {
        type: 'failed',
        player: nextPlayer,
        cardsDrawn: 6,
      };
      await this.drawCard(nextPlayer, 6, nextPlayer === this.getCurrentPlayer());
      return true;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async printWithDelay(message: string, delayMs: number = 500): Promise<void> {
    process.stdout.write(message + '\n');
    await this.delay(delayMs);
  }

  private chooseBestColor(player: Player): Color {
    const colors: Color[] = ['red', 'blue', 'green', 'yellow'];
    const counts: Record<Color, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 } as any;
    for (const c of player.getHand()) {
      if (c.color !== 'black') {
        counts[c.color as Color] = (counts[c.color as Color] || 0) + 1;
      }
    }
    let best: Color = 'red';
    let bestCount = -1;
    for (const c of colors) {
      if (counts[c] > bestCount) {
        best = c;
        bestCount = counts[c];
      }
    }
    return best;
  }

  private async handleSpecialCardEffect(card: Card): Promise<void> {
    const effect = card.getEffect();
    const currentPlayer = this.getCurrentPlayer();
    const nextPlayer = this.players[(this.currentPlayerIndex + 1) % this.players.length];

    switch (effect) {
      case 'skip':
        this.specialCardMessage = colorize('Next player is skipped!', 'yellow');
        this.nextTurn();
        break;

      case 'reverse':
        this.specialCardMessage = colorize('Direction is reversed!', 'yellow');
        this.nextTurn();
        break;

      case 'draw2':
        await this.printWithDelay(colorize('Next player draws 2 cards!', 'yellow'));
        this.nextTurn();
        this.draw2Result = {
          player: nextPlayer,
          cardsDrawn: 2,
        };
        await this.drawCard(nextPlayer, 2);
        break;

      case 'wild': {
        const isBot = currentPlayer instanceof BotPlayer;
        if (isBot) {
          const chosenColor = this.chooseBestColor(currentPlayer);
          await this.printWithDelay(
            `CPU changed color to ${colorize(chosenColor.toUpperCase(), chosenColor)}`
          );
          this.discardPile.push(new Card(chosenColor, 'wild'));
          break;
        }
        const colors: Color[] = ['red', 'blue', 'green', 'yellow'];
        let validColorSelected = false;
        while (!validColorSelected) {
          await this.printWithDelay('\nChoose a color:');
          colors.forEach((color, index) => {
            console.log(`${index + 1}: ${colorize(color.toUpperCase(), color)}`);
          });
          const colorChoice = await this.askQuestion('Enter color number (1-4): ');
          const colorIndex = parseInt(colorChoice) - 1;
          if (!isNaN(colorIndex) && colorIndex >= 0 && colorIndex < colors.length) {
            validColorSelected = true;
            const chosenColor = colors[colorIndex];
            await this.printWithDelay(
              `Color changed to ${colorize(chosenColor.toUpperCase(), chosenColor)}`
            );
            this.discardPile.push(new Card(chosenColor, 'wild'));
            break;
          } else {
            await this.printWithDelay(colorize('Invalid color choice!', 'red'));
          }
        }
        break;
      }

      case 'wild4': {
        const isBot = currentPlayer instanceof BotPlayer;
        if (isBot) {
          const chosenColor = this.chooseBestColor(currentPlayer);
          await this.printWithDelay(
            `CPU changed color to ${colorize(chosenColor.toUpperCase(), chosenColor)}`
          );
          this.discardPile.push(new Card(chosenColor, 'wild4'));
          // Automated challenge decision
          await this.handleWildDraw4Challenge(currentPlayer, nextPlayer);
          break;
        }
        const colors: Color[] = ['red', 'blue', 'green', 'yellow'];
        let validColorSelected = false;
        while (!validColorSelected) {
          await this.printWithDelay('\nChoose a color:');
          colors.forEach((color, index) => {
            console.log(`${index + 1}: ${colorize(color.toUpperCase(), color)}`);
          });
          const colorChoice = await this.askQuestion('Enter color number (1-4): ');
          const colorIndex = parseInt(colorChoice) - 1;
          if (!isNaN(colorIndex) && colorIndex >= 0 && colorIndex < colors.length) {
            validColorSelected = true;
            const chosenColor = colors[colorIndex];
            await this.printWithDelay(
              `Color changed to ${colorize(chosenColor.toUpperCase(), chosenColor)}`
            );
            this.discardPile.push(new Card(chosenColor, 'wild4'));
            // Automated challenge decision
            await this.handleWildDraw4Challenge(currentPlayer, nextPlayer);
            break;
          } else {
            await this.printWithDelay(colorize('Invalid color choice!', 'red'));
          }
        }
        break;
      }
    }
  }

  private async drawCard(
    player: Player,
    numCards = 1,
    isCurrentPlayer = false
  ): Promise<Card[] | null> {
    const cards: Card[] = [];
    for (let i = 0; i < numCards; i++) {
      let card = this.deck.drawCard();
      if (!card) {
        this.reshuffleDeck();
        card = this.deck.drawCard();
      }
      if (card) {
        cards.push(card);
        player.addCard(card);
      }
    }
    if (cards.length > 0) {
      if (player instanceof BotPlayer) {
        // Summarize CPU draws without revealing specific cards
        const plural = cards.length === 1 ? 'card' : 'cards';
        await this.printWithDelay(`CPU drew ${cards.length} ${plural}.`, 300);
        return cards;
      }
      if (!isCurrentPlayer) {
        // Accumulate drawn cards for this human player across multiple effects/turns
        const existing = this.drawnCards.find((dc) => dc.player === player);
        if (existing) {
          existing.cards.push(...cards);
        } else {
          this.drawnCards.push({ player, cards: [...cards] });
        }
      } else {
        // For current player, display the cards immediately
        for (const card of cards) {
          await this.printWithDelay(`You drew: ${card.toString()}`);
        }
      }
      return cards;
    }
    return null;
  }

  private async handleUnoPenalty(player: Player): Promise<void> {
    await this.printWithDelay('You forgot to say UNO! Drawing 2 cards as penalty.');
    const cards = await this.drawCard(player, 2, true);
    if (!cards || cards.length < 2) {
      await this.printWithDelay('No cards left in deck!');
    }
  }

  private async handleDrawnCardPlay(
    currentPlayer: Player,
    topCard: Card,
    drawnCard: Card
  ): Promise<boolean> {
    if (drawnCard.canBePlayedOn(topCard)) {
      console.log('Drawn card is playable!');
      const answer = await this.askQuestion('Would you like to play this card? (y/n): ');

      if (answer.toLowerCase() === 'y') {
        const playedCard = currentPlayer.removeCard(currentPlayer.getHandSize() - 1);
        if (playedCard) {
          this.discardPile.push(playedCard);
          console.log(`\nPlayed: ${playedCard.toString()}`);

          if (playedCard.isSpecialCard()) {
            await this.handleSpecialCardEffect(playedCard);
          }

          if (currentPlayer.getHandSize() === 1) {
            const saidUno = await this.askUnoPrompt(5000);
            if (!saidUno) {
              await this.handleUnoPenalty(currentPlayer);
            }
          }
          return true;
        }
      }
    }
    return false;
  }

  private async askUnoPrompt(timeoutMs: number): Promise<boolean> {
    process.stdout.write('Type "uno" within 5 seconds! ');
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          process.stdout.write('\n');
          resolve(false);
        }
      }, timeoutMs);

      const lineHandler = async (input: string): Promise<void> => {
        if (resolved) return;
        const trimmed = input.trim().toLowerCase();
        if (trimmed === 'x') {
          const doReset = await this.confirmReset();
          if (doReset) {
            resolved = true;
            clearTimeout(timer);
            this.rl.removeListener('line', lineHandler as any);
            this.isRestarting = true;
            throw new ControlFlowError('RESTART');
          } else {
            return;
          }
        }
        resolved = true;
        clearTimeout(timer);
        this.rl.removeListener('line', lineHandler as any);
        resolve(trimmed === 'uno');
      };

      this.rl.once('line', lineHandler as any);
    });
  }

  private async handleBotTurn(bot: BotPlayer, topCard: Card): Promise<boolean> {
    // Clear screen before CPU plays
    process.stdout.write('\x1B[2J\x1B[0;0H');
    console.log(box(`${bot.name}'s turn`));
    console.log(`Top card: ${topCard.toString()}`);

    const index = bot.chooseCardToPlay(topCard, this.isFirstTurn);
    if (index !== null) {
      const playedCard = bot.removeCard(index);
      if (playedCard) {
        this.discardPile.push(playedCard);
        await this.delay(400);
        await this.printWithDelay(`${bot.name} played: ${playedCard.toString()}`, 600);
        await this.delay(500);
        if (playedCard.isSpecialCard()) {
          await this.handleSpecialCardEffect(playedCard);
        }
        // CPU UNO catch window if CPU has one card left
        if (bot.getHandSize() === 1) {
          const timeoutMs = (Math.floor(Math.random() * 5) + 1) * 1000; // 1-5 seconds
          const caught = await this.askCatchUnoPrompt(timeoutMs);
          if (caught) {
            await this.printWithDelay('You caught CPU not saying UNO! CPU draws 2 cards.', 500);
            await this.drawCard(bot, 2); // hidden draw for CPU
            await this.delay(1000); // pause so player can read before screen clears
          } else {
            await this.printWithDelay('Too slow. CPU continues.', 500);
            await this.delay(1000); // pause so player can read before screen clears
          }
        }
        return true;
      }
    }

    // No playable cards, draw one (do not reveal drawn card specifics)
    await this.printWithDelay(`${bot.name} has no playable cards. Drawing a card...`, 400);
    const drawn = await this.drawCard(bot, 1);
    if (drawn && drawn.length > 0) {
      const drawnCard = drawn[0];
      if (drawnCard.canBePlayedOn(topCard, this.isFirstTurn)) {
        const played = bot.removeCard(bot.getHandSize() - 1);
        if (played) {
          this.discardPile.push(played);
          await this.printWithDelay(`${bot.name} played: ${played.toString()}`, 600);
          await this.delay(500);
          if (played.isSpecialCard()) {
            await this.handleSpecialCardEffect(played);
          }
          // CPU UNO catch window if CPU has one card left
          if (bot.getHandSize() === 1) {
            const timeoutMs = (Math.floor(Math.random() * 5) + 1) * 1000;
            const caught = await this.askCatchUnoPrompt(timeoutMs);
            if (caught) {
              await this.printWithDelay('You caught CPU not saying UNO! CPU draws 2 cards.', 500);
              await this.drawCard(bot, 2);
              await this.delay(1000);
            } else {
              await this.printWithDelay('Too slow. CPU continues.', 500);
              await this.delay(1000);
            }
          }
          return true;
        }
      }
    }

    await this.printWithDelay(`${bot.name} ends turn.`, 300);
    return true;
  }

  private async handlePlayerTurn(): Promise<boolean> {
    const currentPlayer = this.getCurrentPlayer();
    const topCard = this.discardPile[this.discardPile.length - 1];

    if (!topCard) {
      throw new Error('No card on discard pile');
    }

    if (this.vsCpu && currentPlayer instanceof BotPlayer) {
      return this.handleBotTurn(currentPlayer, topCard);
    }

    // Clear screen at start of turn
    process.stdout.write('\x1B[2J\x1B[0;0H');

    if (this.specialCardMessage) {
      console.log(this.specialCardMessage);
      this.specialCardMessage = null;
    }

    if (this.challengeResult) {
      const { type, player, cardsDrawn } = this.challengeResult;
      console.log(`Challenge ${type}! ${player.name} drew ${cardsDrawn} cards!`);
      this.challengeResult = null;
    }

    if (this.draw2Result) {
      const { player, cardsDrawn } = this.draw2Result;
      console.log(`${player.name} drew ${cardsDrawn} cards!`);
      this.draw2Result = null;
    }

    const currentDrawnCards = this.drawnCards.find((d) => d.player === currentPlayer)?.cards || [];
    if (currentDrawnCards.length > 0) {
      for (const card of currentDrawnCards) {
        await this.printWithDelay(`You drew: ${card.toString()}`);
      }
      this.drawnCards = this.drawnCards.filter((d) => d.player !== currentPlayer);
    }

    console.log(box(`${currentPlayer.name}'s turn`));
    console.log(`Top card: ${topCard.toString()}`);

    console.log('\nYour hand:');
    const handDisplay = currentPlayer.displayHand(topCard, this.isFirstTurn);
    for (const cardDisplay of handDisplay) {
      await this.printWithDelay(cardDisplay, 300);
    }

    const hand = currentPlayer.getHand();
    if (!currentPlayer.hasPlayableCard(topCard, this.isFirstTurn)) {
      await this.printWithDelay(colorize('No playable cards. Drawing a card...', 'yellow'));
      const drawnCards = await this.drawCard(currentPlayer, 1, true);
      if (drawnCards) {
        const playedDrawnCard = await this.handleDrawnCardPlay(
          currentPlayer,
          topCard,
          drawnCards[0]
        );
        if (!playedDrawnCard) {
          await this.printWithDelay(colorize('Cannot play drawn card. Turn ends.', 'yellow'));
        }
      }
      return true;
    }

    let answer = await this.askQuestion('Enter the number of the card to play (or 0 to draw): ');
    let cardIndex = parseInt(answer) - 1;

    if (isNaN(cardIndex)) {
      await this.printWithDelay(colorize('Invalid input! Please enter a number.', 'red'));
      return false;
    }

    while (true) {
      if (answer === '0') {
        const drawnCards = await this.drawCard(currentPlayer, 1, true);
        if (drawnCards) {
          await this.printWithDelay('You drew a card. Your turn is over.');
          return true;
        }
      }

      const selectedCard = hand[cardIndex];
      if (!selectedCard) {
        await this.printWithDelay(colorize('Invalid card selection!', 'red'));
        answer = await this.askQuestion('Enter the number of the card to play (or 0 to draw): ');
        cardIndex = parseInt(answer) - 1;
        continue;
      }

      if (selectedCard.canBePlayedOn(topCard, this.isFirstTurn)) {
        if (this.isFirstTurn) {
          this.isFirstTurn = false;
        }
        const playedCard = currentPlayer.removeCard(cardIndex);
        if (playedCard) {
          this.discardPile.push(playedCard);
          await this.printWithDelay(`Played: ${playedCard.toString()}`);

          if (playedCard.isSpecialCard()) {
            await this.handleSpecialCardEffect(playedCard);
          }

          if (currentPlayer.getHandSize() === 1) {
            const saidUno = await this.askUnoPrompt(5000);
            if (!saidUno) {
              await this.handleUnoPenalty(currentPlayer);
            }
          }
          await this.delay(500);
          return true;
        }
      } else {
        await this.printWithDelay(
          colorize('Invalid move! Card must match the color or number of the top card.', 'red')
        );
        answer = await this.askQuestion('Enter the number of the card to play (or 0 to draw): ');
        cardIndex = parseInt(answer) - 1;
      }
    }

    return false;
  }

  private checkWinner(): Player | null {
    return this.players.find((player) => player.getHandSize() === 0) || null;
  }

  public async start(): Promise<void> {
    try {
      while (true) {
        try {
          this.isRestarting = false;
          this.resetState();

          process.stdout.write('\x1B[2J\x1B[0;0H');
          await this.printWithDelay('\n' + box('Welcome to Uno!'), 500);
          await this.printWithDelay(
            colorize('Tip: Press x at any prompt to reset and start over.', 'yellow'),
            800
          );

          // CPU default = Yes
          const vsCpuAnswer = await this.askQuestion('Play against CPU? (Y/n): ');
          const normalized = vsCpuAnswer.trim().toLowerCase();
          this.vsCpu = normalized === '' || normalized === 'y';

          if (this.vsCpu) {
            const humanNameInput = await this.askQuestion(
              'Enter your name (or press Enter for default): '
            );
            const humanName = (humanNameInput.trim() || 'PLAYER 1').toUpperCase();
            this.players = [new Player(humanName), new BotPlayer('CPU')];
            await this.printWithDelay('Initializing game...', 500);
            this.initializeGame();
          } else {
            const numPlayersAnswer = await this.askQuestion(
              'How many players? (2-10, press Enter for default 2): '
            );
            const numPlayers = numPlayersAnswer ? parseInt(numPlayersAnswer) : 2;

            if (numPlayers < 2 || numPlayers > 10) {
              if (numPlayersAnswer) {
                await this.printWithDelay(
                  colorize('Invalid number of players. Using default 2 players.', 'yellow')
                );
              }
              this.players = [new Player('PLAYER 1'), new Player('PLAYER 2')];
              await this.printWithDelay('Initializing game with default 2 players...', 500);
              this.initializeGame();
            } else {
              const playerNames: string[] = [];
              for (let i = 0; i < numPlayers; i++) {
                let name = '';
                while (true) {
                  name = await this.askQuestion(
                    `Enter name for Player ${i + 1} (or press Enter for default): `
                  );
                  const trimmedName = name.trim().toUpperCase() || `PLAYER ${i + 1}`;
                  if (playerNames.includes(trimmedName)) {
                    await this.printWithDelay(
                      colorize('Name already taken! Please choose a different name.', 'red')
                    );
                    continue;
                  }
                  playerNames.push(trimmedName);
                  break;
                }
              }
              this.players = playerNames.map((name) => new Player(name));
              await this.printWithDelay('Initializing game...', 500);
              this.initializeGame();
            }
          }

          let gameOver = false;
          while (!gameOver) {
            let turnCompleted = false;
            while (!turnCompleted) {
              turnCompleted = await this.handlePlayerTurn();

              const winner = this.checkWinner();
              if (winner) {
                await this.printWithDelay('\n' + box(`${winner.name} WINS!`), 500);
                gameOver = true;
                break;
              }
            }

            if (!gameOver) {
              const currentPlayer = this.getCurrentPlayer();
              const nextPlayer = this.players[(this.currentPlayerIndex + 1) % this.players.length];
              if (currentPlayer !== nextPlayer) {
                await this.delay(300);
              }
              this.nextTurn();
              this.isFirstTurn = false;
            }
          }

          break;
        } catch (err) {
          if (err instanceof ControlFlowError && err.code === 'RESTART') {
            continue;
          }
          throw err;
        }
      }
    } catch (error) {
      console.error('An error occurred:', error);
    } finally {
      this.rl.close();
    }
  }
}
