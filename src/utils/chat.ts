import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, isAbsolute } from 'path';
import { SESSION_DEPOT_DIR, SESSION_LOGS_SUBDIR } from '../defaults';

interface ChatMessage {
  role?: string;
  content?: string;
  [key: string]: unknown;
}

export function extractChatFromTranscript(transcriptPath: string): ChatMessage[] | null {
  if (!transcriptPath || typeof transcriptPath !== 'string') {
    return null;
  }

  try {
    if (!existsSync(transcriptPath)) {
      return null;
    }

    const content = readFileSync(transcriptPath, 'utf-8');
    if (!content || content.length === 0) {
      return [];
    }

    const chatData: ChatMessage[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const message = JSON.parse(trimmed) as ChatMessage;
        if (message && typeof message === 'object') {
          chatData.push(message);
        }
      } catch {
        // Skip invalid JSON lines silently
      }
    }

    return chatData;
  } catch (error) {
    // Return null on any file system errors
    return null;
  }
}

export function saveChatToFile(chatData: ChatMessage[], outputPath?: string): void {
  if (!Array.isArray(chatData)) {
    throw new Error('chatData must be an array');
  }

  // Use .stts_depot/logs/chat.json as default
  const defaultPath = join(process.cwd(), SESSION_DEPOT_DIR, SESSION_LOGS_SUBDIR, 'chat.json');
  const basePath = outputPath
    ? isAbsolute(outputPath)
      ? outputPath
      : join(process.cwd(), outputPath)
    : defaultPath;

  const logDir = join(process.cwd(), SESSION_DEPOT_DIR, SESSION_LOGS_SUBDIR);

  try {
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    writeFileSync(basePath, JSON.stringify(chatData, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to save chat: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function extractAndSaveChat(transcriptPath: string): ChatMessage[] | null {
  try {
    const chatData = extractChatFromTranscript(transcriptPath);

    if (!chatData) {
      return null;
    }

    if (chatData.length === 0) {
      return null;
    }

    saveChatToFile(chatData);
    return chatData;
  } catch {
    return null;
  }
}
