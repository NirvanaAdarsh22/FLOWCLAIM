const User = require("../models/User");
const jwt = require = require("jsonwebtoken");

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );
};

const register = async (req,res) => {
    try{
        const{
            name,
            email,
            password,
            employeeId,
            department
        } = req.body;
        if(!name || !email || !password || !employeeId) {
            return res.status(400).json({
                success : false,
                message : "Please provide all required fields"
            });
        }

        if(password.length < 8){
            return res.status(400).json({
                success : false,
                message : "Password must contain at least 8 characters"
            });
        }
        const existingUser = await User.findOne({
            $or: [
                {email : email.toLowerCase().trim()},
                {employeeId : employeeId.trim()}
            ]
        });
        if(existingUser){
            return res.status(409).json({
                success : false,
                message : "Email or Employee ID already registered"
            });
        }
        const user = await User.create({
            name,
            email,
            password,
            employeeId,
            department,
            role : "employee"
        });

        const token = generateToken(user);
        return res.status(201).json({
            success : true,
            message : "Employee registered sucessfully",
            token,
            user :{
                id: user._id,
                name: user.name,
                email: user.email,
                employeeId: user.employeeId,
                role: user.role
            }
        });
    }
    catch(error){
        console.error("Registration error:",error);
        return res.status(500).json({
            success : false,
            message : "Registration failed"
        });
    }
};

const login = async (req,res) => {
    try{
        const {email,password} = req.body;
        if(!email || !password)
        {
            return res.status(400).json({
                sucess : false,
                message : "Email and password are required"
            });
        }
        const user = await User.findOne({
            email : email.toLowerCase().trim()
        }).select("+password");
        if(!user){
            return res.status(400).json({
                sucess : false,
                message : "Invalid email or password"
            });
        }
        if(!user.isActive){
            return res.status(403).json({
                sucess : false,
                message : "Your account is inactive"
            });
        }
        const isMatch = await user.comparePassword(password);

        if(!isMatch){
            return res.status(401).json({
                sucess : false,
                message : "Invalid email or password"
            });
        }
        const token = generateToken(user);

        return res.status(200).json({
            sucess: true,
            message : "Login successful",
            token,
            user : {
                id : user._id,
                name : user.name,
                email : user.email,
                employeeId : user.employeeId,
                role : user.role
            }
        });
    }
    catch(error){
        console.error("Login error", error);

        return res.status(500).json({
            sucess : false,
            message : "Login failed"
        });
    }
};

module.exports = {register,login};