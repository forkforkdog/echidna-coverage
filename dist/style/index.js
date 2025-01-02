"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.style = exports.ICONS = exports.COLORS = void 0;
exports.COLORS = {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
    DIM: '\x1b[2m',
};
exports.ICONS = {
    FILE: '📄',
    WARNING: '⚠️',
    ERROR: '❌',
    SUCCESS: '✅',
    INFO: 'ℹ️',
};
exports.style = {
    header: (text) => `${exports.COLORS.BOLD}${exports.COLORS.CYAN}${text}${exports.COLORS.RESET}`,
    warning: (text) => `${exports.COLORS.YELLOW}${text}${exports.COLORS.RESET}`,
    error: (text) => `${exports.COLORS.RED}${text}${exports.COLORS.RESET}`,
    success: (text) => `${exports.COLORS.GREEN}${text}${exports.COLORS.RESET}`,
    info: (text) => `${exports.COLORS.BLUE}${text}${exports.COLORS.RESET}`,
    dim: (text) => `${exports.COLORS.DIM}${text}${exports.COLORS.RESET}`,
};
