import { extractChatFromTranscript, saveChatToFile, extractAndSaveChat } from '../chat';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { SESSION_DEPOT_DIR, SESSION_LOGS_SUBDIR } from '../../defaults';

const TEST_DIR = join(process.cwd(), 'test-temp');
const TEST_TRANSCRIPT = join(TEST_DIR, 'transcript.jsonl');
const TEST_OUTPUT = join(TEST_DIR, 'chat.json');

describe('chat', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('extractChatFromTranscript', () => {
    it('should return null for invalid input', () => {
      expect(extractChatFromTranscript('')).toBeNull();
      expect(extractChatFromTranscript(null as any)).toBeNull();
      expect(extractChatFromTranscript(undefined as any)).toBeNull();
    });

    it('should return null for non-existent file', () => {
      expect(extractChatFromTranscript('/non/existent/file.jsonl')).toBeNull();
    });

    it('should return empty array for empty file', () => {
      writeFileSync(TEST_TRANSCRIPT, '');
      expect(extractChatFromTranscript(TEST_TRANSCRIPT)).toEqual([]);
    });

    it('should extract valid JSON lines', () => {
      const content = `{"role":"user","content":"Hello"}
{"role":"assistant","content":"Hi there"}
{"role":"user","content":"How are you?"}`;
      writeFileSync(TEST_TRANSCRIPT, content);

      const result = extractChatFromTranscript(TEST_TRANSCRIPT);
      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'How are you?' },
      ]);
    });

    it('should skip invalid JSON lines', () => {
      const content = `{"role":"user","content":"Hello"}
invalid json line
{"role":"assistant","content":"Hi there"}
{ broken json
{"role":"user","content":"How are you?"}`;
      writeFileSync(TEST_TRANSCRIPT, content);

      const result = extractChatFromTranscript(TEST_TRANSCRIPT);
      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'How are you?' },
      ]);
    });

    it('should handle empty lines', () => {
      const content = `{"role":"user","content":"Hello"}

{"role":"assistant","content":"Hi there"}

`;
      writeFileSync(TEST_TRANSCRIPT, content);

      const result = extractChatFromTranscript(TEST_TRANSCRIPT);
      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]);
    });
  });

  describe('saveChatToFile', () => {
    it('should throw for non-array input', () => {
      expect(() => saveChatToFile(null as any)).toThrow('chatData must be an array');
      expect(() => saveChatToFile('string' as any)).toThrow('chatData must be an array');
      expect(() => saveChatToFile({} as any)).toThrow('chatData must be an array');
    });

    it('should save chat data to file', () => {
      const chatData = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ];

      saveChatToFile(chatData, TEST_OUTPUT);

      expect(existsSync(TEST_OUTPUT)).toBe(true);
      const content = readFileSync(TEST_OUTPUT, 'utf-8');
      expect(JSON.parse(content)).toEqual(chatData);
    });

    it('should create .stts_depot/logs directory if it does not exist', () => {
      const depotDir = join(process.cwd(), SESSION_DEPOT_DIR, SESSION_LOGS_SUBDIR);
      const depotDirExisted = existsSync(depotDir);

      saveChatToFile([]);

      expect(existsSync(depotDir)).toBe(true);

      // Clean up if we created it
      const chatPath = join(depotDir, 'chat.json');
      if (!depotDirExisted && existsSync(chatPath)) {
        rmSync(chatPath);
        // Try to clean up the depot dir if it's empty
        try {
          rmSync(join(process.cwd(), SESSION_DEPOT_DIR), { recursive: true });
        } catch {
          // Ignore errors
        }
      }
    });

    it('should use default .stts_depot path when not specified', () => {
      const chatData = [{ role: 'user', content: 'Test' }];
      const defaultPath = join(process.cwd(), SESSION_DEPOT_DIR, SESSION_LOGS_SUBDIR, 'chat.json');

      saveChatToFile(chatData);

      expect(existsSync(defaultPath)).toBe(true);

      // Clean up
      if (existsSync(defaultPath)) {
        rmSync(defaultPath);
        // Try to clean up the depot dir if it's empty
        try {
          rmSync(join(process.cwd(), SESSION_DEPOT_DIR), { recursive: true });
        } catch {
          // Ignore errors
        }
      }
    });
  });

  describe('extractAndSaveChat', () => {
    it('should return null for invalid transcript path', () => {
      expect(extractAndSaveChat('')).toBeNull();
      expect(extractAndSaveChat('/non/existent/file.jsonl')).toBeNull();
    });

    it('should return null for empty transcript', () => {
      writeFileSync(TEST_TRANSCRIPT, '');
      expect(extractAndSaveChat(TEST_TRANSCRIPT)).toBeNull();
    });

    it('should extract and save valid chat', () => {
      const content = `{"role":"user","content":"Hello"}
{"role":"assistant","content":"Hi there"}`;
      writeFileSync(TEST_TRANSCRIPT, content);

      const result = extractAndSaveChat(TEST_TRANSCRIPT);
      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]);

      const savedPath = join(process.cwd(), SESSION_DEPOT_DIR, SESSION_LOGS_SUBDIR, 'chat.json');
      expect(existsSync(savedPath)).toBe(true);

      const savedContent = readFileSync(savedPath, 'utf-8');
      expect(JSON.parse(savedContent)).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]);

      // Clean up
      if (existsSync(savedPath)) {
        rmSync(savedPath);
        // Try to clean up the depot dir if it's empty
        try {
          rmSync(join(process.cwd(), SESSION_DEPOT_DIR), { recursive: true });
        } catch {
          // Ignore errors
        }
      }
    });

    it('should handle errors gracefully', () => {
      // Test with a directory instead of a file
      mkdirSync(join(TEST_DIR, 'not-a-file'), { recursive: true });
      expect(extractAndSaveChat(join(TEST_DIR, 'not-a-file'))).toBeNull();
    });
  });
});
