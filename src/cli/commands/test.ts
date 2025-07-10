import { Command } from 'commander';
import chalk from 'chalk';
import { loadTTS } from '../../tts/loader';

interface TestOptions {
  message: string;
}

export function testCommand(): Command {
  return new Command('test')
    .description('Test TTS functionality')
    .option('-m, --message <text>', 'Custom message to speak', 'Testing TTS functionality')
    .action(async (options: TestOptions) => {
      try {
        const tts = loadTTS();

        console.log(chalk.blue('🔊 Testing TTS...\n'));

        const providers = await tts.listAvailable();
        console.log(chalk.gray(`Available providers: ${providers.join(', ')}`));

        const provider = await tts.getProvider();
        if (provider) {
          console.log(chalk.blue(`Using ${provider.name} provider\n`));
        }

        const success = await tts.speak(options.message);

        if (success) {
          console.log(chalk.green('✓ TTS test successful!'));
        } else {
          console.log(chalk.red('✗ TTS test failed'));
          process.exit(1);
        }
      } catch (error) {
        console.error(
          chalk.red(`Test failed: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });
}
