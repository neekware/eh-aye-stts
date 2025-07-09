#!/usr/bin/env node
export { createProgram } from './program';

// Run the CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  void import('./program').then(({ createProgram }) => {
    createProgram().parse();
  });
}
