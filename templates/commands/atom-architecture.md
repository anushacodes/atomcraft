---
description: Interview the user to pin down technical decisions, then write architecture.md
---

Read `.atomcraft/vision.md` first.

1. Extract every technical detail the user already stated (language, framework, hosting, libraries, patterns, style). List each as a **hard constraint** — they already decided it, do not question or second-guess it.
2. Identify anything left ambiguous or unstated that a real architecture needs (data storage, auth strategy, deployment target, testing approach, error handling philosophy, etc). List each as a **soft constraint** with your own recommended default.
3. Ask the user about soft constraints only — one focused round of 2-3 questions at a time, never a long interrogation. Stop once you have enough to proceed confidently; don't manufacture questions for their own sake.
4. Write `.atomcraft/architecture.md` with two clearly labeled sections:
   - `## Hard constraints`
   - `## Soft constraints (defaults chosen, with reasoning)`
5. Show the user the final document, get explicit confirmation, and tell them to run `/atom-tasks` next.
