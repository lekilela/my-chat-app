// src/pages/LoginPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithPopup,
  signInWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, provider, db } from "../firebase";
import "../styles/Auth.css";

export default function LoginPage() {
  const navigate = useNavigate();

  // Email/password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 🔐 Google login
  const handleGoogleLogin = async () => {
    try {
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        });
      }

      navigate("/chat");
    } catch (error) {
      console.error("Google login failed:", error);
      alert("Login failed: " + error.message);
    }
  };

  // 📧 Email/password login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/chat");
    } catch (error) {
      console.error("Email login failed:", error);
      alert("Login failed: " + error.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome to Firebase Chat</h2>

      {/* Google login */}
      <button onClick={handleGoogleLogin} className="auth-button">
        Login with Google
      </button>

      <hr style={{ width: "100%", margin: "20px 0", opacity: 0.5 }} />

      {/* Email/password login */}
      <form onSubmit={handleEmailLogin} className="auth-form">
        <input
          type="email"
          placeholder="Email"
          className="auth-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="auth-button">Login with Email</button>
      </form>

      <p>
        Don't have an account?{" "}
        <span onClick={() => navigate("/signup")} className="auth-link">
          Sign up
        </span>
      </p>
    </div>
  );
}
