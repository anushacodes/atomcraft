# atomcraft

Spec-driven, atomic-task scaffolding for AI coding agents. Install once per
project; works across Claude Code, Cursor, Codex CLI, and Gemini CLI.

## How it's different

Existing spec-driven tools (BMAD-METHOD, GitHub Spec-Kit, OpenSpec) scaffold
commands that take you from idea -> spec -> tasks -> implementation. atomcraft
adds two things on top:

1. **Atom-sized tasks by default.** The `atomize` step exists specifically to
   break feature-level tasks into pieces small enough to review in under
   three minutes and commit in under ~100 lines.
2. **Automatic context isolation per subtask.** Instead of relying on one
   long agent session (or you manually starting a new chat), `atomcraft
   implement <subtask-id>` spawns a brand-new OS process running your agent
   CLI, fed nothing but that one subtask file. Fresh process == fresh
   context, with no manual "clear context" step. All state that needs to
   survive between subtasks lives in `.atomcraft/` files, not in any
   session's memory.

## Install

```bash
npm install -g atomcraft   # or: npx atomcraft init
```

## Usage

```bash
cd your-project
atomcraft init        # scaffolds .atomcraft/ and compiles slash commands
                       # for whichever agent CLIs are on your PATH
```

This creates:

```
.atomcraft/
  vision.md
  architecture.md      # written once you run the compiled "architecture" command
  tasks.md             # flat markdown file; all tasks and atomic steps live here
```

and compiles the five workflow commands into whatever format each detected
tool expects, e.g.:

```
.claude/commands/init.md
.claude/commands/architecture.md
.claude/commands/tasks.md
.claude/commands/atomize.md
.claude/commands/implement.md

.gemini/commands/init.toml
...
```

Then, inside your agent CLI:

```
/init            -> writes .atomcraft/vision.md from a conversation
/architecture    -> interviews you on hard vs soft technical constraints
/tasks           -> breaks the architecture into feature-level tasks
/atomize <id>    -> breaks one task into <100-line, <3-minute-review subtasks
```

Then, back in your terminal — this is the part that runs outside any single
agent session:

```bash
atomcraft next             # implements the next pending subtask in a fresh process
atomcraft implement 001b   # or target one specific subtask
atomcraft status           # see what's pending / done / failed
```

After the agent finishes, `atomcraft implement` (and `next`) automatically:

1. Runs `git diff --stat` and prints it for review.
2. Warns if the diff exceeds 100 lines changed; hard-stops if it exceeds 200.
3. Prompts `[a]pprove / [r]eject / [R]edo` — on approve the harness commits
   and marks the step done in `.atomcraft/tasks.md`; reject marks the step
   failed (leaving the working tree as-is for manual review); redo resets the
   step to pending so you can re-run `implement` on it.

Nothing about the implementation step depends on keeping a chat session open.

## Project layout

```
bin/cli.js                 CLI entrypoint (commander)
src/agents.js              detects installed agent CLIs, spawns headless processes
src/state.js                reads/writes .atomcraft/tasks.md (flat markdown)
src/commands/init.js         `atomcraft init`
src/commands/compile.js      compiles neutral templates -> tool-specific command files
src/commands/implement.js    `atomcraft implement <id>` — the isolation trick
src/commands/next.js         `atomcraft next`
src/commands/status.js       `atomcraft status`
templates/commands/*.md      the 5 neutral, tool-agnostic command definitions
```

## Adding support for a new agent CLI

Two places, both small:

1. `src/agents.js` — add an entry to `AGENTS` with the binary name and the
   non-interactive invocation args for that CLI.
2. `src/commands/compile.js` — add an entry to `ADAPTERS` describing where
   that tool looks for custom commands and what format it expects.

Nothing else needs to change — the five templates in `templates/commands/`
are shared by every tool.

## Known rough edges (by design, this is a starting scaffold)

- The exact CLI flags in `src/agents.js` (`-p`, `exec`, etc.) are
  illustrative — verify against each tool's current `--help` output before
  relying on this, since agent CLIs change their flags frequently.
- A preferred-agent config in `.atomcraft/config.json` is not yet implemented
  — `atomcraft implement` picks the first available agent found on PATH.
