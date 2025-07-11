import { readFileSync, existsSync } from 'fs';
import { debugLogger } from '../utils/debug-logger';
import { MessageCache } from './message-cache';

export interface TranscriptMessage {
  parentUuid: string;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  type: string;
  message?: {
    id: string;
    type: string;
    role: string;
    model: string;
    content: Array<{
      type: string;
      text?: string;
    }>;
    stop_reason?: string | null;
    stop_sequence?: string | null;
    usage?: {
      input_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens: number;
      service_tier?: string;
    };
  };
  content?: string;
  uuid: string;
  timestamp: string;
  requestId?: string;
  level?: string;
  isMeta?: boolean;
}

export class TranscriptParser {
  private static readonly CACHE_PREFIX = 'transcript:';
  private static readonly MAX_MESSAGES_TO_SCAN = 100;

  /**
   * Read and parse a Claude transcript file
   */
  static readTranscript(transcriptPath: string): TranscriptMessage[] {
    debugLogger.info('TranscriptParser', 'readTranscript', `Reading transcript: ${transcriptPath}`);

    if (!existsSync(transcriptPath)) {
      debugLogger.warn('TranscriptParser', 'readTranscript', 'Transcript file not found');
      return [];
    }

    try {
      const content = readFileSync(transcriptPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      const messages: TranscriptMessage[] = [];

      for (const line of lines) {
        try {
          const message = JSON.parse(line) as TranscriptMessage;
          messages.push(message);
        } catch (error) {
          debugLogger.warn('TranscriptParser', 'parseLine', 'Failed to parse line', {
            line,
            error,
          });
        }
      }

      debugLogger.info('TranscriptParser', 'readTranscript', `Parsed ${messages.length} messages`);
      return messages;
    } catch (error) {
      debugLogger.error('TranscriptParser', 'readTranscript', 'Failed to read transcript', {
        error,
      });
      return [];
    }
  }

  /**
   * Extract the last assistant message text from a transcript
   */
  static getLastAssistantMessage(transcriptPath: string): string | null {
    // Check cache first
    const cacheKey = `${this.CACHE_PREFIX}${transcriptPath}`;
    const cached = MessageCache.get(cacheKey);
    if (cached) {
      debugLogger.cache('transcript_cache_hit', { transcriptPath });
      return cached;
    }

    const messages = this.readTranscript(transcriptPath);

    // Scan from the end, looking for assistant messages
    for (
      let i = messages.length - 1;
      i >= Math.max(0, messages.length - this.MAX_MESSAGES_TO_SCAN);
      i--
    ) {
      const msg = messages[i];

      // Check for assistant messages with content
      if (msg.type === 'assistant' && msg.message?.content) {
        const textContent = msg.message.content.find((c) => c.type === 'text' && c.text);
        if (textContent?.text) {
          const text = textContent.text.trim();

          // Skip only empty messages, allow all non-empty messages
          if (text.length > 0) {
            debugLogger.info(
              'TranscriptParser',
              'getLastAssistantMessage',
              'Found assistant message',
              {
                messageId: msg.message.id,
                textLength: text.length,
                textPreview: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
                fullMessage: text, // Log full message in debug
              }
            );

            // Cache the result
            MessageCache.set(cacheKey, text);
            return text;
          }
        }
      }
    }

    debugLogger.info(
      'TranscriptParser',
      'getLastAssistantMessage',
      'No suitable assistant message found'
    );
    return null;
  }

  /**
   * Extract context from recent messages for better LLM understanding
   */
  static getRecentContext(transcriptPath: string, maxMessages: number = 5): string[] {
    const messages = this.readTranscript(transcriptPath);
    const context: string[] = [];

    // Get last N messages that have meaningful content
    for (let i = messages.length - 1; i >= 0 && context.length < maxMessages; i--) {
      const msg = messages[i];

      // Include user messages
      if (msg.type === 'user' && msg.content) {
        context.unshift(`User: ${msg.content.substring(0, 100)}...`);
      }

      // Include assistant messages
      if (msg.type === 'assistant' && msg.message?.content) {
        const textContent = msg.message.content.find((c) => c.type === 'text' && c.text);
        if (textContent?.text) {
          context.unshift(`Assistant: ${textContent.text.substring(0, 100)}...`);
        }
      }

      // Include relevant system messages (like tool use results)
      if (msg.type === 'system' && msg.content && !msg.isMeta) {
        if (msg.content.includes('completed') || msg.content.includes('failed')) {
          context.unshift(`System: ${msg.content.substring(0, 100)}...`);
        }
      }
    }

    debugLogger.info(
      'TranscriptParser',
      'getRecentContext',
      `Extracted ${context.length} context messages`
    );
    return context;
  }

  /**
   * Extract session statistics from transcript
   */
  static getSessionStats(transcriptPath: string): {
    messageCount: number;
    assistantMessageCount: number;
    userMessageCount: number;
    duration: number;
    hasErrors: boolean;
  } {
    const messages = this.readTranscript(transcriptPath);

    if (messages.length === 0) {
      return {
        messageCount: 0,
        assistantMessageCount: 0,
        userMessageCount: 0,
        duration: 0,
        hasErrors: false,
      };
    }

    const firstTimestamp = new Date(messages[0].timestamp).getTime();
    const lastTimestamp = new Date(messages[messages.length - 1].timestamp).getTime();
    const duration = lastTimestamp - firstTimestamp;

    let assistantMessageCount = 0;
    let userMessageCount = 0;
    let hasErrors = false;

    for (const msg of messages) {
      if (msg.type === 'assistant') assistantMessageCount++;
      if (msg.type === 'user') userMessageCount++;
      if (msg.content?.includes('error') || msg.content?.includes('failed')) {
        hasErrors = true;
      }
    }

    const stats = {
      messageCount: messages.length,
      assistantMessageCount,
      userMessageCount,
      duration,
      hasErrors,
    };

    debugLogger.info('TranscriptParser', 'getSessionStats', 'Session statistics', stats);
    return stats;
  }
}
