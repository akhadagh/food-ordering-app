import { env } from '../config/env.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[env.logLevel] ?? LEVELS.info;

const COLOURS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
};
const RESET = '\x1b[0m';

function emit(level, message, meta) {
  if ((LEVELS[level] ?? 99) > threshold) return;

  if (env.logJson) {
    const payload = {
      level,
      time: new Date().toISOString(),
      message,
      ...(meta || {}),
    };
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](JSON.stringify(payload));
    return;
  }

  const time = new Date().toISOString().slice(11, 23);
  const colour = COLOURS[level] || '';
  const extra = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](
    `${colour}${time} ${level.toUpperCase().padEnd(5)}${RESET} ${message}${extra}`
  );
}

export const logger = {
  error: (message, meta) => emit('error', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  info: (message, meta) => emit('info', message, meta),
  debug: (message, meta) => emit('debug', message, meta),
};

export default logger;
