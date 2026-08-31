import { execa } from 'execa';

/**
 * Each entry describes one supported agent CLI:
 *  - binary:    the executable name to look for on PATH
 *  - buildArgs: how to invoke it non-interactively with a single prompt file
 *
 * IMPORTANT: the exact flags below are illustrative starting points, not
 * guaranteed-current syntax. Each of these CLIs evolves quickly — before
 * relying on this in production, run `<binary> --help` yourself and adjust
 * buildArgs to match. The architectural point that matters is the pattern:
 * one fresh OS process per subtask == fresh context, with no in-app
 * "clear context" step required.
 */
const AGENTS = {
  claude: {
    label: 'Claude Code',
    binary: 'claude',
    buildArgs: (promptPath) => ['-p', `@${promptPath}`, '--permission-mode', 'acceptEdits'],
  },
  codex: {
    label: 'OpenAI Codex CLI',
    binary: 'codex',
    buildArgs: (promptPath) => ['exec', `@${promptPath}`],
  },
  gemini: {
    label: 'Gemini CLI',
    binary: 'gemini',
    buildArgs: (promptPath) => ['-p', `@${promptPath}`, '-y'],
  },
  opencode: {
    label: 'OpenCode CLI',
    binary: 'opencode',
    buildArgs: (promptPath) => [
      'run',
      '--auto',
      '--file',
      promptPath,
      'Implement the task in the attached file. Run verification and report summary. Do not commit.',
    ],
  },
  cursor: {
    label: 'Cursor Agent CLI',
    binary: 'cursor-agent',
    buildArgs: (promptPath) => ['-p', `@${promptPath}`],
  },
};

export function listKnownAgents() {
  return Object.keys(AGENTS);
}

export function getAgent(key) {
  const def = AGENTS[key];
  if (!def) {
    throw new Error(`Unknown agent "${key}". Known agents: ${listKnownAgents().join(', ')}`);
  }
  return def;
}

export async function detectAvailableAgents() {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  const available = [];
  for (const [key, def] of Object.entries(AGENTS)) {
    try {
      await execa(checker, [def.binary]);
      available.push(key);
    } catch {
      // not on PATH — skip silently, this is expected for most users
    }
  }
  return available;
}

/**
 * Spawn ONE fresh process for ONE subtask. This is the whole trick behind
 * "automatic context clearing": nothing is reused between subtasks because
 * nothing CAN be reused across separate OS processes. All shared state must
 * live in files under .atomcraft/, which is exactly what the prompt file
 * (the subtask markdown) provides.
 */
export async function spawnHeadlessAgent(agentKey, promptPath, { cwd }) {
  const def = getAgent(agentKey);
  const args = def.buildArgs(promptPath);

  const subprocess = execa(def.binary, args, { cwd, reject: false });
  subprocess.stdout?.pipe(process.stdout);
  subprocess.stderr?.pipe(process.stderr);

  const result = await subprocess;
  return { exitCode: result.exitCode };
}
