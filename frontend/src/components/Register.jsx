import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        employeeId: "",
        department: ""
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.employeeId.trim()) {
            setError("Please fill in all required fields (Name, Email, Employee ID, Password).");
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        try {
            setLoading(true);
            const data = await register(formData);

            setSuccess(data.message || "Registration successful! Redirecting to login...");
            setTimeout(() => {
                navigate("/");
            }, 1500);

        } catch (err) {
            setError(err.message || "Registration failed. Please verify your details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">

                <h1>FlowClaim</h1>
                <p className="register-subtitle">
                    Employee Expense Verification Platform
                </p>

                <h2>Create Account</h2>
                <p className="register-description">
                    Register as a FlowClaim employee.
                </p>

                <form onSubmit={handleSubmit}>

                    <div className="register-group">
                        <label>Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="register-group">
                        <label>Email Address *</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="register-group">
                        <label>Employee ID *</label>
                        <input
                            type="text"
                            name="employeeId"
                            placeholder="e.g. EMP-101"
                            value={formData.employeeId}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="register-group">
                        <label>Department</label>
                        <input
                            type="text"
                            name="department"
                            placeholder="e.g. Engineering (default: General)"
                            value={formData.department}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="register-group">
                        <label>Password *</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Minimum 8 characters"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && (
                        <p className="register-error">{error}</p>
                    )}

                    {success && (
                        <p style={{ color: "#16a34a", fontSize: "14px", marginBottom: "14px", fontWeight: "600" }}>
                            {success}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="register-button"
                        disabled={loading}
                    >
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>

                </form>

                <p className="login-link">
                    Already have an account? <Link to="/">Login</Link>
                </p>

            </div>
        </div>
    );
}

export default Register;
