import pool from "./src/config/postgresql.js";

try {
    const result = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
        ["public"]
    );

    console.log("PostgreSQL tables:", result.rows);
} catch (error) {
    console.error("Error:", error.message);
} finally {
    await pool.end();
}
