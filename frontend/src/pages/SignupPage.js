import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export const SignupPage = ({ onLogin }) => {
  const navigate = useNavigate();
  
  // SECURITY: Redirect to secure organization registration
  useEffect(() => {
    navigate('/register-organization', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
              <span className="text-white font-bold text-lg sm:text-xl">H</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white">Hubstaff</span>
          </div>
          
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg mb-4 sm:mb-6">
            <div className="flex items-start">
              <span className="text-yellow-600 text-base sm:text-lg mr-2 sm:mr-3">🔒</span>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-semibold">Security Update</p>
                <p className="text-xs mt-1">Redirecting to secure organization registration...</p>
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Redirecting...</h2>
          <p className="text-blue-100 text-sm sm:text-base">Creating secure organization registration</p>
          
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">
              If you're not redirected automatically:
            </p>
            <Link 
              to="/register-organization" 
              className="bg-blue-600 text-white py-2 sm:py-2.5 px-4 sm:px-6 rounded-md hover:bg-blue-700 transition-colors inline-block text-sm sm:text-base font-medium touch-manipulation"
            >
              Go to Organization Registration
            </Link>
          </div>
          
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-blue-100 text-sm sm:text-base">
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