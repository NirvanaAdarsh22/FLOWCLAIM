import pool from "./src/config/postgresql.js";

try {
    await pool.query(`
        ALTER TABLE public.users
        ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id)
    `);

    console.log("Employee ID UNIQUE constraint added successfully.");
} catch (error) {
    console.error("Error:", error.message);
} finally {
    await pool.end();
}
