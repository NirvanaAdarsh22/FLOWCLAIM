
import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import "./ResetPassword.css";

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!password || !confirmPassword) {
            setError("Please fill in both password fields.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `http://localhost:5000/api/auth/reset-password/${token}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ password })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Password reset failed.");
            }

            setSuccess("Password reset successfully! Redirecting to login...");

            setTimeout(() => {
                navigate("/");
            }, 2000);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-page">
            <div className="reset-card">

                <div className="reset-header">
                    <h1>FlowClaim</h1>
                    <h2>Reset Your Password</h2>
                    <p>Create a new password for your account.</p>
                </div>

                <form onSubmit={handleSubmit}>

                    <div className="reset-field">
                        <label>New Password</label>

                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="reset-field">
                        <label>Confirm Password</label>

                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <div className="reset-show-password">
                        <input
                            type="checkbox"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                        />
                        <label>Show password</label>
                    </div>

                    {error && (
                        <p className="reset-error">{error}</p>
                    )}

                    {success && (
                        <p className="reset-success">{success}</p>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>

                </form>

                <div className="reset-footer">
                    <Link to="/">Back to Login</Link>
                </div>

            </div>
        </div>
    );
}

export default ResetPassword;
