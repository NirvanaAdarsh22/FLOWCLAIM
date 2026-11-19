
import app from "./app.js";
import env from "./config/env.js";
import connectMongoDB from "./config/mongodb.js";
import pool from "./config/postgresql.js";
import redis from "./config/redis.js";

const startServer = async () => {
    // 1. Connect MongoDB
    try {
        await connectMongoDB();
    } catch (err) {
        console.warn("MongoDB connection warning:", err.message);
    }

    // 2. Test PostgreSQL
    try {
        await pool.query("SELECT NOW()");
        console.log("PostgreSQL connected successfully");
    } catch (err) {
        console.warn("PostgreSQL connection warning:", err.message);
    }

    // 3. Connect Redis
    try {
        await redis.connect();
        await redis.ping();
        console.log("Upstash Redis connected successfully");
    } catch (err) {
        console.warn("Redis connection warning:", err.message);
    }

    // 4. Start Express server
    try {
        app.listen(env.PORT, () => {
            console.log(`FlowClaim server running on port ${env.PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
