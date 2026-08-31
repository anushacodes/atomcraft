import os from 'os';
import path from 'path';
import readline from 'readline';
import fs from 'fs-extra';
import { execa } from 'execa';
import chalk from 'chalk';
import { getStep, setStepStatus, listSteps } from '../state.js';
import { detectAvailableAgents, spawnHeadlessAgent } from '../agents.js';

/** Return ids of declared dependencies that are not yet `done`. */
async function unmetDependencies(step) {
  const dependsOn = step.depends_on || [];
  if (dependsOn.length === 0) return [];

  const all = await listSteps();
  return dependsOn.filter((depId) => {
    const directStep = all.find((s) => s.id === depId);
    if (directStep) {
      return directStep.status !== 'done';
    }

    const parentSteps = all.filter((s) => s.taskId === depId);
    if (parentSteps.length > 0) {
      return !parentSteps.every((s) => s.status === 'done');
    }

    return true;
  });
}

/**
 * Run `git diff --stat HEAD`, parse the summary line, and return the total
 * lines changed (insertions + deletions).
 *
 * Returns `{ stat, total }` where `stat` is the raw output string.
 */
async function getDiffStat() {
  let result = await execa('git', ['diff', '--stat', 'HEAD'], {
    cwd: process.cwd(),
    reject: false,
  });
  if (result.exitCode !== 0) {
    result = await execa('git', ['diff', '--stat'], {
      cwd: process.cwd(),
      reject: false,
    });
  }
  const stat = result.stdout || '';

  // The summary line looks like:
  //   3 files changed, 47 insertions(+), 12 deletions(-)
  const summaryMatch = stat.match(
    /(\d+)\s+insertion[s]?\(\+\).*?(\d+)\s+deletion[s]?\(-\)|(\d+)\s+insertion[s]?\(\+\)|(\d+)\s+deletion[s]?\(-\)/,
  );

  let total = 0;
  if (summaryMatch) {
    const insertions = parseInt(summaryMatch[1] || summaryMatch[3] || '0', 10);
    const deletions = parseInt(summaryMatch[2] || summaryMatch[4] || '0', 10);
    total = insertions + deletions;
  }

  return { stat, total };
}

/**
 * Prompt the user with a question and return their input line.
 * Closes the readline interface before resolving.
 */
function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function runImplement(subtaskId, opts = {}) {
  const step = await getStep(subtaskId);

  if (step.status === 'done') {
    console.log(`${subtaskId} is already marked done — skipping.`);
    return;
  }

  const blocking = await unmetDependencies(step);
  if (blocking.length > 0) {
    console.error(`${subtaskId} depends on unfinished steps: ${blocking.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const available = await detectAvailableAgents();
  if (available.length === 0) {
    console.error('No agent CLI found on PATH. Install claude, cursor-agent, codex, or gemini.');
    process.exitCode = 1;
    return;
  }
  const agentKey = opts.agent || available[0];

  // Write the step body to a temp file so the agent can consume it.
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `atomcraft-${subtaskId}-${Date.now()}.md`);
  await fs.writeFile(tmpFile, step.body, 'utf8');

  console.log(`Implementing ${subtaskId} via a fresh ${agentKey} process (isolated context)...\n`);
  await setStepStatus(subtaskId, 'in_progress');

  let agentExitCode;
  try {
    const { exitCode } = await spawnHeadlessAgent(agentKey, tmpFile, { cwd: process.cwd() });
    agentExitCode = exitCode;
  } finally {
    // Always clean up the temp prompt file.
    await fs.remove(tmpFile).catch(() => {});
  }

  if (agentExitCode !== 0) {
    await setStepStatus(subtaskId, 'failed');
    console.error(`\n${subtaskId} failed (exit code ${agentExitCode}). See output above.`);
    process.exitCode = 1;
    return;
  }

  // -------------------------------------------------------------------------
  // Diff validation gate
  // -------------------------------------------------------------------------
  const { stat, total } = await getDiffStat();

  if (total > 200) {
    console.error(
      chalk.red(
        `\n⛔  Hard stop: diff is too large (${total} lines changed, limit 200).\n` +
          `    Review the changes manually, revert if needed, and break this step into smaller pieces.`,
      ),
    );
    await setStepStatus(subtaskId, 'failed');
    process.exitCode = 1;
    return;
  }

  if (total > 100) {
    console.warn(
      chalk.yellow(`\n⚠️  Diff is large (${total} lines) — review carefully before approving.`),
    );
  } else {
    console.log(chalk.green(`\n✓  Diff looks reasonable (${total} lines changed).`));
  }

  // -------------------------------------------------------------------------
  // Interactive human review gate
  // -------------------------------------------------------------------------
  console.log('\n' + chalk.bold('── git diff --stat HEAD ──'));
  console.log(stat || '(no changes detected)');
  console.log(chalk.bold('──────────────────────────') + '\n');

  const answer = await prompt('Approve this step? [a]pprove / [r]eject / [R]edo > ');

  if (answer === 'a' || answer === 'approve') {
    const commitMsg = `${subtaskId}: ${step.title}`;
    await execa('git', ['add', '-A'], { cwd: process.cwd() });
    await execa('git', ['commit', '-m', commitMsg], { cwd: process.cwd() });
    await setStepStatus(subtaskId, 'done');
    console.log(chalk.green(`\n✓ Step ${subtaskId} committed and marked done.`));
    console.log('Run "atomcraft next" to continue to the next step.');
  } else if (answer === 'r' || answer === 'reject') {
    await setStepStatus(subtaskId, 'failed');
    console.log(`\nStep rejected. ${subtaskId} marked failed.`);
  } else if (answer === 'R' || answer === 'redo') {
    await setStepStatus(subtaskId, 'pending');
    console.log(`\nStep reset to pending — run "atomcraft implement ${subtaskId}" to retry.`);
  } else {
    // Treat any unrecognised input as reject.
    await setStepStatus(subtaskId, 'failed');
    console.log(`\nUnrecognised input — step rejected. ${subtaskId} marked failed.`);
  }
}
