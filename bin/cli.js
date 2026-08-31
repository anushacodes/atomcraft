#!/usr/bin/env node
import { Command } from 'commander';
import { initProject } from '../src/commands/init.js';
import { compileCommands } from '../src/commands/compile.js';
import { runImplement } from '../src/commands/implement.js';
import { runNext } from '../src/commands/next.js';
import { showStatus } from '../src/commands/status.js';

const program = new Command();

program
  .name('atomcraft')
  .description('Scaffold spec-driven, atomic-task workflows for any AI coding agent CLI');

program
  .command('init')
  .description('Initialize .atomcraft/ in the current project and compile agent commands')
  .option('--agent <name>', 'force a target agent (claude|cursor|codex|gemini|opencode)')
  .action(initProject);

program
  .command('compile')
  .description('Re-compile command templates for detected/installed agent CLIs')
  .option('--agent <name>', 'force a target agent instead of auto-detecting')
  .action((opts) => compileCommands({ agents: opts.agent ? [opts.agent] : undefined }));

program
  .command('implement <subtaskId>')
  .description('Spawn one fresh, isolated agent process to implement a single atomic subtask')
  .action(runImplement);

program
  .command('next')
  .description('Find the next pending subtask and implement it')
  .action(runNext);

program
  .command('status')
  .description('Show progress across all tasks and subtasks')
  .action(showStatus);

program.parse();
