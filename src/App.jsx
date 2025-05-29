// App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ChatPage from './pages/ChatPage';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Optional: redirect to /chat if user is already logged in
      if (currentUser) {
        navigate('/chat');
      }
    });

    return () => unsub();
  }, [navigate]);

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route
        path="/chat"
        element={
          user ? (
            <ChatPage currentUser={user} />
          ) : (
            <LoginPage />
          )
        }
      />
    </Routes>
  );
}
