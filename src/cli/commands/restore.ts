import { Command } from 'commander';
import chalk from 'chalk';
import { basename } from 'path';
import { createInterface } from 'readline';
import { ToolDetector } from '../../installer/detector';
import { SettingsManager } from '../../installer/settings-manager';

export function restoreCommand(): Command {
  return new Command('restore')
    .description('Restore Claude settings from a backup')
    .argument('[backup-number]', 'Backup number to restore (from status --backups)')
    .action(async (backupNumber?: string) => {
      const detector = new ToolDetector();
      const settingsPath = await detector.getSettingsPath('claude-code');

      if (!settingsPath) {
        console.error(chalk.red('No Claude settings found'));
        process.exit(1);
      }

      const manager = new SettingsManager(settingsPath);
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
