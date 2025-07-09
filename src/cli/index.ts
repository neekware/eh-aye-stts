#!/usr/bin/env node
import { createProgram } from './program.js';

// Always run the CLI when this file is executed
createProgram().parse();
