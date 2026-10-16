import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const result = spawnSync(
  'supabase',
  ['gen', 'types', 'typescript', '--linked', '--schema', 'public'],
  { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
);
if (result.status !== 0 || !result.stdout.includes('export type Database')) {
  process.stderr.write(result.stderr || 'Type generation failed. Existing types were preserved.\n');
  process.exit(1);
}
writeFileSync('src/lib/database.types.ts', result.stdout);
console.log('Regenerated cloud database types. Local aliases in models.ts were preserved.');
