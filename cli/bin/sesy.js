#!/usr/bin/env node

/**
 * sesy — sesy.js
 * CLI entry point that configures commander and delegates to command handlers.
 */

import process from 'node:process';
import { Command } from 'commander';
import { runDoctorCommand } from '../src/commands/doctor.js';
import { runInitCommand } from '../src/commands/init.js';
import { runStatusCommand } from '../src/commands/status.js';
import { runWatchCommand } from '../src/commands/watch.js';
import { registerGlobalErrorHandlers } from '../src/utils/globalErrorHandler.js';
import { ensureFirstRunExperience } from '../src/utils/firstRun.js';

registerGlobalErrorHandlers();
await ensureFirstRunExperience();

const program = new Command();

program
  .name('sesy')
  .description('Run your remote Electron app locally — instantly.')
  .version('0.1.0')
  .helpOption('-h, --help', 'Display help for sesy or a specific command.')
  .showHelpAfterError('(run with --help for usage details)');

program
  .command('init')
  .description('Create a .sesy.json config file in the current directory.')
  .option('--port <number>', 'Dev server port (default: 8000)', Number)
  .option('--force', 'Overwrite an existing .sesy.json without asking.')
  .action(async (options) => runInitCommand(options));

program
  .command('watch')
  .description('Watch a local forwarded port and open a local Electron window.')
  .option('--port <number>', 'Port to watch (overrides config)', Number)
  .option('--width <number>', 'Window width', Number)
  .option('--height <number>', 'Window height', Number)
  .option('--timeout <number>', 'Seconds to wait before giving up (default: 60)', Number)
  .option('--keep-watching', 'Re-launch Electron if the window closes.')
  .option('--no-color', 'Disable colored output.')
  .action(async (options) => {
    if (options.color === false) {
      process.env.NO_COLOR = '1';
    }

    await runWatchCommand(options);
  });

program
  .command('status')
  .description('Print configuration and environment diagnostics.')
  .action(async () => runStatusCommand());

program
  .command('doctor')
  .description('Run setup health checks and show fix hints.')
  .action(async () => runDoctorCommand());

await program.parseAsync(process.argv);
