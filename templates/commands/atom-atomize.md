---
description: Atomize tasks in tasks.md into atomic, single-purpose subtasks (all tasks by default, or a specific task-id)
argument-hint: "[optional: <task-id>]"
---

Read `.atomcraft/tasks.md`.

### Execution Scope:
- If `{{ARG}}` is provided with a specific task ID, process **only** that task.
- If `{{ARG}}` is empty, omitted, or "all", process **ALL** tasks in `.atomcraft/tasks.md` in one complete pass.

### Atomization Rules:
1. **For `atomic: false` tasks** (e.g. scaffolding, config):
   - Wrap it into a single executable atomic step: `### <NNNa> — <Task Name>` so the harness can execute and verify it.
2. **For `atomic: true` tasks** (code, features, logic):
   - Decompose into small, sequential atomic steps (`### <NNNa>`, `### <NNNb>`, etc.).
   - Each step must:
     - Touch at most 1–3 files.
     - Produce a diff under ~100 lines of code.
     - Be reviewable in under 3 minutes.
     - Have an explicit, runnable verification command.
3. **Dependencies:**
   - Steps within a task must list prior step IDs in `depends_on: [...]`.
   - The first step of a task must depend on the final step(s) of any prerequisite tasks.

### Step Format:
Append each step directly under its parent `## <NNN>` header in `.atomcraft/tasks.md`:

```markdown
### <NNNa> — <Step Title>
status: pending
depends_on: []

- **Change:** <Exact concise description of what code to add or modify>
- **Target Files:** `<file1.py>`, `<file2.py>`
- **Verify:** `<exact command to run, e.g. python3 -m unittest tests/test_core.py>`
- **Budget:** <estimated LOC, e.g. ~30 LOC, 1 file>
```

### Final Output:
Write the complete updated `.atomcraft/tasks.md` file. Show the user a brief summary list of all generated subtasks and tell them:
`"All tasks have been atomized. You can now switch to your terminal and run 'atomcraft status' or 'atomcraft next'."`
