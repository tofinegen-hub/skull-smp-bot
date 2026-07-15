/**
 * Skull SMP — Simple Logger
 */

const colours = {
  reset: '\x1b[0m',
  info:  '\x1b[36m',  // Cyan
  warn:  '\x1b[33m',  // Yellow
  error: '\x1b[31m',  // Red
  debug: '\x1b[35m',  // Magenta
  success:'\x1b[32m', // Green
};

function stamp() {
  return new Date().toISOString();
}

const logger = {
  info:    (...args) => console.log(`${colours.info}[INFO]${colours.reset} [${stamp()}]`, ...args),
  warn:    (...args) => console.warn(`${colours.warn}[WARN]${colours.reset} [${stamp()}]`, ...args),
  error:   (...args) => console.error(`${colours.error}[ERROR]${colours.reset} [${stamp()}]`, ...args),
  debug:   (...args) => console.log(`${colours.debug}[DEBUG]${colours.reset} [${stamp()}]`, ...args),
  success: (...args) => console.log(`${colours.success}[OK]${colours.reset} [${stamp()}]`, ...args),
};

export default logger;
