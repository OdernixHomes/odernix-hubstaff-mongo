import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../api/client";

export const LoginPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log('Attempting login with:', { email: formData.email });

    try {
      const response = await authAPI.login(formData);
      console.log('Login successful:', response.data);
      
      const { access_token, user } = response.data;
      
      localStorage.setItem('hubstaff_token', access_token);
      localStorage.setItem('hubstaff_user', JSON.stringify(user));
      
      onLogin(user);
      navigate("/dashboard");
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      
      let errorMessage = "Login failed. Please try again.";
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const detail = error.response.data?.detail;
        
        if (status === 401) {
          errorMessage = "Invalid email or password.";
        } else if (status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (detail) {
          errorMessage = detail;
        }
      } else if (error.request) {
        // Network error
        errorMessage = "Unable to connect to server. Please check your connection.";
      }
      
      setError(errorMessage);
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
          <h2 className="text-3xl font-bold text-white">Sign in to your account</h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Email address
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        
        <div className="text-center">
          <p className="text-blue-100">
            Don't have an account?{" "}
            <Link to="/signup" className="text-white font-semibold hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};