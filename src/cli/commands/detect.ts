import { Command } from 'commander';
import chalk from 'chalk';
import { ToolDetector } from '../../installer/detector';

interface DetectOptions {
  json?: boolean;
}

export function detectCommand(): Command {
  return new Command('detect')
    .description('Detect installed development tools')
    .argument('[tool]', 'Specific tool to detect')
    .option('--json', 'Output in JSON format')
    .action(async (tool: string | undefined, options: DetectOptions) => {
      const detector = new ToolDetector();
      const results = await detector.detect(tool);

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      console.log(chalk.blue('🔍 Detecting development tools...\n'));

      for (const result of results) {
        const status = result.detected ? chalk.green('✓ Found') : chalk.red('✗ Not found');
        console.log(`${status} ${result.name} (${result.executable})`);
      }

      if (tool && results.length > 0 && results[0].detected) {
        console.log(chalk.green(`\n${tool} found`));
        process.exit(0);
      } else if (tool && results.length > 0 && !results[0].detected) {
        console.log(chalk.red(`\n${tool} not found`));
        process.exit(1);
      }
    });
}
