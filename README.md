# atomcraft

Spec-driven, atomic-task scaffolding for AI coding agents. Install once per project; works across Claude Code, Cursor, Codex CLI, and Gemini CLI.

## Overview

atomcraft structures AI-assisted development into small, reviewable steps. It captures project vision and architecture as files, breaks work into atomic subtasks, and executes each subtask in an isolated agent process with built-in review gates.

Each subtask is scoped to be reviewable in under 3 minutes and committable in under ~100 lines.

## Features

- **Spec-driven workflow** — vision, architecture, and tasks stored as versioned files in `.atomcraft/`
- **Atomic decomposition** — feature tasks broken into small subtasks with explicit acceptance criteria
- **Isolated execution** — each subtask runs in a fresh agent process with no shared session memory
- **Cross-tool support** — compiles workflow commands for detected agent CLIs from a single set of templates
- **Review gates** — diff size checks and approve/reject/redo flow before any commit
- **File-based state** — all progress tracked in `.atomcraft/tasks.md`, no external database required

## Requirements

- Node.js >= 18

## Installation

```bash
npm install -g atomcraft
```

Or run without installing:

```bash
npx atomcraft init
```

## Quick Start

```bash
cd your-project
atomcraft init
```

This scaffolds the project state and compiles workflow commands for any agent CLI found on your `PATH`:

```
.atomcraft/
  vision.md
  architecture.md
  tasks.md

.claude/commands/*.md
.cursor/commands/*
.gemini/commands/*.toml
# ... depending on detected tools
```

## Workflow

Run these commands inside your agent CLI:

| Command | Description |
|---------|-------------|
| `/init` | Capture project vision into `.atomcraft/vision.md` |
| `/architecture` | Define technical constraints and system architecture |
| `/tasks` | Generate feature-level tasks from the architecture |
| `/atomize <id>` | Break a task into atomic subtasks (<100 lines, <3 min review) |

Execute subtasks from your terminal, outside the agent session:

```bash
atomcraft status              # show pending / done / failed subtasks
atomcraft next                # run the next pending subtask
atomcraft implement 001b      # run a specific subtask
```

After each run, atomcraft:

1. Prints `git diff --stat`
2. Warns if the diff exceeds 100 lines, stops if it exceeds 200
3. Prompts `[a]pprove / [r]eject / [R]edo`

- **Approve** — commits the change and marks the subtask done
- **Reject** — marks the subtask failed, leaves the working tree for manual review
- **Redo** — resets the subtask to pending for re-execution

## CLI Reference

```
atomcraft init [--agent <name>]        Initialize .atomcraft/ and compile commands
atomcraft compile [--agent <name>]     Re-compile command templates for detected CLIs
atomcraft implement <subtaskId>        Run a single subtask in an isolated process
atomcraft next                         Run the next pending subtask
atomcraft status                       Show progress across tasks and subtasks
```

Supported `--agent` values: `claude`, `cursor`, `codex`, `gemini`, `opencode`

## How It Works

`atomcraft implement` and `atomcraft next` spawn a new OS process running your agent CLI with only the target subtask file as context. This guarantees a fresh context per subtask without manual session resets. All durable state — specs, task definitions, and progress — lives on the filesystem in `.atomcraft/`.

## Project Structure

```
bin/cli.js                      CLI entrypoint
src/agents.js                   Agent detection and headless process spawning
src/state.js                    Reads/writes .atomcraft/tasks.md
src/commands/init.js            `atomcraft init`
src/commands/compile.js         Compiles templates to tool-specific formats
src/commands/implement.js       `atomcraft implement <id>`
src/commands/next.js            `atomcraft next`
src/commands/status.js          `atomcraft status`
templates/commands/*.md         Tool-agnostic command definitions
```

## Adding a New Agent

1. `src/agents.js` — add an entry to `AGENTS` with the binary name and headless invocation args
2. `src/commands/compile.js` — add an entry to `ADAPTERS` with the command path and file format

No changes to `templates/commands/` are required.

## License

MIT
