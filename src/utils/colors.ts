// ANSI color codes
const COLORS = {
  red: '\x1b[31m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  black: '\x1b[30m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
} as const;

export const colorize = (text: string, color: keyof typeof COLORS): string => {
  return `${COLORS[color]}${text}${COLORS.reset}`;
};

export const colorizeBold = (text: string, color: keyof typeof COLORS): string => {
  return `${COLORS[color]}${COLORS.bold}${text}${COLORS.reset}`;
};

export const colorizeCard = (color: string, text: string): string => {
  const cardColor = color.toLowerCase() as keyof typeof COLORS;
  return colorize(text, cardColor);
};

export const colorizeCardBold = (color: string, text: string): string => {
  const cardColor = color.toLowerCase() as keyof typeof COLORS;
  return colorizeBold(text, cardColor);
};

export const box = (text: string): string => {
  const padding = 2;
  const width = text.length + padding * 2;
  const top = '┌' + '─'.repeat(width) + '┐';
  const middle = '│' + ' '.repeat(padding) + text + ' '.repeat(padding) + '│';
  const bottom = '└' + '─'.repeat(width) + '┘';
  return colorize(top + '\n' + middle + '\n' + bottom, 'blue');
};
