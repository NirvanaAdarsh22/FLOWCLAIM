
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        employeeId: "",
        department: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (Object.values(formData).some(value => !value.trim())) {
            setError("Please fill in all fields.");
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(formData)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Registration failed.");
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            navigate("/dashboard");

        } catch (error) {
            setError("Unable to connect to server.");
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
                        <label>Full Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="register-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="register-group">
                        <label>Employee ID</label>
                        <input
                            type="text"
                            name="employeeId"
                            placeholder="Enter employee ID"
                            value={formData.employeeId}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="register-group">
                        <label>Department</label>
                        <input
                            type="text"
                            name="department"
                            placeholder="e.g. Engineering"
                            value={formData.department}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="register-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Minimum 8 characters"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>

                    {error && (
                        <p className="register-error">{error}</p>
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
