import { listSubtasks } from '../state.js';

export async function showStatus() {
  const all = await listSubtasks();

  if (all.length === 0) {
    console.log('No subtasks yet. Run your agent\'s "/atom-tasks" then "/atom-atomize <id>" commands first.');
    return;
  }

  const counts = {};
  for (const s of all) {
    counts[s.status] = (counts[s.status] || 0) + 1;
    console.log(`[${s.status.padEnd(11)}] ${s.id}  ${s.title}`);
  }

  console.log('\nSummary:', counts);
}
