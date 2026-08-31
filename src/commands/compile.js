import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import { detectAvailableAgents } from '../agents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates', 'commands');

/**
 * One adapter per target tool. Each decides:
 *  - outDir:    where that tool looks for custom commands
 *  - filename:  what extension/naming it expects
 *  - transform: how to reshape the neutral template's frontmatter + body
 *
 * Adding support for a new tool later means adding one entry here —
 * nothing else in the codebase needs to change.
 */
const ARG_SYNTAX = {
  claude: '$ARGUMENTS',
  cursor: '$ARGUMENTS',
  codex: '$ARGUMENTS',
  gemini: '{{USER_INPUT}}',
  opencode: '$ARGUMENTS',
};

const ADAPTERS = {
  opencode: {
    outDir: '.opencode/commands',
    filename: (name) => `${name}.md`,
    transform: (_name, { data, content }) => {
      const body = content.replaceAll('{{ARG}}', ARG_SYNTAX.opencode);
      return matter.stringify(body, {
        description: data.description,
        ...(data['argument-hint'] ? { 'argument-hint': data['argument-hint'] } : {}),
      });
    },
  },
  claude: {
    outDir: '.claude/commands',
    filename: (name) => `${name}.md`,
    transform: (_name, { data, content }) => {
      const body = content.replaceAll('{{ARG}}', ARG_SYNTAX.claude);
      return matter.stringify(body, {
        description: data.description,
        ...(data['argument-hint'] ? { 'argument-hint': data['argument-hint'] } : {}),
      });
    },
  },
  cursor: {
    outDir: '.cursor/commands',
    filename: (name) => `${name}.md`,
    transform: (_name, { data, content }) => {
      const body = content.replaceAll('{{ARG}}', ARG_SYNTAX.cursor);
      return matter.stringify(body, { description: data.description });
    },
  },
  codex: {
    outDir: '.codex/prompts',
    filename: (name) => `${name}.md`,
    // Codex CLI prompts are plain markdown bodies, no frontmatter needed.
    transform: (_name, { content }) => content.replaceAll('{{ARG}}', ARG_SYNTAX.codex),
  },
  gemini: {
    outDir: '.gemini/commands',
    filename: (name) => `${name}.toml`,
    // Gemini CLI custom commands are TOML, not markdown — a real format
    // difference, which is exactly why this compile step needs to exist
    // instead of just copying one file everywhere.
    transform: (_name, { data, content }) => {
      const body = content.replaceAll('{{ARG}}', ARG_SYNTAX.gemini);
      const escaped = body.replace(/"""/g, '\\"\\"\\"');
      return `description = "${(data.description || '').replace(/"/g, '\\"')}"\nprompt = """\n${escaped}\n"""\n`;
    },
  },
};

export async function compileCommands(opts = {}) {
  const agents = opts.agents || (await detectAvailableAgents());

  if (agents.length === 0) {
    console.log('No agents to compile for. Pass --agent <name> or install a supported CLI.');
    return;
  }

  const templateFiles = (await fs.readdir(TEMPLATES_DIR)).filter((f) => f.endsWith('.md'));

  for (const agentKey of agents) {
    const adapter = ADAPTERS[agentKey];
    if (!adapter) {
      console.log(`No adapter yet for "${agentKey}" — skipping. (Add one in src/commands/compile.js.)`);
      continue;
    }

    await fs.ensureDir(adapter.outDir);

    for (const file of templateFiles) {
      const name = file.replace(/\.md$/, '');
      const raw = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf8');
      const parsed = matter(raw);
      const compiled = adapter.transform(name, parsed);
      const outPath = path.join(adapter.outDir, adapter.filename(name));
      await fs.writeFile(outPath, compiled);
    }

    console.log(`Compiled ${templateFiles.length} commands for ${agentKey} -> ${adapter.outDir}/`);
  }
}
