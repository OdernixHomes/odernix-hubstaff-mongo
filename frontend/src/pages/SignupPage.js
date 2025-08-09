import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../api/client";

export const SignupPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    company: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authAPI.register({
        ...formData,
        role: "admin"  // All direct registrations are admin
      });
      const { access_token, user } = response.data;
      
      localStorage.setItem('hubstaff_token', access_token);
      localStorage.setItem('hubstaff_user', JSON.stringify(user));
      
      onLogin(user);
      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xl">H</span>
            </div>
            <span className="text-2xl font-bold text-white">Hubstaff</span>
          </div>
          <h2 className="text-3xl font-bold text-white">Create Admin Account</h2>
          <p className="text-blue-100 mt-2">Register as a company administrator</p>
        </div>

        {/* Admin Information Box */}
        <div className="bg-blue-900/50 border border-blue-400/30 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-blue-300 text-xl">ℹ️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-blue-100 mb-2">Admin Registration</h3>
              <div className="text-xs text-blue-200 space-y-1">
                <p>• You're registering as a <strong>Company Administrator</strong></p>
                <p>• You'll have full access to manage your organization</p>
                <p>• You can invite <strong>Managers</strong> and <strong>Users</strong> to join your team</p>
                <p>• Only admins can register directly - team members must be invited</p>
                <p>• You'll manage projects, time tracking, and team analytics</p>
              </div>
            </div>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white">
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-white">
              Company name
            </label>
            <input
              id="company"
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Creating admin account..." : "Create Admin Account"}
          </button>
          
          {/* Additional Admin Info */}
          <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-lg p-3 mt-4">
            <div className="flex items-start">
              <span className="text-yellow-300 text-sm mr-2">⚡</span>
              <div className="text-xs text-yellow-200">
                <p><strong>What happens next:</strong></p>
                <p>1. Your admin account will be created instantly</p>
                <p>2. Access the Team Management page to invite your team</p>
                <p>3. Set up projects and start tracking time</p>
              </div>
            </div>
          </div>
        </form>
        
        <div className="text-center">
          <p className="text-blue-100">
            Already have an account?{" "}
            <Link to="/login" className="text-white font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};