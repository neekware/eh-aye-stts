#!/usr/bin/env node
import { BaseHook } from './base';
import { NotificationEvent } from '../types';
import { detectEmotion, Emotion } from '../../../tts/index';
import { announceIfEnabled } from '../../../tts/announce';
import chalk from 'chalk';
import { debugLogger } from '../../../utils/debug-logger';

export class NotificationHook extends BaseHook {
  constructor() {
    super('notification');
  }

  async execute(): Promise<void> {
    const input = await this.readStdin();

    // If no input (e.g., run manually), exit gracefully
    if (!input) {
      return;
    }

    const event = this.parseInput(input) as NotificationEvent;

    debugLogger.hook('notification', 'execute', { event });

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

    // Generate or use the notification message
    const message = this.generateMessage(event);
    const emotion = this.detectNotificationEmotion(event);

    // Speak the notification
    try {
      this.logger.debug(`Using emotion: ${emotion}`);
      await announceIfEnabled(message, emotion);
    } catch (error) {
      this.logger.error(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
      // Don't fail the hook if TTS fails
    }

    // Output to console if in debug mode
    if (process.env.DEBUG) {
      console.log(chalk.blue('📢 Notification:'), event.message);
    }
  }

  private generateMessage(event: NotificationEvent): string {
    // Simply return the original message
    return event.message;
  }

  private detectNotificationEmotion(event: NotificationEvent): Emotion {
    // Check if the event has metadata indicating emotion
    if (event.metadata?.emotion) {
      return event.metadata.emotion as Emotion;
    }

    // Check for specific event types if available
    // Note: event.type contains notification types (not emotions)
    // We map these notification types to appropriate emotions
    if (event.type) {
      switch (event.type) {
        case 'success':
        case 'complete':
          return 'cheerful';
        case 'error':
        case 'failure':
          return 'disappointed';
        case 'warning':
        case 'blocked':
          return 'urgent';
        case 'info':
          return 'neutral';
        // Add more event type mappings as needed
      }
    }

    // Fall back to content-based detection
    return detectEmotion(event.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new NotificationHook();
  void hook.run();
}
