import pool from "./src/config/postgresql.js";

try {
    const result = await pool.query(`
        SELECT
            conname AS constraint_name,
            contype AS constraint_type,
            pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
        ORDER BY conname
    `);

    console.table(result.rows);
} catch (error) {
    console.error("Error:", error.message);
} finally {
    await pool.end();
}
