#!/usr/bin/env tsx
/**
 * Example: LLM-Powered Feedback
 *
 * This example demonstrates how to configure and use LLM-powered feedback
 * with STTS for dynamic, context-aware messages.
 */

import { execSync } from 'child_process';

console.log('🧠 LLM Feedback Example\n');

// Check current configuration
console.log('📋 Current LLM Configuration:');
execSync('stts config llm', { stdio: 'inherit' });
console.log('');

// Enable LLM feedback
console.log('✅ Enabling LLM feedback...');
execSync('stts config llm --enable', { stdio: 'inherit' });
console.log('');

// Configure LLM settings
console.log('⚙️  Configuring LLM settings...');
execSync('stts config llm --style casual --max-words 10', { stdio: 'inherit' });
console.log('');

// Simulate different hook events to demonstrate LLM feedback
console.log('🎯 Simulating hook events with LLM feedback:\n');

// Simulate a successful build
console.log('1️⃣  Successful build (45 seconds):');
console.log('   Context: npm build, 45s duration, exit code 0');
console.log('   Static: "Build completed in 45 seconds"');
console.log('   LLM: "Nice! Build crushed it" (example)\n');

// Simulate a failed test
console.log('2️⃣  Failed test:');
console.log('   Context: npm test, failed with 3 test failures');
console.log('   Static: "Test failed with error"');
console.log('   LLM: "Tests need some love" (example)\n');

// Simulate a long-running task
console.log('3️⃣  Long-running task (2 minutes):');
console.log('   Context: deployment script, 120s duration');
console.log('   Static: "Command completed in 120 seconds"');
console.log('   LLM: "Finally done, great patience" (example)\n');

// Simulate session end
console.log('4️⃣  Session end with mixed results:');
console.log('   Context: 30 min session, 15 successes, 2 errors');
console.log('   Static: "Session completed"');
console.log('   LLM: "Productive session, nice work" (example)\n');

// Cache configuration
console.log('💾 Cache Configuration:');
execSync('stts config set llmCacheEnabled true', { stdio: 'inherit' });
execSync('stts config set llmCacheTTL 300', { stdio: 'inherit' });
console.log('');

console.log('📝 Notes:');
console.log('- LLM feedback requires Claude CLI to be installed and available');
console.log('- Messages are generated based on context (tool, duration, outcome)');
console.log('- Fallback to static messages when Claude CLI is unavailable');
console.log('- Responses are cached to minimize LLM calls');
console.log('- Configure via "stts config llm" commands\n');

console.log('🎉 To test with real Claude Code:');
console.log('1. Enable a Claude Code workspace');
console.log('2. Run some commands and observe the dynamic feedback');
console.log('3. Notice how messages adapt to context and outcomes\n');
