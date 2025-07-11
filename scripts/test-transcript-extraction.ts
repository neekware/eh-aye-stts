#!/usr/bin/env tsx
import { TranscriptParser } from '../src/services/transcript-parser';
import { debugLogger } from '../src/utils/debug-logger';
import chalk from 'chalk';

// Enable debug mode
process.env.DEBUG = '1';

async function testTranscriptExtraction() {
  console.log(chalk.blue('🔍 Testing Transcript Extraction\n'));

  // Look for the most recent transcript file from stop.json
  const stopLogPath = '/Users/val/.stts/logs/eh-aye-stts/stop.json';

  try {
    const fs = await import('fs');
    const stopLog = fs.readFileSync(stopLogPath, 'utf-8');
    const lines = stopLog.split('\n').filter((line) => line.trim());
    const entries = lines.map((line) => JSON.parse(line));

    if (entries.length === 0) {
      console.log(chalk.yellow('No stop events found in log'));
      return;
    }

    // Get the most recent entry with a transcript_path
    const recentEntry = entries.reverse().find((entry: any) => entry.data?.transcript_path);

    if (!recentEntry) {
      console.log(chalk.yellow('No stop events with transcript_path found'));
      return;
    }

    const transcriptPath = recentEntry.data.transcript_path;
    console.log(chalk.green(`✓ Found transcript: ${transcriptPath}`));
    console.log(chalk.gray(`  Session ID: ${recentEntry.data.session_id}`));
    console.log(chalk.gray(`  Timestamp: ${recentEntry.timestamp}\n`));

    // Test transcript parsing
    console.log(chalk.blue('📄 Parsing Transcript...'));
    const lastMessage = TranscriptParser.getLastAssistantMessage(transcriptPath);

    if (lastMessage) {
      console.log(chalk.green('✓ Found last assistant message:'));
      console.log(chalk.white('  ' + lastMessage.substring(0, 200) + '...'));
    } else {
      console.log(chalk.yellow('⚠ No assistant message found'));
    }

    // Test session stats
    console.log(chalk.blue('\n📊 Session Statistics:'));
    const stats = TranscriptParser.getSessionStats(transcriptPath);
    console.log(chalk.white(`  Total messages: ${stats.messageCount}`));
    console.log(chalk.white(`  Assistant messages: ${stats.assistantMessageCount}`));
    console.log(chalk.white(`  User messages: ${stats.userMessageCount}`));
    console.log(chalk.white(`  Duration: ${Math.round(stats.duration / 1000)}s`));
    console.log(chalk.white(`  Has errors: ${stats.hasErrors ? 'Yes' : 'No'}`));

    // Test context extraction
    console.log(chalk.blue('\n🔗 Recent Context:'));
    const context = TranscriptParser.getRecentContext(transcriptPath, 3);
    context.forEach((msg, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${msg}`));
    });

    // Show debug log location
    console.log(chalk.blue('\n📝 Debug Log:'));
    console.log(chalk.white(`  ${debugLogger.getLogPath()}`));
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
}

// Run the test
testTranscriptExtraction().catch(console.error);
