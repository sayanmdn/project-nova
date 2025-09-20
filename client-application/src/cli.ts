#!/usr/bin/env node

import { Command } from 'commander';
import { NovaApp } from './app';
import { CLIOptions } from './types';

const program = new Command();

program
  .name('nova-cli')
  .description('Nova Voice Assistant CLI Client')
  .version('1.0.0');

program
  .command('start')
  .description('Start the Nova voice assistant')
  .option('-d, --device <number>', 'Audio device ID to use', parseInt)
  .option('-c, --config <file>', 'Configuration file path')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-s, --server <url>', 'Nova backend server URL')
  .option('--chunk-duration <seconds>', 'Audio chunk duration in seconds', parseFloat)
  .option('--confidence-threshold <value>', 'Wake word confidence threshold', parseFloat)
  .option('--silence-threshold <db>', 'Silence detection threshold in dB', parseInt)
  .action(async (options: CLIOptions) => {
    const app = new NovaApp(options);
    await app.start();
  });

program
  .command('list-devices')
  .description('List available audio input devices')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: CLIOptions) => {
    const app = new NovaApp(options);
    await app.listDevices();
  });

program
  .command('test-audio')
  .description('Test audio device functionality')
  .option('-d, --device <number>', 'Audio device ID to test', parseInt)
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: CLIOptions) => {
    const app = new NovaApp(options);
    await app.testAudio();
  });

program
  .command('version')
  .description('Show version information')
  .action(() => {
    const app = new NovaApp();
    app.showVersion();
  });

// Default command shortcuts
program
  .option('-l, --list-devices', 'List available audio devices')
  .option('-t, --test-audio', 'Test audio setup')
  .option('-h, --help', 'Show help information')
  .action(async (options) => {
    if (options.listDevices) {
      const app = new NovaApp();
      await app.listDevices();
    } else if (options.testAudio) {
      const app = new NovaApp();
      await app.testAudio();
    } else if (options.help) {
      const app = new NovaApp();
      app.showHelp();
    } else {
      // Default action: start the assistant
      const app = new NovaApp(options);
      await app.start();
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('Invalid command. Use --help for available commands.');
  process.exit(1);
});

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  const app = new NovaApp();
  app.showHelp();
}