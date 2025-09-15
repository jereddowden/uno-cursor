# Uno Game

A command-line implementation of the classic Uno card game written in TypeScript.

## Features

- Support for 2-10 players
- All standard Uno cards including:
  - Number cards (0-9)
  - Skip cards
  - Reverse cards
  - Draw 2 cards
  - Wild cards
  - Wild Draw 4 cards
- Special card effects:
  - Skip: Next player's turn is skipped
  - Reverse: Changes the direction of play (acts as skip in 2-player game)
  - Draw 2: Next player draws 2 cards
  - Wild: Change the color
  - Wild Draw 4: Change the color and next player draws 4 cards
- Wild Draw 4 Challenge Rule: Players can challenge if they believe the Wild Draw 4 was played illegally
- "Uno" Rule: Players must type "uno" within 5 seconds when they have one card left
- Automatic deck reshuffling when the draw pile is empty

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd uno-game
```

2. Install dependencies:

```bash
npm install
```

## How to Play

1. Start the game:

```bash
npm start
```

2. Follow the prompts to:

   - Enter the number of players (2-10)
   - Enter each player's name (or press Enter for default names)

3. Game Rules:
   - Play a card that matches the color or number of the top card
   - Special cards can be played on any card
   - When you have one card left, type "uno" within 5 seconds
   - If you can't play a card, you must draw one
   - First player to get rid of all their cards wins

## Game Commands

During your turn:

- Enter the number of the card you want to play (1-based index)
- Enter 0 to draw a card
- Type "uno" when prompted (within 5 seconds)
- For Wild cards, enter the number (1-4) corresponding to your color choice:
  1. Red
  2. Blue
  3. Green
  4. Yellow

## Folder Structure

```
src/
├── card/
│   ├── card.ts         # Card class implementation
│   └── card.test.ts    # Card class tests
├── deck/
│   ├── deck.ts         # Deck class implementation
│   └── deck.test.ts    # Deck class tests
├── game/
│   ├── game.ts         # Game class implementation
│   └── game.test.ts    # Game class tests
├── player/
│   ├── player.ts       # Player class implementation
│   └── player.test.ts  # Player class tests
├── types/
│   └── types.ts        # TypeScript type definitions
└── index.ts            # Main entry point
```

## Development

This project is built with:

- TypeScript
- Node.js
- ts-node for running TypeScript directly

To modify the game:

1. Edit the source files in the `src` directory
2. The main game logic is in `src/game.ts`
3. Run the game to test your changes:

```bash
npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

Common issues and solutions:

1. **"Command not found: npm"**

   - Make sure Node.js and npm are installed
   - Try running `node -v` to verify installation

2. **TypeScript compilation errors**

   - Run `npm install` to ensure all dependencies are installed
   - Check `tsconfig.json` for correct configuration

3. **Game not starting**
   - Ensure you're in the correct directory
   - Try running `npm install` again
   - Check for any error messages in the console

## Future Improvements

- [ ] Add color to the console output
- [ ] Implement card stacking rules
- [ ] Add AI players
- [ ] Add game statistics tracking
- [ ] Implement save/load game state

## License

ISC

## Acknowledgments

- Inspired by the classic Uno card game
- Built with TypeScript and Node.js
- Thanks to all contributors and players
