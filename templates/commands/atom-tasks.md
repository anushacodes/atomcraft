---
description: Break architecture.md into feature-level tasks
---

Read `.atomcraft/vision.md` and `.atomcraft/architecture.md`.

1. Propose the list of tasks needed to deliver the vision. Respect every hard constraint exactly. Use the soft-constraint defaults unless the user says otherwise.
2. Separate tasks into two categories:
   - **Setup tasks** (environment, tooling, dependencies, configuration, project scaffolding). Mark them `atomic: false`.
   - **Code tasks** (features, logic, data models, API endpoints, tests, integrations). Mark them `atomic: true`.
3. Write all tasks into `.atomcraft/tasks.md` using clear visual hierarchy and bullet points:

```markdown
# Tasks

## <NNN> — <Task name>
atomic: true | false
depends_on: []

### 🎯 Summary
<1 direct sentence explaining the purpose of this task>

### 📋 Scope
- **In Scope:**
  - <Specific deliverable 1>
  - <Specific deliverable 2>
- **Out of Scope:**
  - <Explicit non-goal 1>
  - <Explicit non-goal 2>

### ✅ Acceptance Criteria
- [ ] <Observable testable outcome 1>
- [ ] <Observable testable outcome 2>
- [ ] <Observable testable outcome 3>

### 📂 Target Files
- `<path/to/file.py>` — <brief role>
```

4. Do not implement anything yet. Present the task list to the user, get confirmation or edits, and tell them to run `/atom-atomize <task-id>` on code tasks next.
