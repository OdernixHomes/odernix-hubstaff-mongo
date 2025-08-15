import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { 
  HomePage, 
  DashboardPage, 
  TimeTrackingPage, 
  TeamManagementPage, 
  ProjectsPage, 
  ReportsPage, 
  SettingsPage,
  LoginPage,
  SignupPage,
  OrganizationRegistrationPage,
  IntegrationsPage,
  AcceptInvitePage,
  ForgotPasswordPage,
  ResetPasswordPage
} from "./pages";
import { authAPI } from "./api/client";

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('hubstaff_token');
    const savedUser = localStorage.getItem('hubstaff_user');
    
    if (token && savedUser) {
      try {
        // Validate token with backend
        const response = await authAPI.getCurrentUser();
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Token validation failed:', error);
        // Clear invalid token and user data
        localStorage.removeItem('hubstaff_token');
        localStorage.removeItem('hubstaff_user');
        setUser(null);
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('hubstaff_user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('hubstaff_user');
      localStorage.removeItem('hubstaff_token');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/signup" element={<SignupPage onLogin={handleLogin} />} />
          <Route path="/register-organization" element={<OrganizationRegistrationPage onLogin={handleLogin} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage onLogin={handleLogin} />} />
          <Route path="/register" element={<AcceptInvitePage onLogin={handleLogin} />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            isAuthenticated ? 
            <DashboardPage user={user} onLogout={handleLogout} /> : 
            <LoginPage onLogin={handleLogin} />
          } />
          <Route path="/time-tracking" element={
            isAuthenticated ? 
            <TimeTrackingPage user={user} onLogout={handleLogout} /> : 
            <LoginPage onLogin={handleLogin} />
          } />
          <Route path="/team" element={
            isAuthenticated ? 
            <TeamManagementPage user={user} onLogout={handleLogout} /> : 
            <LoginPage onLogin={handleLogin} />
          } />
          <Route path="/projects" element={
            isAuthenticated ? 
            <ProjectsPage user={user} onLogout={handleLogout} /> : 
            <LoginPage onLogin={handleLogin} />
          } />
          <Route path="/reports" element={
            isAuthenticated ? 
            <ReportsPage user={user} onLogout={handleLogout} /> : 
            <LoginPage onLogin={handleLogin} />
          } />
          <Route path="/integrations" element={
            isAuthenticated ? 
            <IntegrationsPage user={user} onLogout={handleLogout} /> : 
            <LoginPage onLogin={handleLogin} />
          } />
          <Route path="/settings" element={
            isAuthenticated ? 
            <SettingsPage user={user} onLogout={handleLogout} /> : 
            <LoginPage onLogin={handleLogin} />
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;