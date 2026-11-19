
import pg from "pg";
import env from "./env.js";

const { Pool } = pg;

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on("error", (error) => {
    console.error("PostgreSQL pool error:", error.message);
});

export default pool;
