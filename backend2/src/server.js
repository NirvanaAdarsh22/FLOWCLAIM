
import app from "./app.js";
import env from "./config/env.js";
import connectMongoDB from "./config/mongodb.js";
import pool from "./config/postgresql.js";
import redis from "./config/redis.js";

const startServer = async () => {
    try {
        // 1. Connect MongoDB
        await connectMongoDB();

        // 2. Test PostgreSQL
        await pool.query("SELECT NOW()");
        console.log("PostgreSQL connected successfully");

        // 3. Connect Redis
        await redis.connect();
        await redis.ping();
        console.log("Upstash Redis connected successfully");

        // 4. Start Express server
        app.listen(env.PORT, () => {
            console.log(`FlowClaim server running on port ${env.PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
