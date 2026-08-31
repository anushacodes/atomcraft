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

  // First pass: organize into tasks and their child steps.
  const taskGroups = [];
  let currentGroup = null;

  for (const section of sections) {
    if (section.level === 2) {
      const match = section.heading.match(/^([a-zA-Z0-9_-]+)\s*[—-]\s*(.+)/);
      const taskId = match ? match[1].trim() : section.heading;
      const taskTitle = match ? match[2].trim() : section.heading;

      currentGroup = {
        taskId,
        taskTitle,
        section,
        childSteps: [],
      };
      taskGroups.push(currentGroup);
      continue;
    }

    // level === 3
    const match = section.heading.match(/^([a-zA-Z0-9_-]+)\s*[—-]\s*(.+)/);
    if (!match) {
      // Regular markdown subheading inside the current task/step
      if (currentGroup && currentGroup.childSteps.length > 0) {
        currentGroup.childSteps[currentGroup.childSteps.length - 1].section.lines.push(`### ${section.heading}`, ...section.lines);
      } else if (currentGroup) {
        currentGroup.section.lines.push(`### ${section.heading}`, ...section.lines);
      }
      continue;
    }

    const stepId = match[1].trim();
    const stepTitle = match[2].trim();
    if (currentGroup) {
      currentGroup.childSteps.push({ stepId, stepTitle, section });
    }
  }

  // Second pass: emit step objects.
  const steps = [];

  function extractMetadata(bodyLines) {
    let status = 'pending';
    let depends_on = [];

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
    return { status, depends_on };
  }

  for (const group of taskGroups) {
    if (group.childSteps.length > 0) {
      for (const child of group.childSteps) {
        const { status, depends_on } = extractMetadata(child.section.lines);
        steps.push({
          id: child.stepId,
          title: child.stepTitle,
          taskId: group.taskId,
          taskTitle: group.taskTitle,
          status,
          depends_on,
          body: child.section.lines.join('\n').trimEnd(),
        });
      }
    } else {
      // Task has no child steps (e.g. non-atomized setup task) -> treat task as runnable step
      const { status, depends_on } = extractMetadata(group.section.lines);
      steps.push({
        id: group.taskId,
        title: group.taskTitle,
        taskId: group.taskId,
        taskTitle: group.taskTitle,
        status,
        depends_on,
        body: group.section.lines.join('\n').trimEnd(),
      });
    }
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
 * back. Supports both `## <id>` and `### <id>` section headings.
 */
export async function setStepStatus(stepId, status) {
  const { tasks } = paths();
  const raw = await fs.readFile(tasks, 'utf8');
  const lines = raw.split('\n');

  // Find the ## or ### heading line for this step.
  const stepHeadingRe = new RegExp(`^#{2,3}\\s+${escapeRegex(stepId)}\\s*[—-]`);
  let inTargetSection = false;
  let statusLineReplaced = false;
  let headingIndex = -1;

  const updated = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (stepHeadingRe.test(line)) {
      inTargetSection = true;
      statusLineReplaced = false;
      headingIndex = updated.length;
      updated.push(line);
      continue;
    }

    if (inTargetSection && /^#{2,3}\s+[a-zA-Z0-9_-]+\s*[—-]/.test(line)) {
      // Leaving section without finding status line -> insert one
      if (!statusLineReplaced) {
        updated.splice(headingIndex + 1, 0, `status: ${status}`);
        statusLineReplaced = true;
      }
      inTargetSection = false;
    }

    if (inTargetSection && !statusLineReplaced && /^status:\s/.test(line)) {
      statusLineReplaced = true;
      updated.push(`status: ${status}`);
      continue;
    }

    updated.push(line);
  }

  if (inTargetSection && !statusLineReplaced) {
    updated.splice(headingIndex + 1, 0, `status: ${status}`);
    statusLineReplaced = true;
  }

  if (!statusLineReplaced) {
    throw new Error(`Could not find section for step "${stepId}" in .atomcraft/tasks.md`);
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
