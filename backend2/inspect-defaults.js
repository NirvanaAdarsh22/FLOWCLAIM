import pool from "./src/config/postgresql.js";

try {
    const result = await pool.query(`
        SELECT column_name, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
        ORDER BY ordinal_position
    `, ["public", "users"]);

    console.table(result.rows);
} catch (error) {
    console.error(error.message);
} finally {
    await pool.end();
}
