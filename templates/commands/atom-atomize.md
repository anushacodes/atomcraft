---
description: Break code tasks in tasks.md into atomic, single-purpose steps
argument-hint: <task-id>
---

Read `.atomcraft/tasks.md` and find the task matching `{{ARG}}`.

If the task is marked `atomic: false` (setup, environment, configuration, scaffolding), do not atomize it. Tell the user it is a single-goal task to be done in one step, then stop.

For `atomic: true` tasks, break the task into the smallest steps that are still independently meaningful. Each atomic step must:
- Touch as few files as possible, ideally one to three
- Produce a diff under roughly 100 lines
- Be reviewable by a human in under three minutes
- Make exactly one logical change with one clear way to verify it

Write the atomic steps directly into the task's section in `.atomcraft/tasks.md`, appended below the task header. Use this format for each step:

```
### <NNNa> — <step name>
status: pending
depends_on: []

**Change:** what exactly to add or modify
**Verify:** the test command or manual check that confirms it works
```

Order the steps by dependency. Show the final list to the user before finishing.
