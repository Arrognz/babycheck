import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BabyTracker from "./BabyTracker";
import Admin from "./Admin";
import Profile from "./Profile";
import DeleteAccount from "./DeleteAccount";
import Stats from "./Stats";
import CalendarView from "./CalendarView";
import AuthForm from "./AuthForm";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
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

  return (
    <Router>
      <Routes>
        {/* Public routes (no authentication required) */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected routes */}
        {isAuthenticated ? (
          <>
            <Route path="/" element={<BabyTracker user={user} onLogout={handleLogout} />} />
            <Route path="/admin" element={<Admin user={user} onLogout={handleLogout} />} />
            <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
            <Route path="/stats" element={<Stats user={user} onLogout={handleLogout} />} />
            <Route path="/calendar" element={<CalendarView user={user} onLogout={handleLogout} />} />
            <Route path="/delete-account" element={<DeleteAccount user={user} onLogout={handleLogout} />} />
          </>
        ) : (
          <Route path="/*" element={<AuthForm onAuthenticated={handleAuthenticated} />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;