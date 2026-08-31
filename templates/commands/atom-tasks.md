---
description: Break architecture.md into feature-level tasks
---

Read `.atomcraft/vision.md` and `.atomcraft/architecture.md`.

1. Propose the list of tasks needed to deliver the vision. Respect every hard constraint exactly. Use the soft-constraint defaults unless the user says otherwise.
2. Separate tasks into two categories:
   - **Setup tasks** (environment, tooling, dependencies, configuration, project scaffolding). These are treated as a single, non-atomized goal each — mark them `atomic: false`. A developer runs them once; they do not need fine-grained review.
   - **Code tasks** (features, logic, data models, API endpoints, tests, integrations). These will be atomized later — mark them `atomic: true`.
3. Write all tasks into a single file `.atomcraft/tasks.md`. Use one section per task with this structure:

```
## <NNN> — <Task name>
atomic: true | false
depends_on: []

**Scope:** what's in and explicitly what's out
**Acceptance criteria:** how to know it's done
**Files/areas:** likely files or areas of the codebase it touches
```

4. Do not implement anything yet. Present the task list to the user, get confirmation or edits, and tell them to run `/atom-atomize <task-id>` on code tasks next.
