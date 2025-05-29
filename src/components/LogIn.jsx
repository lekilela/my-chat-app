import React from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // authentication logic here
    navigate("/chat");
  };

  return (
    <div>
      <h2>Login</h2>
      {/* Add inputs for email/password here */}
      <button onClick={handleLogin}>Login</button>
      <p>
        Don't have an account? <a onClick={() => navigate("/signup")}>Sign up</a>
      </p>
    </div>
  );
}
