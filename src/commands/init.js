import fs from 'fs-extra';
import { detectAvailableAgents } from '../agents.js';
import { ensureScaffold, paths } from '../state.js';
import { compileCommands } from './compile.js';

export async function initProject(opts = {}) {
  await ensureScaffold();

  const { vision } = paths();
  if (!(await fs.pathExists(vision))) {
    await fs.writeFile(
      vision,
      [
        '---',
        'status: draft',
        '---',
        '',
        '# Vision',
        '',
        'Describe what you want to build, in your own words.',
        'Run the compiled "/atom-init" slash command inside your agent CLI to fill this in properly.',
        '',
      ].join('\n')
    );
  }

  const agents = opts.agent ? [opts.agent] : await detectAvailableAgents();

  if (agents.length === 0) {
    console.log('No supported agent CLIs found on PATH (opencode, claude, cursor-agent, codex, gemini).');
    console.log('Install one of these, or re-run with --agent <name> to force compilation for it.');
  } else {
    console.log(`Detected agent CLIs: ${agents.join(', ')}`);
    await compileCommands({ agents });
  }

  console.log('\n.atomcraft/ scaffolded.');
  console.log('Next: open your agent CLI and run "/atom-init", then "/atom-architecture".');
}
