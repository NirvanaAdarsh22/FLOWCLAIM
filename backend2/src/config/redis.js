import Redis from "ioredis";
import env from "./env.js";

const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    enableReadyCheck: false,
    retryStrategy: (times) => (times > 2 ? null : 1000)
});

redis.on("connect", () => {
    console.log("Redis connected successfully");
});

redis.on("error", (error) => {
    console.warn("Redis connection notice:", error.message);
});

export default redis;
