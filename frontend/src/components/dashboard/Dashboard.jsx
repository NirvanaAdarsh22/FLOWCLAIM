
import React from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("user"));

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");
    };

    return (
        <div className="dashboard-container">

            <nav className="dashboard-navbar">
                <h2>FlowClaim</h2>

                <button onClick={handleLogout}>
                    Logout
                </button>
            </nav>

            <main className="dashboard-content">

                <h1>
                    Welcome, {user?.name || "User"}!
                </h1>

                <p className="dashboard-subtitle">
                    Welcome to your FlowClaim dashboard.
                </p>

                <div className="dashboard-card">
                    <h3>Account Information</h3>

                    <p>
                        <strong>Name:</strong> {user?.name}
                    </p>

                    <p>
                        <strong>Email:</strong> {user?.email}
                    </p>

                    <p>
                        <strong>Employee ID:</strong> {user?.employeeId}
                    </p>

                    <p>
                        <strong>Role:</strong> {user?.role}
                    </p>

                </div>

            </main>

        </div>
    );
}

export default Dashboard;
