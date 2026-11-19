import {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetUserPassword
} from "./auth.service.js";

import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "./auth.validator.js";

import transporter from "../../config/mailer.js";
import env from "../../config/env.js";

export const register = async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map(issue => issue.message)
      });
    }

    const user = await registerUser(validation.data);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email or Employee ID already exists"
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
};

export const login = async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map(issue => issue.message)
      });
    }

    const result = await loginUser(validation.data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      ...result
    });

  } catch (error) {
    if (error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (error.message === "ACCOUNT_INACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive"
      });
    }

    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    const result = await requestPasswordReset(validation.data.email);

    // Generic response prevents revealing whether an email is registered.
    const message = "If an account exists, a reset link will be sent.";

    if (!result) {
      return res.status(200).json({
        success: true,
        message
      });
    }

    const resetLink =
      `${env.FRONTEND_URL}/reset-password/${result.resetToken}`;

    await transporter.sendMail({
      from: `"FlowClaim" <${env.EMAIL_USER}>`,
      to: result.user.email,
      subject: "FlowClaim Password Reset",
      text: `Hello ${result.user.full_name},

We received a request to reset your FlowClaim password.

Use this link to reset your password:
${resetLink}

This link expires in 15 minutes.

If you did not request this, please ignore this email.`
    });

    return res.status(200).json({
      success: true,
      message
    });

  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request."
    });
  }
};


export const resetPassword = async (req, res) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const { token } = req.params;

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset link."
      });
    }

    const updated = await resetUserPassword({
      token,
      password: validation.data.password
    });

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset link."
      });
    }

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
