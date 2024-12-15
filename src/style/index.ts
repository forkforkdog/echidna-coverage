export const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
} as const;

export const ICONS = {
  FILE: '📄',
  WARNING: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  INFO: 'ℹ️',
} as const;

export const style = {
  header: (text: string) => `${COLORS.BOLD}${COLORS.CYAN}${text}${COLORS.RESET}`,
  warning: (text: string) => `${COLORS.YELLOW}${text}${COLORS.RESET}`,
  error: (text: string) => `${COLORS.RED}${text}${COLORS.RESET}`,
  success: (text: string) => `${COLORS.GREEN}${text}${COLORS.RESET}`,
  info: (text: string) => `${COLORS.BLUE}${text}${COLORS.RESET}`,
  dim: (text: string) => `${COLORS.DIM}${text}${COLORS.RESET}`,
};
