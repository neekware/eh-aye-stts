import { Command } from 'commander';
import chalk from 'chalk';
import { basename } from 'path';
import { createInterface } from 'readline';
import { ToolDetector } from '../../installer/detector';
import { SettingsManager } from '../../installer/settings-manager';

export function restoreCommand(): Command {
  return new Command('restore')
    .description('Restore settings from a backup')
    .argument('<tool>', 'Tool to restore settings for (e.g., claude-code)')
    .argument('[backup-number]', 'Backup number to restore (from status --backups)')
    .option('--force', 'Skip confirmation prompt')
    .addHelpText(
      'after',
      `
Restores a tool's settings from a previous backup. Backups are created automatically
when enabling/disabling TTS hooks.

Examples:
  stts restore claude-code             # Interactive restore selection
  stts restore claude-code 2           # Restore backup #2
  stts restore claude-code 1 --force   # Restore backup #1 without confirmation

First run 'stts status --backups' to see available backups with numbers.`
    )
    .action(async (tool: string, backupNumber?: string, _options?: { force?: boolean }) => {
      // Validate tool parameter
      const supportedTools = ['claude', 'claude-code'];
      if (!supportedTools.includes(tool.toLowerCase())) {
        console.error(chalk.red(`Error: Unsupported tool '${tool}'`));
        console.error(chalk.yellow(`\nSupported tools: ${supportedTools.join(', ')}`));
        console.error(chalk.gray(`\nUse 'stts restore --help' for more information`));
        process.exit(1);
      }

      const detector = new ToolDetector();
      const settingsPath = await detector.getSettingsPath(tool);

      if (!settingsPath) {
        console.error(chalk.red(`No ${tool} settings found`));
        console.error(
          chalk.yellow(`\nMake sure ${tool} is installed and has been run at least once.`)
        );
        process.exit(1);
      }

      const manager = new SettingsManager(settingsPath, tool);
      const backups = await manager.listBackups();

      if (backups.length === 0) {
        console.log(chalk.yellow('No backups found'));
        return;
      }

      let selectedBackup: string;

      if (backupNumber) {
        const index = parseInt(backupNumber) - 1;
        if (index < 0 || index >= backups.length) {
          console.error(chalk.red(`Invalid backup number. Available: 1-${backups.length}`));
          process.exit(1);
        }
        selectedBackup = backups[index];
      } else {
        // Show available backups and prompt for selection
        console.log(chalk.blue('📁 Available backups:\n'));
        backups.forEach((backup, index) => {
          const name = basename(backup);
          const timestamp = name.match(/backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1];
          if (timestamp) {
            const date = new Date(timestamp.replace(/-/g, ':').replace('T', ' '));
            console.log(`  ${index + 1}. ${date.toLocaleString()} - ${name}`);
          } else {
            console.log(`  ${index + 1}. ${name}`);
          }
        });

        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question('\nSelect backup number to restore: ', resolve);
        });
        rl.close();

        const index = parseInt(answer) - 1;
        if (index < 0 || index >= backups.length) {
          console.error(chalk.red(`Invalid backup number. Available: 1-${backups.length}`));
          process.exit(1);
        }
        selectedBackup = backups[index];
      }

      try {
        await manager.restoreFromBackup(selectedBackup);
        console.log(chalk.green('\n✨ Settings restored successfully!'));
      } catch (error) {
        console.error(
          chalk.red(
            `Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    });
}
