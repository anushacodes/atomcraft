---
description: Implement exactly one atomic step, then stop
argument-hint: <step-id>
---

Read `.atomcraft/tasks.md` and find the atomic step matching `{{ARG}}`. Do not read other steps, other tasks, or any prior conversation — you are intentionally starting with a clean slate, and that step is your entire brief. If you need more context, read only the specific source files it names.

1. Implement the single change described in the step.
2. Run whatever verification the step specifies.
3. Report a short summary of what you changed and what the verify command returned, then stop. Do not commit. Do not proceed to another step.
