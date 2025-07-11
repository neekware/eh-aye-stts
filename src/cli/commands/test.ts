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
    .option('--list-providers', 'List available TTS providers without speaking')
    .addHelpText(
      'after',
      `
Tests the TTS system by speaking a message using the available TTS provider.

Examples:
  stts test                                # Test with default message
  stts test -m "Hello world"              # Test with custom message
  stts test --message "Build complete"    # Test with custom message
  stts test --list-providers              # List available providers`
    )
    .action(async (options: TestOptions & { listProviders?: boolean }) => {
      try {
        const tts = loadTTS();

        const providers = await tts.listAvailable();

        if (options.listProviders) {
          console.log(chalk.blue('🔊 Available TTS Providers:\n'));
          providers.forEach((provider) => {
            console.log(chalk.gray(`  • ${provider}`));
          });
          return;
        }

        console.log(chalk.blue('🔊 Testing TTS...\n'));
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
