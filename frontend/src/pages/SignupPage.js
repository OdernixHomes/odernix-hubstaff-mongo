import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export const SignupPage = ({ onLogin }) => {
  const navigate = useNavigate();
  
  // SECURITY: Redirect to secure organization registration
  useEffect(() => {
    navigate('/register-organization', { replace: true });
  }, [navigate]);

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
          
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6">
            <div className="flex items-start">
              <span className="text-yellow-600 text-lg mr-3">🔒</span>
              <div>
                <p className="text-sm font-semibold">Security Update</p>
                <p className="text-xs mt-1">Redirecting to secure organization registration...</p>
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">Redirecting...</h2>
          <p className="text-blue-100">Creating secure organization registration</p>
          
          <div className="mt-8 text-center">
            <p className="text-blue-100 mb-4">
              If you're not redirected automatically:
            </p>
            <Link 
              to="/register-organization" 
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              Go to Organization Registration
            </Link>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-blue-100">
              Already have an account?{" "}
              <Link to="/login" className="text-white font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};