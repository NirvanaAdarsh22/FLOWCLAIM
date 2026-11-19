
import mongoose from "mongoose";
import pool from "../config/postgresql.js";
import redis from "../config/redis.js";

export const checkDatabaseHealth = async (req, res) => {
    const status = {
        mongodb: "disconnected",
        postgresql: "disconnected",
        redis: "disconnected"
    };

    try {
        if (mongoose.connection.readyState === 1) {
            status.mongodb = "connected";
        }
    } catch (error) {
        console.error("MongoDB health check:", error.message);
    }

    try {
        await pool.query("SELECT 1");
        status.postgresql = "connected";
    } catch (error) {
        console.error("PostgreSQL health check:", error.message);
    }

    try {
        const result = await redis.ping();
        if (result === "PONG") {
            status.redis = "connected";
        }
    } catch (error) {
        console.error("Redis health check:", error.message);
    }

    const allConnected = Object.values(status).every(
        value => value === "connected"
    );

    return res.status(allConnected ? 200 : 503).json({
        success: allConnected,
        message: allConnected
            ? "All databases are healthy"
            : "One or more databases are unavailable",
        databases: status
    });
};
