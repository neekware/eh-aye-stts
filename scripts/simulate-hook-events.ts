#!/usr/bin/env tsx
import { spawn } from 'child_process';
import { join } from 'path';
import chalk from 'chalk';
import { PostToolUseEvent, StopEvent, SubagentStopEvent } from '../src/plugins/claude-code/types';

interface HookSimulation {
  name: string;
  hookPath: string;
  eventData: any;
}

class HookEventSimulator {
  private hookDir = join(process.cwd(), 'src/plugins/claude-code/hooks');

  async simulateEvent(hookPath: string, eventData: any): Promise<void> {
    console.log(chalk.yellow(`Simulating event for ${hookPath}...`));
    console.log(chalk.gray('Event data:', JSON.stringify(eventData, null, 2)));

    return new Promise((resolve, reject) => {
      const hook = spawn('tsx', [hookPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          DEBUG: '1', // Enable debug logging
        },
      });

      // Send event data to stdin
      hook.stdin.write(JSON.stringify(eventData));
      hook.stdin.end();

      let stdout = '';
      let stderr = '';

      hook.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      hook.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      hook.on('close', (code) => {
        if (stdout) {
          console.log(chalk.green('STDOUT:'));
          console.log(stdout);
        }
        if (stderr) {
          console.log(chalk.yellow('STDERR:'));
          console.log(stderr);
        }

        if (code === 0) {
          console.log(chalk.green(`✓ Hook executed successfully (exit code: ${code})`));
          resolve();
        } else {
          console.log(chalk.red(`✗ Hook failed (exit code: ${code})`));
          reject(new Error(`Hook exited with code ${code}`));
        }
      });

      hook.on('error', (err) => {
        console.log(chalk.red('Failed to spawn hook:', err));
        reject(err);
      });
    });
  }

  getSimulations(): HookSimulation[] {
    return [
      {
        name: 'Post-tool-use: Successful npm test',
        hookPath: join(this.hookDir, 'post-tool-use.ts'),
        eventData: {
          tool: 'Bash',
          args: { command: 'npm test' },
          result: '✓ All tests passed (25 tests, 100ms)',
          exitCode: 0,
          duration: 3500,
        } as PostToolUseEvent,
      },
      {
        name: 'Post-tool-use: Failed build',
        hookPath: join(this.hookDir, 'post-tool-use.ts'),
        eventData: {
          tool: 'Bash',
          args: { command: 'npm run build' },
          result: 'ERROR: TypeScript compilation failed\n  src/index.ts(10,5): error TS2322',
          exitCode: 1,
          duration: 2100,
        } as PostToolUseEvent,
      },
      {
        name: 'Post-tool-use: Long npm install',
        hookPath: join(this.hookDir, 'post-tool-use.ts'),
        eventData: {
          tool: 'Bash',
          args: { command: 'npm install' },
          result: 'added 1523 packages, and audited 1524 packages in 45s',
          exitCode: 0,
          duration: 45000,
        } as PostToolUseEvent,
      },
      {
        name: 'Post-tool-use: Documentation update',
        hookPath: join(this.hookDir, 'post-tool-use.ts'),
        eventData: {
          tool: 'Write',
          args: {
            file_path: '/path/to/docs/CONTRIBUTING.md',
            content: 'Added comprehensive section on act workflow and examples...',
          },
          result: 'File written successfully',
          exitCode: 0,
          duration: 250,
        } as PostToolUseEvent,
      },
      {
        name: 'Stop: Productive session',
        hookPath: join(this.hookDir, 'stop.ts'),
        eventData: {
          exitCode: 0,
          // Note: The hook will load additional context from logs
        } as StopEvent,
      },
      {
        name: 'Subagent-stop: Task completed',
        hookPath: join(this.hookDir, 'subagent-stop.ts'),
        eventData: {
          taskDescription: 'Implemented user authentication with JWT tokens',
          duration: 180000, // 3 minutes
          success: true,
        } as SubagentStopEvent,
      },
    ];
  }

  async runAll(): Promise<void> {
    console.log(chalk.blue('🎭 Hook Event Simulator'));
    console.log(chalk.gray('='.repeat(50)));

    const simulations = this.getSimulations();

    for (const simulation of simulations) {
      console.log(chalk.blue(`\n\n📌 ${simulation.name}`));
      console.log(chalk.gray('-'.repeat(50)));

      try {
        await this.simulateEvent(simulation.hookPath, simulation.eventData);
      } catch (error) {
        console.log(chalk.red('Simulation failed:', error));
      }

      // Wait a bit between simulations
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(chalk.blue('\n\n📊 Simulation Complete'));
    console.log(chalk.gray('Check logs at: ~/.stts/logs/<project-name>/'));
  }
}

// Run the simulator
if (import.meta.url === `file://${process.argv[1]}`) {
  const simulator = new HookEventSimulator();
  simulator.runAll().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}
