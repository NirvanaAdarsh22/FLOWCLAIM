import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Runs SQL migrations against the provided PostgreSQL pool.
 * @param {import('pg').Pool} pool
 */
export async function runMigrations(pool) {
  const migrationsDir = join(__dirname, 'migrations');
  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    const filePath = join(migrationsDir, file);
    const sql = await readFile(filePath, 'utf-8');
    await pool.query(sql);
  }
}
