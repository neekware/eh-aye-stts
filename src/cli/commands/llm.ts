import { Command } from 'commander';
import chalk from 'chalk';
import { LLMFeedbackGenerator } from '../../services/llm-feedback';
import { MessageCache } from '../../services/message-cache';
import { HookContext } from '../../plugins/claude-code/hooks/context-builder';
import { loadSTTSConfig } from '../../utils/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { SETTINGS_PATH, DEFAULT_CONFIG } from '../../defaults';

export function llmCommand(): Command {
  const llm = new Command('llm')
    .description('Manage LLM feedback and caching features')
    .addHelpText(
      'after',
      `
Commands:
  test          Test LLM feedback generation
  cache         Manage the LLM response cache
  enable        Enable LLM-powered feedback
  disable       Disable LLM-powered feedback
  status        Show current LLM configuration

Examples:
  stts llm test -s                         # Run test scenarios
  stts llm test -p "Testing LLM"          # Test with custom prompt
  stts llm cache show                      # Show cache statistics
  stts llm cache clear                     # Clear all cache entries
  stts llm cache tail                      # Monitor cache in real-time
  stts llm enable                          # Enable LLM feedback
  stts llm disable                         # Disable LLM feedback

For JSON context testing:
  stts llm test -c '{"eventType":"stop","tool":"Bash","exitCode":0}'`
    );

  // Test subcommand
  llm
    .command('test')
    .description('Test LLM feedback generation')
    .option('-p, --prompt <prompt>', 'Test a specific prompt directly')
    .option('-c, --context <json>', 'Test with a JSON context object')
    .option('-s, --scenarios', 'Run predefined test scenarios')
    .action(async (options: { prompt?: string; context?: string; scenarios?: boolean }) => {
      console.log(chalk.blue('🔍 LLM Feedback Test\n'));

      // Test direct prompt
      if (options.prompt) {
        console.log(chalk.yellow('Testing direct prompt...'));
        console.log(chalk.gray(`Prompt: ${options.prompt}`));

        try {
          const context: HookContext = {
            eventType: 'test',
            timestamp: new Date().toISOString(),
            projectName: 'test',
            cwd: process.cwd(),
          };

          const result = await LLMFeedbackGenerator.generateFeedback(context, {
            maxWords: 10,
            style: 'casual',
          });

          console.log(chalk.green(`\nGenerated message: "${result}"`));
        } catch (error) {
          console.log(
            chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
          );
        }
        return;
      }

      // Test with context JSON
      if (options.context) {
        console.log(chalk.yellow('Testing with context...'));

        try {
          const contextData = JSON.parse(options.context);
          console.log(chalk.gray('Context:'), contextData);

          const context: HookContext = {
            eventType: contextData.eventType || 'post-tool-use',
            timestamp: new Date().toISOString(),
            projectName: 'test',
            cwd: process.cwd(),
            tool: contextData.tool,
            command: contextData.command,
            result: contextData.result,
            exitCode: contextData.exitCode,
            duration: contextData.duration,
          };

          const result = await LLMFeedbackGenerator.generateFeedback(context, {
            maxWords: 10,
            style: 'casual',
          });

          console.log(chalk.green(`\nGenerated message: "${result}"`));
        } catch (error) {
          console.log(
            chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
          );
        }
        return;
      }

      // Run test scenarios
      if (options.scenarios || (!options.prompt && !options.context)) {
        console.log(chalk.yellow('Running test scenarios...\n'));

        const scenarios = [
          {
            name: 'Successful build',
            context: {
              eventType: 'post-tool-use',
              tool: 'build',
              command: 'npm run build',
              exitCode: 0,
              duration: 45000,
            },
          },
          {
            name: 'Failed test',
            context: {
              eventType: 'post-tool-use',
              tool: 'test',
              command: 'npm test',
              exitCode: 1,
              duration: 10000,
            },
          },
          {
            name: 'Long running command',
            context: {
              eventType: 'post-tool-use',
              tool: 'install',
              command: 'npm install',
              exitCode: 0,
              duration: 120000,
            },
          },
          {
            name: 'Session end',
            context: {
              eventType: 'stop',
              sessionDuration: 3600000,
              errorCount: 2,
              successCount: 15,
            },
          },
        ];

        for (const scenario of scenarios) {
          console.log(chalk.cyan(`📝 ${scenario.name}`));
          console.log(chalk.gray('Context:'), scenario.context);

          const context: HookContext = {
            timestamp: new Date().toISOString(),
            projectName: 'test',
            cwd: process.cwd(),
            ...scenario.context,
          };

          try {
            const result = await LLMFeedbackGenerator.generateFeedback(context, {
              maxWords: 10,
              style: 'casual',
            });

            console.log(chalk.green(`Generated: "${result}"`));
          } catch (error) {
            console.log(
              chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
            );
          }

          console.log('');
        }
      }
    });

  // Cache subcommand group
  const cache = llm.command('cache').description('Manage LLM message cache');

  // Cache show
  cache
    .command('show')
    .description('Show cache statistics and entries')
    .option('-v, --verbose', 'Show all cache entries')
    .action((options: { verbose?: boolean }) => {
      const stats = MessageCache.getStats();

      console.log(chalk.blue('📊 Cache Statistics\n'));
      console.log(`Total entries: ${stats.size}`);
      console.log(`Cache hits: ${stats.hits}`);
      console.log(`Cache misses: ${stats.misses}`);
      console.log(`Hit rate: ${stats.hitRate.toFixed(2)}%`);
      console.log(
        `Oldest entry: ${stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'N/A'}`
      );
      console.log(
        `Newest entry: ${stats.newestEntry ? new Date(stats.newestEntry).toLocaleString() : 'N/A'}`
      );

      if (options.verbose && stats.size > 0) {
        console.log(chalk.yellow('\n📝 Cache Entries:\n'));
        const entries = MessageCache.getAllEntries();
        entries.forEach((entry, index) => {
          console.log(chalk.cyan(`[${index + 1}] ${entry.key}`));
          console.log(chalk.gray(`  Time: ${new Date(entry.timestamp).toLocaleString()}`));
          console.log(chalk.gray(`  Prompt: ${entry.prompt?.substring(0, 80)}...`));
          console.log(chalk.green(`  Response: ${entry.message}`));
          console.log('');
        });
      }
    });

  // Cache clear
  cache
    .command('clear')
    .description('Clear all cache entries')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options: { force?: boolean }) => {
      const size = MessageCache.size();

      if (size === 0) {
        console.log(chalk.yellow('Cache is already empty.'));
        return;
      }

      if (!options.force) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(chalk.yellow(`Clear ${size} cache entries? (y/N) `), resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'y') {
          console.log('Cancelled.');
          return;
        }
      }

      MessageCache.clear();
      console.log(chalk.green(`✓ Cleared ${size} cache entries`));
    });

  // Cache tail
  cache
    .command('tail')
    .description('Monitor cache activity in real-time')
    .option('-n, --lines <number>', 'Number of recent entries to show initially', '10')
    .action((options: { lines: string }) => {
      const lines = parseInt(options.lines, 10);

      console.log(chalk.blue('📡 Monitoring cache activity (Ctrl+C to stop)\n'));

      // Show recent entries
      const entries = MessageCache.getRecentEntries(lines);
      entries.forEach((entry) => {
        console.log(
          chalk.gray(`[${new Date(entry.timestamp).toLocaleTimeString()}]`),
          chalk.cyan(entry.key)
        );
        console.log(chalk.green(`  → ${entry.message}`));
      });

      // Set up monitoring
      MessageCache.onCacheUpdate((event) => {
        const time = new Date().toLocaleTimeString();

        switch (event.type) {
          case 'set':
            console.log(chalk.gray(`[${time}]`), chalk.cyan(event.key), chalk.green('CACHED'));
            console.log(chalk.green(`  → ${event.message}`));
            break;
          case 'hit':
            console.log(chalk.gray(`[${time}]`), chalk.cyan(event.key), chalk.yellow('HIT'));
            break;
          case 'miss':
            console.log(chalk.gray(`[${time}]`), chalk.cyan(event.key), chalk.red('MISS'));
            break;
          case 'evict':
            console.log(chalk.gray(`[${time}]`), chalk.cyan(event.key), chalk.red('EVICTED'));
            break;
        }
      });

      // Keep process running
      process.stdin.resume();
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n\nStopping cache monitor...'));
        process.exit(0);
      });
    });

  // Cache export
  cache
    .command('export')
    .description('Export cache entries to JSON file')
    .option('-o, --output <file>', 'Output file path', 'llm-cache-export.json')
    .action((options: { output: string }) => {
      const entries = MessageCache.getAllEntries();

      if (entries.length === 0) {
        console.log(chalk.yellow('No cache entries to export.'));
        return;
      }

      const data = {
        exported: new Date().toISOString(),
        version: '1.0',
        entries: entries,
        stats: MessageCache.getStats(),
      };

      try {
        writeFileSync(options.output, JSON.stringify(data, null, 2));
        console.log(chalk.green(`✓ Exported ${entries.length} entries to ${options.output}`));
      } catch (error) {
        console.error(chalk.red(`Failed to export: ${error}`));
      }
    });

  // Enable/Disable commands
  llm
    .command('enable')
    .description('Enable LLM feedback generation')
    .action(() => {
      let config: any = { ...DEFAULT_CONFIG };

      try {
        config = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
      } catch (error) {
        // Use default config if file doesn't exist
      }

      config.llmEnabled = true;

      // Ensure directory exists
      const configDir = dirname(SETTINGS_PATH);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
      writeFileSync(SETTINGS_PATH, JSON.stringify(config, null, 2));
      console.log(chalk.green('✓ LLM feedback generation enabled'));
    });

  llm
    .command('disable')
    .description('Disable LLM feedback generation')
    .action(() => {
      let config: any = { ...DEFAULT_CONFIG };

      try {
        config = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
      } catch (error) {
        // Use default config if file doesn't exist
      }

      config.llmEnabled = false;

      // Ensure directory exists
      const configDir = dirname(SETTINGS_PATH);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
      writeFileSync(SETTINGS_PATH, JSON.stringify(config, null, 2));
      console.log(chalk.yellow('✓ LLM feedback generation disabled'));
    });

  // Status command
  llm
    .command('status')
    .description('Show LLM configuration and status')
    .action(async () => {
      const config = loadSTTSConfig();
      const cacheStats = MessageCache.getStats();

      console.log(chalk.blue('🤖 LLM Status\n'));

      console.log(chalk.white('Configuration:'));
      console.log(
        `  Enabled: ${config.llmEnabled !== false ? chalk.green('Yes') : chalk.yellow('No')}`
      );
      console.log(`  Model: ${chalk.cyan(config.llmModel || 'claude-3-5-sonnet-20241022')}`);
      console.log(
        `  Cache enabled: ${config.llmCacheEnabled !== false ? chalk.green('Yes') : chalk.yellow('No')}`
      );
      console.log(`  Cache TTL: ${chalk.cyan(config.llmCacheTTL || 300)} seconds`);

      console.log(chalk.white('\nCache Status:'));
      console.log(`  Entries: ${chalk.cyan(cacheStats.size)}`);
      console.log(`  Hit rate: ${chalk.cyan(cacheStats.hitRate.toFixed(2))}%`);
      console.log(`  Memory usage: ${chalk.cyan(cacheStats.memoryUsage)} bytes`);

      // Check Claude CLI availability
      try {
        const { spawn } = await import('child_process');
        const isAvailable = await new Promise<boolean>((resolve) => {
          const claude = spawn('claude', ['--version'], { stdio: 'ignore' });
          claude.on('close', (code) => resolve(code === 0));
          claude.on('error', () => resolve(false));
          setTimeout(() => {
            claude.kill();
            resolve(false);
          }, 1000);
        });

        console.log(chalk.white('\nClaude CLI:'));
        console.log(`  Available: ${isAvailable ? chalk.green('Yes') : chalk.red('No')}`);
      } catch {
        console.log(chalk.white('\nClaude CLI:'));
        console.log(`  Available: ${chalk.red('No')}`);
      }
    });

  return llm;
}
