const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req,res,next) =>{
    try {
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success : false,
                message : "Access denied. No token provided."
            });
        };
        const token = authHeader.split(" ")[1];

        //console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET);
        //console.log("Token received:", !!token);
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        //console.log("Decoded token:", decoded);
        //req.user = decoded;
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found."
            });
        }
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive."
            });
        }
        req.user = {
            id: user._id,
            role: user.role,
            employeeId: user.employeeId,
            name: user.name
        };
        next();
    }catch (error){
        return res.status(401).json({
            success : false,
            message : "Invalid or expired token"
        });
    }
};
module.exports = authMiddleware;