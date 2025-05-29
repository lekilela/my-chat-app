import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import "../styles/Signup.css";

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('male'); // ➕ Dodano

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName,
        email: user.email,
        gender // ➕ Dodano
      });

      console.log('User signed up and stored in Firestore');
    } catch (error) {
      console.error('Signup error:', error.message);
      alert(error.message);
    }
  };

  return (
    <div className="signup-container">
      <h2 className="signup-title">Sign Up</h2>
      <form onSubmit={handleSignup} className="auth-form">
        <input
          type="text"
          className="auth-input"
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <input
          type="email"
          className="auth-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="auth-input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* GENDER SELECTION */}
        <div className="gender-select">
  <label>
    <input
      type="radio"
      value="male"
      checked={gender === 'male'}
      onChange={(e) => setGender(e.target.value)}
    />
    Male
  </label>
  <label>
    <input
      type="radio"
      value="female"
      checked={gender === 'female'}
      onChange={(e) => setGender(e.target.value)}
    />
    Female
  </label>
</div>


        <button type="submit" className="auth-button">Sign Up</button>
      </form>
    </div>
  );
};

export default Signup;
