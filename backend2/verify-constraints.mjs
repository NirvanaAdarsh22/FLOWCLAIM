import pool from "./src/config/postgresql.js";

try {
    const result = await pool.query(`
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
          AND contype = 'u'
        ORDER BY conname
    `);

    console.table(result.rows);
} finally {
    await pool.end();
}
