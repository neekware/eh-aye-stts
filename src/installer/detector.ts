import which from 'which';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ToolInfo } from '../types';
import { getClaudeSettingsPath, getClaudeSettingsDir } from '../plugins/claude-code/settings';
import { CLAUDE_DIR, CLAUDE_SETTINGS_FILE } from '../defaults';
import { isWindows, normalizePath, execCommand } from '../utils/platform';

export class ToolDetector {
  private tools: Map<string, ToolInfo> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools(): void {
    const claudeSettingsPath = getClaudeSettingsPath();

    // Claude Code
    this.tools.set('claude-code', {
      name: 'Claude Code',
      executable: 'claude-code',
      settingsPath: claudeSettingsPath,
      detected: false,
    });

    // Alternative Claude executable
    this.tools.set('claude', {
      name: 'Claude',
      executable: 'claude',
      settingsPath: claudeSettingsPath,
      detected: false,
    });

    // Future: Add more tools here
    // this.tools.set('cursor', {...});
    // this.tools.set('vscode', {...});
  }

  async detect(toolName?: string): Promise<ToolInfo[]> {
    const toolsToCheck = toolName
      ? [this.tools.get(toolName)].filter(Boolean)
      : Array.from(this.tools.values());

    const results: ToolInfo[] = [];

    for (const tool of toolsToCheck) {
      if (!tool) continue;

      const detected = await this.isToolAvailable(tool);
      results.push({
        ...tool,
        detected,
      });
    }

    return results;
  }

  async isToolAvailable(tool: ToolInfo): Promise<boolean> {
    try {
      // Check if executable exists
      await which(tool.executable);
      return true;
    } catch {
      // Try alternative names for Claude
      if (tool.executable === 'claude-code') {
        try {
          await which('claude');
          return true;
        } catch {
          // On Windows, also check common installation paths
          if (isWindows()) {
            return await this.checkWindowsInstallation(tool);
          }
          return false;
        }
      }
      return false;
    }
  }

  private async checkWindowsInstallation(_tool: ToolInfo): Promise<boolean> {
    // Common Windows installation paths for Claude
    const possiblePaths = [
      join(process.env.LOCALAPPDATA || '', 'Programs', 'claude', 'claude.exe'),
      join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Claude', 'claude.exe'),
      join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Claude', 'claude.exe'),
    ];

    for (const path of possiblePaths) {
      try {
        await fs.access(normalizePath(path));
        return true;
      } catch {
        // Continue checking other paths
      }
    }

    // Check if Claude is installed via Windows Store or other package managers
    try {
      const { code } = await execCommand('where claude 2>nul');
      return code === 0;
    } catch {
      return false;
    }
  }

  async getSettingsPath(toolName: string): Promise<string | null> {
    const tool = this.tools.get(toolName);
    if (!tool) return null;

    try {
      await fs.access(tool.settingsPath);
      return tool.settingsPath;
    } catch {
      // Try to find .claude directory in parent directories
      const claudeDir = await this.findClaudeDirectory();
      if (claudeDir) {
        return join(claudeDir, CLAUDE_SETTINGS_FILE);
      }
      return null;
    }
  }

  private async findClaudeDirectory(): Promise<string | null> {
    let currentDir = process.cwd();
    const root = this.getRootDirectory(currentDir);

    while (currentDir !== root) {
      const claudeDir = join(currentDir, CLAUDE_DIR);
      try {
        await fs.access(claudeDir);
        return claudeDir;
      } catch {
        const parentDir = dirname(currentDir);
        // Prevent infinite loop
        if (parentDir === currentDir) break;
        currentDir = parentDir;
      }
    }

    // Check configured Claude directory
    const claudeDir = getClaudeSettingsDir();
    try {
      await fs.access(claudeDir);
      return claudeDir;
    } catch {
      return null;
    }
  }

  private getRootDirectory(path: string): string {
    if (isWindows()) {
      // On Windows, root is like 'C:\' or 'D:\'
      const match = path.match(/^[A-Za-z]:\\/);
      return match ? match[0] : 'C:\\';
    }
    return '/';
  }
}
