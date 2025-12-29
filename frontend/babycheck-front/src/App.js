import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BabyTracker from "./BabyTracker";
import Admin from "./Admin";
import Profile from "./Profile";
import AuthForm from "./AuthForm";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('babycheck_token');
    const userData = localStorage.getItem('babycheck_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleAuthenticated = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('babycheck_token');
    localStorage.removeItem('babycheck_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: '#282c34',
      color: 'white'
    }}>Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <AuthForm onAuthenticated={handleAuthenticated} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<BabyTracker user={user} onLogout={handleLogout} />} />
        <Route path="/admin" element={<Admin user={user} onLogout={handleLogout} />} />
        <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
      </Routes>
    </Router>
  );
}

export default App;