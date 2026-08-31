import fs from 'fs-extra';
import path from 'path';

const ROOT = '.atomcraft';

export function paths() {
  return {
    root: ROOT,
    vision: path.join(ROOT, 'vision.md'),
    architecture: path.join(ROOT, 'architecture.md'),
    tasks: path.join(ROOT, 'tasks.md'),
  };
}

export async function ensureScaffold() {
  await fs.ensureDir(paths().root);
}

/**
 * Parse a raw `tasks.md` string into an array of step objects.
 *
 * The format interleaves two heading levels:
 *   ## <taskId> — <taskTitle>      ← task block (atomic: true|false)
 *   ### <stepId> — <stepTitle>     ← step block (status:, depends_on:)
 *
 * Inline metadata fields (`status:`, `depends_on:`, `atomic:`) appear as
 * plain-text lines at the top of each section body — NOT as YAML frontmatter.
 *
 * Returns only step (`###`) objects; task (`##`) sections provide context.
 */
export function parseTasksFile(raw) {
  const lines = raw.split('\n');

  // Split into sections keyed by their heading line index.
  // Each section: { level: 2|3, heading, startLine, lines[] }
  const sections = [];
  for (let i = 0; i < lines.length; i++) {
    const h2 = lines[i].match(/^##\s+(.+)/);
    const h3 = lines[i].match(/^###\s+(.+)/);
    if (h2 && !h3) {
      sections.push({ level: 2, heading: h2[1].trim(), lines: [] });
    } else if (h3) {
      sections.push({ level: 3, heading: h3[1].trim(), lines: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1].lines.push(lines[i]);
    }
  }

  // Walk sections, tracking current task context, emit step objects.
  const steps = [];
  let currentTaskId = null;
  let currentTaskTitle = null;

  for (const section of sections) {
    if (section.level === 2) {
      // ## <taskId> — <taskTitle>
      const match = section.heading.match(/^(\S+)\s*[—-]\s*(.+)/);
      currentTaskId = match ? match[1].trim() : section.heading;
      currentTaskTitle = match ? match[2].trim() : section.heading;
      continue;
    }

    // level === 3: ### <stepId> — <stepTitle>
    const match = section.heading.match(/^(\S+)\s*[—-]\s*(.+)/);
    const id = match ? match[1].trim() : section.heading;
    const title = match ? match[2].trim() : section.heading;

    // Extract inline metadata from the top lines of the body.
    let status = 'pending';
    let depends_on = [];
    const bodyLines = section.lines;

    for (const line of bodyLines) {
      const statusMatch = line.match(/^status:\s*(.+)/);
      if (statusMatch) {
        status = statusMatch[1].trim();
        continue;
      }
      const depsMatch = line.match(/^depends_on:\s*(\[.*\])/);
      if (depsMatch) {
        try {
          depends_on = JSON.parse(depsMatch[1]);
        } catch {
          // malformed — leave as []
        }
        continue;
      }
    }

    steps.push({
      id,
      title,
      taskId: currentTaskId,
      taskTitle: currentTaskTitle,
      status,
      depends_on,
      // Full body text (everything between this ### and the next heading).
      body: bodyLines.join('\n').trimEnd(),
    });
  }

  return steps;
}

/**
 * Read `.atomcraft/tasks.md` and return the parsed array of step objects.
 * Returns `[]` if the file does not exist yet.
 */
export async function listSteps() {
  const { tasks } = paths();
  if (!(await fs.pathExists(tasks))) return [];
  const raw = await fs.readFile(tasks, 'utf8');
  return parseTasksFile(raw);
}

/** Find a step by id. Throws a descriptive error if not found. */
export async function getStep(id) {
  const all = await listSteps();
  const found = all.find((s) => s.id === id);
  if (!found) {
    throw new Error(`Step "${id}" not found in .atomcraft/tasks.md`);
  }
  return found;
}

/**
 * Update the `status:` line for the given step id in-place and write the file
 * back. Only the matching line inside the correct `###` section is touched;
 * all other content is preserved verbatim.
 */
export async function setStepStatus(stepId, status) {
  const { tasks } = paths();
  const raw = await fs.readFile(tasks, 'utf8');
  const lines = raw.split('\n');

  // Find the ### heading line for this step.
  const stepHeadingRe = new RegExp(`^###\\s+${escapeRegex(stepId)}\\s*[—-]`);
  let inTargetSection = false;
  let statusLineReplaced = false;

  const updated = lines.map((line) => {
    // Entering this step's section.
    if (stepHeadingRe.test(line)) {
      inTargetSection = true;
      statusLineReplaced = false;
      return line;
    }

    // Leaving this section on the next heading at any level.
    if (inTargetSection && /^#{2,}\s/.test(line)) {
      inTargetSection = false;
    }

    // Replace the first `status:` line we encounter inside the section.
    if (inTargetSection && !statusLineReplaced && /^status:\s/.test(line)) {
      statusLineReplaced = true;
      return `status: ${status}`;
    }

    return line;
  });

  if (!statusLineReplaced) {
    throw new Error(`Could not find "status:" line for step "${stepId}" in .atomcraft/tasks.md`);
  }

  await fs.writeFile(tasks, updated.join('\n'));
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases used by next.js, status.js, and other callers.
// ---------------------------------------------------------------------------
export { listSteps as listSubtasks, getStep as getSubtask };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
