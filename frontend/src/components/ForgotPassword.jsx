import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./ForgotPassword.css";

function ForgotPassword() {
    const { forgotPassword } = useAuth();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        try {
            setLoading(true);
            const data = await forgotPassword(email);
            setMessage(data?.message || "If an account exists, a reset link will be sent.");
        } catch (err) {
            setError(err.message || "Unable to connect to server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-page">
            <div className="forgot-card">

                <h1>FlowClaim</h1>

                <h2>Forgot Password?</h2>

                <p>
                    Enter your registered email address.
                    We'll send you a password reset link.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="forgot-field">
                        <label>Email Address</label>

                        <input
                            type="email"
                            placeholder="Enter your registered email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <p className="forgot-error">{error}</p>
                    )}

                    {message && (
                        <p className="forgot-success">{message}</p>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <div className="forgot-footer">
                    <Link to="/">Back to Login</Link>
                </div>

            </div>
        </div>
    );
}

export default ForgotPassword;
