#!/usr/bin/env node
export { createProgram } from './program.js';

// Run the CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  void import('./program.js').then(({ createProgram }) => {
    createProgram().parse();
  });
}
