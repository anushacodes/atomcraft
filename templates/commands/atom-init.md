---
description: Capture a freeform project vision into .atomcraft/vision.md
---

You are helping the user start a new project using atomcraft's workflow.

1. Ask the user, in one open question, what they want to build. Accept any level of detail — a sentence or a paragraph.
2. Do not ask follow-up questions yet. Just capture what they say.
3. Write (or overwrite) `.atomcraft/vision.md` using clean Markdown hierarchy and bullet points:

```markdown
---
status: draft
---

# Vision

## 🎯 Overview
- **Core Goal:** <1 sentence summary>
- **Target Value:** <What problem it solves in 1 bullet>

## 💻 Target CLI Usage
```bash
<example command 1>
<example command 2>
```

## 🔒 Initial Constraints
- **Language / Runtime:** <explicitly stated choice or TBD>
- **Dependencies:** <e.g., standard library only or specific packages>
- **Storage / State:** <e.g., local JSON, SQLite, in-memory>
```

4. Tell the user to run the `/atom-architecture` command next.
