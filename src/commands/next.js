import { listSubtasks } from '../state.js';
import { runImplement } from './implement.js';

export async function runNext() {
  const all = await listSubtasks();
  const next = all.find((s) => s.status === 'pending');

  if (!next) {
    console.log('No pending subtasks. Run "atomcraft status" to see progress, or atomize another task.');
    return;
  }

  console.log(`Next pending subtask: ${next.id} — ${next.title}`);
  await runImplement(next.id);
}
