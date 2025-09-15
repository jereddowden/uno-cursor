import { Game } from './game';

async function main(): Promise<void> {
  try {
    console.log('Welcome to Uno!');
    const game = new Game();
    await game.start();
  } catch (error) {
    console.error('An error occurred while running the game:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
