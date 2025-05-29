import React from "react";
import { useNavigate } from "react-router-dom";

export default function SignUpPage() {
  const navigate = useNavigate();

  const handleSignUp = () => {
    // sign up logic here
    navigate("/chat");
  };

  return (
    <div>
      <h2>Sign Up</h2>
      {/* Add inputs for name/email/password */}
      <button onClick={handleSignUp}>Sign Up</button>
      <p>
        Already have an account? <a onClick={() => navigate("/")}>Log in</a>
      </p>
    </div>
  );
}
