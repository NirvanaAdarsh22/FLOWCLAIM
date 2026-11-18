//reset pass
const crypto = require("crypto");
const transporter = require("../config/mailer");
//

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

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please provide your email address."
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        // Generic response prevents email enumeration
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account exists, a reset link will be sent."
            });
        }

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Hash token before storing it
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        user.resetPasswordToken = hashedToken;

        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        // Create reset link
        const resetLink =
            `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Send email
        await transporter.sendMail({
            from: `"FlowClaim" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "FlowClaim Password Reset",
            html: `
                <h2>Password Reset Request</h2>

                <p>Hello ${user.name},</p>

                <p>We received a request to reset your FlowClaim password.</p>

                <p>Click the link below to set a new password:</p>

                <a href="${resetLink}">
                    Reset My Password
                </a>

                <p>This link expires in 15 minutes.</p>

                <p>If you did not request this, please ignore this email.</p>
            `
        });

        return res.status(200).json({
            success: true,
            message: "If an account exists, a reset link will be sent."
        });

    } catch (error) {
        console.error("Forgot password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to process password reset request."
        });
    }
};


const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Validate new password
        if (!password || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long."
            });
        }

        // Hash the token received from the reset link
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find user with a valid, non-expired reset token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired password reset link."
            });
        }

        // Update password
        user.password = password;

        // Invalidate the reset token so it cannot be reused
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Please log in."
        });

    } catch (error) {
        console.error("Reset password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to reset password."
        });
    }
};


module.exports = {register,login,forgotPassword,resetPassword};