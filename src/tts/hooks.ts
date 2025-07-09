import { loadTTS } from './index.js';
import { TTSConfig } from './types.js';

export async function ttsNotificationHook(config: TTSConfig = {}): Promise<void> {
  // Read notification data from stdin (Claude Code format)
  const input = await readStdin();

  try {
    const notification = JSON.parse(input);
    const message = notification.message || notification.text || 'Notification received.js';

    const tts = loadTTS(config);
    const success = await tts.speak(message);

    if (!success) {
      console.error('Failed to speak notification');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error processing notification:', error);
    process.exit(1);
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '.js';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}
