#!/usr/bin/env node
import { BaseHook } from './base.js';
import { NotificationEvent } from '../types.js';
import { loadTTS } from '../tts/index.js';
import chalk from 'chalk';

export class NotificationHook extends BaseHook {
  private tts = loadTTS();

  constructor() {
    super('notification');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();
    const event = this.parseInput(input) as NotificationEvent;

    if (!event || !event.message) {
      this.logger.warn('No message in notification event');
      return;
    }

    // Log the notification
    this.logEvent({
      type: 'notification',
      timestamp: new Date().toISOString(),
      data: { ...event },
    });

    // Speak the notification
    try {
      const provider = await this.tts.getProvider();
      if (provider) {
        this.logger.debug(`Using ${provider.name} TTS provider`);
      }

      const success = await this.tts.speak(event.message);

      if (!success) {
        this.logger.warn('TTS failed to speak notification');
      } else {
        this.logger.debug('Notification spoken successfully');
      }
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
      // Don't fail the hook if TTS fails
    }

    // Output to console if in debug mode
    if (process.env.DEBUG) {
      console.log(chalk.blue('📢 Notification:'), event.message);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new NotificationHook();
  void hook.run();
}
