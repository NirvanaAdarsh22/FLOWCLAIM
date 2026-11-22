
import mongoose from "mongoose";
import env from "./env.js";

const connectMongoDB = async () => {
    try {
        await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.warn("MongoDB Atlas connection failed, falling back to local MongoDB:", error.message);
        try {
            await mongoose.connect("mongodb://127.0.0.1:27017/flowclaim", { serverSelectionTimeoutMS: 3000 });
            console.log("Local MongoDB connected successfully");
        } catch (localErr) {
            console.error("Local MongoDB also failed:", localErr.message);
            throw localErr;
        }
    }
};

export default connectMongoDB;
