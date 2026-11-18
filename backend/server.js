const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
console.log("EMAIL_USER loaded:", Boolean(process.env.EMAIL_USER));
console.log("EMAIL_PASS loaded:", Boolean(process.env.EMAIL_PASS));

const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth",authRoutes);
app.use("/api", protectedRoutes);


app.get("/", (req, res) => {
    res.status(200).json({
        sucess : true,
        message : "Welcome to FlowClaim API"
    });
});

app.get("/api/health",(req,res) => {
    res.status(200).json(
        {
            success : true,
            status : "backend is running"
        }
    );
});
//const PORT = process.env.PORT || 5000;

const startServer =  async () => {
    try{
        await connectDB();

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`FlowClaim server running on port ${PORT}`);
        });
    }
    catch(error){
        console.error("Server startup failed:",error.message);
        process.exit(1);
    }
};
startServer();