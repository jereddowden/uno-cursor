import * as readline from 'readline';

import { box, colorize } from '../utils/colors';

import { Card } from '../card';
import { Color } from '../types';
import { Deck } from '../deck';
import { Player } from '../player';

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
  private drawnCards: { player: Player; cards: Card[] }[] = []; // Track the last player who called Uno

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

  private async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  private initializeGame(): void {
    console.log('Initializing game...');
    // Shuffle the deck
    this.deck.shuffle();

    // Deal 7 cards to each player
    for (let i = 0; i < 7; i++) {
      for (const player of this.players) {
        const card = this.deck.drawCard();
        if (card) {
          player.addCard(card);
        }
      }
    }

    // Draw the first card for the discard pile
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

    // Keep the top card
    const topCard = this.discardPile.pop();
    if (!topCard) return;

    // Move all other cards to the deck
    while (this.discardPile.length > 0) {
      const card = this.discardPile.pop();
      if (card) {
        this.deck.addCard(card);
      }
    }

    // Shuffle the deck
    this.deck.shuffle();

    // Put the top card back
    this.discardPile.push(topCard);
    console.log('Deck has been reshuffled!');
  }

  private async handleWildDraw4Challenge(
    currentPlayer: Player,
    nextPlayer: Player
  ): Promise<boolean> {
    // Clear screen before showing challenge message
    process.stdout.write('\x1B[2J\x1B[0;0H');
    console.log(`\n${nextPlayer.name}, do you want to challenge the Wild Draw 4?`);
    const answer = await this.askQuestion('Enter y to challenge, any other key to accept: ');

    if (answer.toLowerCase() === 'y') {
      // Check if the current player had a card of the same color as the previous top card
      // Get the card before the wild4 was played
      const previousTopCard = this.discardPile[this.discardPile.length - 3];
      const hasMatchingColor = currentPlayer.getHand().some((card) => {
        // Skip wild cards
        if (card.color === 'black') return false;
        // Check if the card has the same color as the previous top card
        return card.color === previousTopCard.color;
      });

      if (hasMatchingColor) {
        // Store challenge result
        this.challengeResult = {
          type: 'successful',
          player: currentPlayer,
          cardsDrawn: 4,
        };
        await this.drawCard(currentPlayer, 4, true);
        // Challenger's turn continues
        return true;
      } else {
        // Store challenge result
        this.challengeResult = {
          type: 'failed',
          player: nextPlayer,
          cardsDrawn: 6,
        };
        await this.drawCard(nextPlayer, 6);
        // Challenger's turn continues
        return true;
      }
    }
    // If not challenged, just return false
    return false;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async printWithDelay(message: string, delayMs: number = 500): Promise<void> {
    // Prevent screen clearing by using process.stdout.write with a newline
    process.stdout.write(message + '\n');
    await this.delay(delayMs);
  }

  private async handleSpecialCardEffect(card: Card): Promise<void> {
    const effect = card.getEffect();
    const currentPlayer = this.getCurrentPlayer();
    const nextPlayer = this.players[(this.currentPlayerIndex + 1) % this.players.length];

    // Store any special card effects that need to be displayed later
    switch (effect) {
      case 'skip':
        this.specialCardMessage = colorize('Next player is skipped!', 'yellow');
        this.nextTurn();
        break;

      case 'reverse':
        this.specialCardMessage = colorize('Direction is reversed!', 'yellow');
        // For 2 players, reverse acts like skip
        this.nextTurn();
        break;

      case 'draw2':
        // Show the message to the current player
        await this.printWithDelay(colorize('Next player draws 2 cards!', 'yellow'));
        this.nextTurn();
        // Store the actual drawing message for next turn
        this.draw2Result = {
          player: nextPlayer,
          cardsDrawn: 2,
        };
        await this.drawCard(nextPlayer, 2);
        break;

      case 'wild': {
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

            // Handle draw 4 challenge
            const challengeResult = await this.handleWildDraw4Challenge(currentPlayer, nextPlayer);
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
      if (!isCurrentPlayer) {
        // Accumulate drawn cards for this player across multiple effects/turns
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

      const lineHandler = (input: string): void => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.rl.removeListener('line', lineHandler);
          resolve(input.trim().toLowerCase() === 'uno');
        }
      };

      this.rl.once('line', lineHandler);
    });
  }

  private async handlePlayerTurn(): Promise<boolean> {
    const currentPlayer = this.getCurrentPlayer();
    const topCard = this.discardPile[this.discardPile.length - 1];

    if (!topCard) {
      throw new Error('No card on discard pile');
    }

    // Clear screen at start of turn
    process.stdout.write('\x1B[2J\x1B[0;0H');

    // Display any special card messages from previous turn
    if (this.specialCardMessage) {
      console.log(this.specialCardMessage);
      this.specialCardMessage = null;
    }

    // Display any challenge results from previous turn
    if (this.challengeResult) {
      const { type, player, cardsDrawn } = this.challengeResult;
      console.log(`Challenge ${type}! ${player.name} drew ${cardsDrawn} cards!`);
      this.challengeResult = null;
    }

    // Display any draw2 results from previous turn
    if (this.draw2Result) {
      const { player, cardsDrawn } = this.draw2Result;
      console.log(`${player.name} drew ${cardsDrawn} cards!`);
      this.draw2Result = null;
    }

    // Display current player's drawn cards from previous turn
    const currentDrawnCards = this.drawnCards.find((d) => d.player === currentPlayer)?.cards || [];
    if (currentDrawnCards.length > 0) {
      // Display each card on a new line with a small delay
      for (const card of currentDrawnCards) {
        await this.printWithDelay(`You drew: ${card.toString()}`);
      }
      // Remove this player's drawn cards from the array
      this.drawnCards = this.drawnCards.filter((d) => d.player !== currentPlayer);
    }

    // Display current player's information
    console.log(box(`${currentPlayer.name}'s turn`));
    console.log(`Top card: ${topCard.toString()}`);

    // Display player's hand (bold playable cards)
    console.log('\nYour hand:');
    const handDisplay = currentPlayer.displayHand(topCard, this.isFirstTurn);
    for (const cardDisplay of handDisplay) {
      await this.printWithDelay(cardDisplay, 300); // Shorter delay between cards
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

    // Keep asking for input until a valid move is made
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
        // Clear isFirstTurn flag after a successful card play
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
          await this.delay(500); // Longer pause before next turn
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
      // Clear screen and show welcome message
      process.stdout.write('\x1B[2J\x1B[0;0H');
      await this.printWithDelay('\n' + box('Welcome to Uno!'), 1000);

      // Get number of players (default to 2 if empty)
      const numPlayersAnswer = await this.askQuestion(
        'How many players? (2-10, press Enter for default 2): '
      );
      const numPlayers = numPlayersAnswer ? parseInt(numPlayersAnswer) : 2;

      if (numPlayers < 2 || numPlayers > 10) {
        if (numPlayersAnswer) {
          // Only show error if they actually entered a number
          await this.printWithDelay(
            colorize('Invalid number of players. Using default 2 players.', 'yellow')
          );
        }
        // Fall back to default 2 players
        this.players = [new Player('PLAYER 1'), new Player('PLAYER 2')];
        await this.printWithDelay('Initializing game with default 2 players...', 1000);
        this.initializeGame();
        return;
      }

      // Get player names (no duplicates)
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

      // Initialize game with the specified players
      this.players = playerNames.map((name) => new Player(name));
      await this.printWithDelay('Initializing game...', 1000);
      this.initializeGame();

      let gameOver = false;
      while (!gameOver) {
        let turnCompleted = false;
        while (!turnCompleted) {
          turnCompleted = await this.handlePlayerTurn();

          const winner = this.checkWinner();
          if (winner) {
            await this.printWithDelay('\n' + box(`${winner.name} WINS!`), 1000);
            gameOver = true;
            break;
          }
        }

        if (!gameOver) {
          const currentPlayer = this.getCurrentPlayer();
          const nextPlayer = this.players[(this.currentPlayerIndex + 1) % this.players.length];
          if (currentPlayer !== nextPlayer) {
            // Only delay if it's actually a new turn
            await this.delay(500);
          }
          this.nextTurn();
          this.isFirstTurn = false;
        }
      }
    } catch (error) {
      console.error('An error occurred:', error);
    } finally {
      this.rl.close();
    }
  }
}
