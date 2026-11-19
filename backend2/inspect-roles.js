import pool from "./src/config/postgresql.js";

try {
    const result = await pool.query(
        "SELECT role, COUNT(*) AS total FROM users GROUP BY role ORDER BY role"
    );

    console.table(result.rows);
} catch (error) {
    console.error("Error:", error.message);
} finally {
    await pool.end();
}
