---
description: Interview the user to pin down technical decisions, then write architecture.md
---

Read `.atomcraft/vision.md` first.

1. Extract every technical detail the user already stated (language, framework, hosting, libraries, patterns, style). List each as a **hard constraint** — they already decided it, do not question or second-guess it.
2. Identify anything left ambiguous or unstated that a real architecture needs (data storage, auth strategy, deployment target, testing approach, error handling philosophy, etc). List each as a **soft constraint** with your own recommended default.
3. Present the soft constraints to the user in **plain, beginner-friendly language** (explain the real-world impact of each choice without raw jargon like "CWD"):
   - If an interactive `question` tool is available in the environment, use it to present selectable options in the UI.
   - Otherwise, format each decision with clear letter choices:
     ```
     1. <Decision in plain English>
        [A] <Option 1 description> (Default)
        [B] <Option 2 description>
     ```
   - Always include this closing line:
     `"Reply 'ok' to accept all recommended defaults, or pick your choices (e.g., '1B, 2A')."`
   - Limit to 2–3 questions total.
4. Once confirmed, write `.atomcraft/architecture.md` with high visual hierarchy and bullet points:

```markdown
# Architecture

## 🔒 Hard Constraints
- **Language / Runtime:** <Language and minimum version>
- **Dependencies:** <Libraries allowed or stdlib only>
- **Invocation Form:** <How the binary/module is run>
- **CLI Commands:**
  - `<command 1>`: <what it does>
  - `<command 2>`: <what it does>

## ⚙️ Decisions & Soft Constraints
- **Storage Strategy:**
  - *Decision:* <e.g., local `./slugs.json` in current working directory>
  - *Rationale:* <1 sentence why>
- **Collision Handling:**
  - *Decision:* <e.g., keep original, error on conflict>
  - *Rationale:* <1 sentence why>
- **Error Handling & Exit Codes:**
  - *Decision:* <e.g., exit 0 on success, exit 1 + stderr on error>
  - *Rationale:* <1 sentence why>
- **Test Strategy:**
  - *Decision:* <e.g., stdlib unittest with unit + CLI subprocess integration tests>

## 📁 Project Directory Layout
```
<clean ASCII directory tree>
```
```

5. Show the user the summary and tell them to run `/atom-tasks` next.
