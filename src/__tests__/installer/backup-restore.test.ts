import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';
import { SettingsManager } from '../../installer/settings-manager';

describe('Backup and Restore Tests', () => {
  let tempDir: string;
  let settingsPath: string;
  let manager: SettingsManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stts-test-'));
    settingsPath = join(tempDir, 'settings.json');
    manager = new SettingsManager(settingsPath, 'test-provider');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should create and restore backups correctly', async () => {
    // Create initial settings
    const originalSettings = { version: 1, data: 'original' };
    await fs.writeFile(settingsPath, JSON.stringify(originalSettings));

    // Create backup
    const backupPath = await manager.backupSettings();
    expect(backupPath).toBeTruthy();

    // Verify backup was created correctly
    const backupContent = await fs.readFile(backupPath!, 'utf8');
    expect(JSON.parse(backupContent)).toEqual(originalSettings);

    // Modify settings
    const modifiedSettings = { version: 2, data: 'modified' };
    await fs.writeFile(settingsPath, JSON.stringify(modifiedSettings));

    // Verify modification
    const modifiedContent = await fs.readFile(settingsPath, 'utf8');
    expect(JSON.parse(modifiedContent)).toEqual(modifiedSettings);

    // Wait to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Restore from backup
    const consoleSpy = vi.spyOn(console, 'log');
    await manager.restoreFromBackup(backupPath!);

    // Verify console log
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Restored settings from:'));
    consoleSpy.mockRestore();

    // Verify restoration
    const restored = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    expect(restored).toEqual(originalSettings);
  });

  it('should maintain only 5 most recent backups', async () => {
    // Create settings
    await fs.writeFile(settingsPath, JSON.stringify({ test: true }));

    // Create 7 backups (with delays to ensure unique timestamps)
    for (let i = 0; i < 7; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await manager.backupSettings();
    }

    // Should only have 5 backups
    const backups = await manager.listBackups();
    expect(backups).toHaveLength(5);
  }, 10000);

  it('should create backup before modifying settings via hooks', async () => {
    // Create settings
    await fs.writeFile(settingsPath, JSON.stringify({}));

    // Spy on console
    const consoleSpy = vi.spyOn(console, 'log');

    // Install hooks
    await manager.installHooks();

    // Should log backup creation
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📁 Created backup:'));

    // Should have created a backup
    const backups = await manager.listBackups();
    expect(backups.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it('should handle restore errors gracefully', async () => {
    const fakePath = join(tempDir, 'nonexistent.backup');
    await expect(manager.restoreFromBackup(fakePath)).rejects.toThrow();
  });

  it('should return null when no settings exist for backup', async () => {
    const backup = await manager.backupSettings();
    expect(backup).toBeNull();
  });
});
