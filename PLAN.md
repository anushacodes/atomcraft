# PLAN.md: Atomic Coding Agent Harness

## 1. Product Vision & Core Philosophy

- **Problem:** Existing agent workflows (BMAD, Spec-Kit, OpenSpec, GSD) generate tasks, PRs, and commits that are too large (300–700+ LOC, 10–15 files), making human review overwhelming and leading to compounding errors in long-horizon tasks.
- **Core Concept:** **Micro-Task / Atomic-Task Driven Development**. The harness operates at the granularity of a disciplined human developer's atomic commit history rather than high-level epics.
- **Review Target:** Each atomic change must require **less than 3 minutes** (ideally 10–60 seconds) of human review.
- **Primary Mechanism:** Spec-driven development defines *what* to build; atomic execution constrains *how much* the model can build at once in a single run.

---

## 2. Hard & Soft Atomicity Constraints

Every atomic task/commit is governed by strict, measurable parameters:

- **Diff Size:** Target <= 100 LOC (Warning: >100 LOC, Hard Stop / Auto-Reject: >200 LOC).
- **File Locality:** <= 3–5 total files touched; <= 2 newly created files; limited to <= 1 subsystem.
- **Conceptual Scope:** Exactly 1 conceptual change per task (e.g., "Add PasswordHasher abstraction", not "Implement authentication").
- **Reviewability:** Reviewer can answer "What am I checking?" within ~10 seconds.
- **Testable Outcome:** 1 explicit unit/integration test outcome per task.
- **Atomicity Score:** Dynamic grading (0–100) assessing:
  - Conceptual scope
  - Diff size
  - File locality
  - Testability
  - Dependency isolation
  - Estimated human review time

---

## 3. Dual-Layer Memory & Context Architecture

- **Ephemeral Memory (LLM Context):**
  - Completely disposable after every atomic task.
  - Contains only: task specification, active constraints, minimal architecture context, dependency outputs, and targeted file snippets.
  - No conversation history survives between tasks.
- **Durable Memory (Filesystem & Harness State):**
  - All state lives externally in the repository and local database, not in LLM memory.
  - Durable artifacts include: specifications, architecture decision records (ADRs), task DAGs, dependency states, git history, and test logs.
- **Context Replacement Primitive:** Context clearing is enforced programmatically by the runtime harness (instantiating a fresh LLM run per task), never by asking the LLM to self-clear.

---

## 4. Workflow & Command Specifications

### `/init` (or `atomic init`)
- Captures freeform project description from the user.
- Initializes `.atomic/` (or `.project/`) directory and git repository.
- Writes initial vision to `vision.md` / `project.yaml`.

### `/technical` (or `atomic technical`)
- Interactive discovery loop (standup/interview mode).
- Extracts and categorizes constraints:
  - **HARD:** Non-negotiable technical choices explicitly stated (e.g., Python, FastAPI, PostgreSQL).
  - **SOFT:** Implied preferences open to suggestion (e.g., minimize dependencies).
  - **OPEN:** Missing decisions identified by LLM (e.g., vector database, queue runner).
- Identifies architectural contradictions and presents concrete options (e.g., Option A vs. B vs. LLM auto-select).
- Outputs finalized `technical.yaml` / `technical.md`.

### `/architecture` (or `atomic architecture`)
- Consumes project vision and technical constraints.
- Generates system architecture documents without generating code:
  - Component models, data flows, system overview.
  - Architecture Decision Records (`ADR-001-*.md`).
- Freezes architectural boundaries.

### `/tasks` (or `atomic tasks`)
- Consumes architecture and requirements.
- Generates high-level macro work packages organized as a Directed Acyclic Graph (DAG) of dependencies.

### `/atomize <task-id>` (or `atomic atomize`)
- The core decomposition engine.
- Breaks macro tasks down into 10–30+ atomic micro-tasks.
- Pre-assigns atomic budgets per subtask:
  - Target LOC, file boundaries, acceptance criteria, specific verification commands (`pytest`, `ruff`, `mypy`), and direct DAG dependencies.

### `/implement <subtask-id>` (or `atomic implement`)
- Automated orchestration step:
  1. Pulls next ready atom from the DAG.
  2. Constructs fresh, isolated context.
  3. Executes coding agent in a clean sandbox/process.
  4. Runs automated tests, linter, and type checker.
  5. Harness inspects `git diff --stat` against atomic constraints.
  6. **If valid:** Passes to human review gate (`[approve]`, `[reject]`, `[redo]`).
  7. **If approved:** Harness creates git commit (agent never commits directly) and marks atom complete.
  8. **If invalid/rejected:** Harness rejects diff and triggers re-atomization / dynamic splitting.

### `/next` (or `atomic status` / `atomic review`)
- Convenience orchestrator: fetches the next ready atom in dependency order and presents pending diffs.

---

## 5. System Architecture & Component Design

```
                 HUMAN (Interactive CLI / Slash Commands)
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
 /init & /technical                                      /architecture
 (Discovery & Constraints)                             (System Design & ADRs)
         │                                                     │
         └──────────────────────────┬──────────────────────────┘
                                    │
                                 /tasks
                         (Macro Work Package DAG)
                                    │
                                    ▼
                                /atomize
                         (Micro-Task Graph Compiler)
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
 Atomic Task 001                                       Atomic Task 002
 [Max 100 LOC, <=3 files]                              [Max 100 LOC, <=3 files]
         │
         ▼
 ┌───────────────────────────┐
 │     HARNESS RUNTIME       │
 │  - Builds isolated context│
 │  - Spawns fresh run       │
 └────────────┬──────────────┘
              │
              ▼
 ┌───────────────────────────┐
 │   AGENT EXECUTION LAYER   │
 │ (OpenAI SDK / CLI Runner) │ ──> [Code Implementation & Local Tests]
 └────────────┬──────────────┘
              │
              ▼
 ┌───────────────────────────┐
 │     HARNESS VALIDATOR     │
 │  - Lint / Typecheck / Test│
 │  - git diff --stat check  │
 └────────────┬──────────────┘
              │
       ┌──────┴──────┐
       │             │
    PASSED     VIOLATION / TOO LARGE
       │             │
       │             ▼
       │    [Re-Atomize Diff / Dynamic Split]
       ▼
 ┌───────────────────────────┐
 │     HUMAN REVIEW GATE     │ < 3 min review
 └────────────┬──────────────┘
              │
          [Approve]
              │
              ▼
 ┌───────────────────────────┐
 │       GIT COMMIT          │ (Harness commits, updates SQLite state,
 └────────────┬──────────────┘  discards LLM conversation)
              │
              ▼
       [Next Fresh Run]
```

---

## 6. Execution Runtime & Tool Integration

- **Pluggable Agent Runtime Interface:**
  The harness state machine is decoupled from the model execution backend via a standardized interface (`AgentRuntime` protocol):
  - `OpenAIAgentsRuntime` (OpenAI Agents SDK / Sandbox Agents / Responses API)
  - `DeepAgentsRuntime` (DeepAgents harness integration)
  - `ClaudeCodeRuntime` (Headless `claude -p` invocation / Subagent Task tool)
  - `CodexRuntime` / `CursorAgentRuntime` / `GeminiCLI`
- **Portability Strategy (Author Once, Compile Many):**
  - Command templates defined in neutral Markdown + frontmatter format.
  - Build-time adapters compile templates into tool-specific command formats (`.claude/commands/*.md`, Cursor rules, Copilot chatmodes).
  - Headless CLI execution ensures isolated, fresh context per task across tools that lack native subagent primitives.

---

## 7. Recommended Directory Layout & Tech Stack

### Technology Stack
- **Language & CLI:** Python, Typer, Rich (terminal UI)
- **Data Validation & Schemas:** Pydantic
- **Git Operations:** GitPython / native git CLI bindings
- **State Storage:** SQLite / JSON-YAML artifacts
- **Initial Agent Runtime:** OpenAI Agents SDK (using stateless runs, bypassing persistent sessions) / headless agent CLI spawning

### Repository Structure

```
atomic/
├── pyproject.toml
├── README.md
└── src/
    └── atomic/
        ├── cli.py                    # Entry point (Typer CLI + interactive loop)
        ├── commands/
        │   ├── init.py               # Project initialization
        │   ├── technical.py          # Interactive technical discovery
        │   ├── architecture.py       # Architecture & ADR generation
        │   ├── tasks.py              # Macro-task DAG creation
        │   ├── atomize.py            # Micro-task breakdown & budget assignment
        │   ├── implement.py          # Fresh-context executor & review loop
        │   └── status.py             # DAG & execution status tracker
        ├── agents/
        │   ├── interviewer.py        # Technical discovery agent
        │   ├── architect.py          # ADR / Architecture agent
        │   ├── atomizer.py           # Task decomposition agent
        │   └── coder.py              # Single-atom implementation agent
        ├── core/
        │   ├── task.py               # Macro task definitions & DAG logic
        │   ├── atom.py               # Atomic task model & constraints schema
        │   ├── project.py            # Project lifecycle management
        │   └── constraints.py        # LOC, file count, and concern limits
        ├── execution/
        │   ├── runtime.py            # Abstract AgentRuntime protocol
        │   ├── openai_sdk.py         # OpenAI Agents SDK adapter
        │   ├── headless_cli.py       # Shell-out adapter (claude -p, etc.)
        │   ├── context.py            # Fresh-context builder per atom
        │   └── sandbox.py            # Filesystem workspace management
        ├── git/
        │   ├── diff.py               # git diff --stat & numstat parser
        │   └── commit.py             # Automated atomic commit generator
        └── validation/
            ├── tests.py              # Pytest / test suite execution
            ├── linter.py             # Ruff / typechecker runners
            └── atomicity.py          # Diff-size gate & atomicity scoring
```

### Generated Target Project Structure (`.atomic/`)

```
target-repo/
├── .atomic/
│   ├── project.yaml                  # Vision & high-level requirements
│   ├── technical.yaml                # Hard/soft constraints & decisions
│   ├── state.db                      # SQLite execution DAG & review logs
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── components.md
│   │   └── decisions/                # ADR-001-*.md
│   ├── tasks/
│   │   └── 001-auth/
│   │       ├── task.yaml             # Macro task definition
│   │       └── atoms/
│   │           ├── 001a-model.yaml   # Status: pending | in_review | done
│   │           ├── 001b-hasher.yaml
│   │           └── 001c-routes.yaml
│   └── results/                      # atom-XXXX-result.yaml diff stats
├── AGENTS.md                         # Coding rules for agents
└── src/
```

---

## 8. Phased Development Roadmap

### Phase 0: V0.1 Proof-of-Concept (The Core Loop)
- **Scope:** ~1,500–2,500 LOC Python.
- **Workflow:** Input pre-written `spec.md` -> `atomic atomize` -> `atomic implement` -> fresh agent run -> test execution -> diff validation (<= 100 LOC gate) -> human approval -> harness git commit -> next fresh agent.
- **Success Gate:** Complete a full multi-step feature without conversation context degradation and with zero manual session resets.

### Phase 1: Interactive Spec & Architecture Discovery
- Implement `/technical` interactive constraint discovery loop.
- Implement `/architecture` ADR generation and validation.
- Implement macro `/tasks` DAG builder with dependency tracking.

### Phase 2: Dynamic Re-Atomization & Closed-Loop Guardrails
- Implement automated task rejection and splitting: when a diff exceeds limits, feed the diff back into `atomizer` to dynamically split the task into 2–4 smaller atoms.
- Implement comprehensive Atomicity Scoring and review time estimation heuristics.

### Phase 3: Multi-Runtime & Benchmark Harness
- Implement runtime adapters for DeepAgents, Claude Code CLI (`claude -p`), and Cursor.
- Add telemetry and evaluation benchmarking across runtimes (token efficiency, diff adherence, task success rate, rework percentage, review duration).
