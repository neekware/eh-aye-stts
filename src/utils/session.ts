import { join } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { SESSION_DEPOT_DIR, SESSION_LOGS_SUBDIR, SESSION_CACHE_SUBDIR } from '../defaults';

export class SessionManager {
  private static claudeProjectPath: string | null = null;

  /**
   * Get Claude project directory path
   * Claude stores project files in ~/.claude/projects/<encoded-project-path>/
   */
  static getClaudeProjectPath(): string {
    if (this.claudeProjectPath) {
      return this.claudeProjectPath;
    }

    // Get current working directory and encode it for Claude's naming convention
    const cwd = process.cwd();
    const encodedPath = cwd.replace(/\//g, '-');
    this.claudeProjectPath = join(homedir(), '.claude', 'projects', encodedPath);

    return this.claudeProjectPath;
  }

  /**
   * Get session-specific log directory (in workspace SESSION_DEPOT_DIR/logs directory)
   */
  static getSessionLogDir(): string {
    return join(process.cwd(), SESSION_DEPOT_DIR, SESSION_LOGS_SUBDIR);
  }

  /**
   * Get session-specific cache directory (in workspace SESSION_DEPOT_DIR/cache directory)
   */
  static getSessionCacheDir(): string {
    return join(process.cwd(), SESSION_DEPOT_DIR, SESSION_CACHE_SUBDIR);
  }

  /**
   * Ensure session directories exist and update .gitignore
   */
  static ensureSessionDirectories(): void {
    const logDir = this.getSessionLogDir();
    const cacheDir = this.getSessionCacheDir();

    mkdirSync(logDir, { recursive: true });
    mkdirSync(cacheDir, { recursive: true });

    // Check and update .gitignore for SESSION_DEPOT_DIR
    this.ensureGitignore();
  }

  /**
   * Ensure SESSION_DEPOT_DIR is in .gitignore
   */
  private static ensureGitignore(): void {
    const gitignorePath = join(process.cwd(), '.gitignore');
    const depotPattern = SESSION_DEPOT_DIR + '/';

    try {
      if (existsSync(gitignorePath)) {
        const content = readFileSync(gitignorePath, 'utf-8');
        const lines = content.split('\n');

        // Check if SESSION_DEPOT_DIR is already ignored
        const hasDepot = lines.some(
          (line) =>
            line.trim() === depotPattern ||
            line.trim() === SESSION_DEPOT_DIR ||
            line.trim() === '/' + SESSION_DEPOT_DIR ||
            line.trim() === '/' + depotPattern
        );

        if (!hasDepot) {
          // Add SESSION_DEPOT_DIR to .gitignore
          const newContent =
            content.trimEnd() + '\n\n# STTS depot (logs & cache)\n' + depotPattern + '\n';
          writeFileSync(gitignorePath, newContent);
        }
      } else {
        // Create .gitignore with SESSION_DEPOT_DIR
        writeFileSync(gitignorePath, '# STTS depot (logs & cache)\n' + depotPattern + '\n');
      }
    } catch (error) {
      // Silently fail if we can't update .gitignore
    }
  }

  /**
   * Get session-specific log file path
   */
  static getSessionLogFile(filename: string): string {
    return join(this.getSessionLogDir(), filename);
  }

  /**
   * Get session-specific cache file path
   */
  static getSessionCacheFile(filename: string): string {
    return join(this.getSessionCacheDir(), filename);
  }

  /**
   * Check if we're in a Claude session by checking if the project directory exists
   */
  static isInClaudeSession(): boolean {
    return existsSync(this.getClaudeProjectPath());
  }
}
