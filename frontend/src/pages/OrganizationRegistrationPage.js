import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerOrganization } from '../services/authService';
import RegistrationDebug from '../components/RegistrationDebug';
import TokenDebug from '../components/TokenDebug';

const OrganizationRegistrationPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    organization_name: '',
    organization_domain: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    confirmPassword: '',
    plan: 'free',
    accept_terms: false,
    accept_privacy: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Organization validation
    if (!formData.organization_name.trim()) {
      newErrors.organization_name = 'Organization name is required';
    } else if (formData.organization_name.length < 2) {
      newErrors.organization_name = 'Organization name must be at least 2 characters';
    }

    if (!formData.organization_domain.trim()) {
      newErrors.organization_domain = 'Organization domain is required';
    } else if (!/^[a-zA-Z0-9-]+$/.test(formData.organization_domain)) {
      newErrors.organization_domain = 'Domain can only contain letters, numbers, and hyphens';
    } else if (formData.organization_domain.length < 2) {
      newErrors.organization_domain = 'Domain must be at least 2 characters';
    }

    // Admin user validation
    if (!formData.admin_name.trim()) {
      newErrors.admin_name = 'Admin name is required';
    }

    if (!formData.admin_email.trim()) {
      newErrors.admin_email = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
      newErrors.admin_email = 'Invalid email format';
    }

    if (!formData.admin_password) {
      newErrors.admin_password = 'Password is required';
    } else if (formData.admin_password.length < 8) {
      newErrors.admin_password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.admin_password)) {
      newErrors.admin_password = 'Password must contain uppercase, lowercase, and numbers';
    }

    if (formData.admin_password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.accept_terms) {
      newErrors.accept_terms = 'You must accept the terms and conditions';
    }

    if (!formData.accept_privacy) {
      newErrors.accept_privacy = 'You must accept the privacy policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerOrganization(formData);
      
      // Store the token and user data (using consistent key names)
      localStorage.setItem('hubstaff_token', response.access_token);
      const userData = {
        id: response.admin_user_id,
        organization_id: response.organization_id,
        organization_name: response.organization_name,
        organization_domain: response.organization_domain,
        is_organization_owner: true,
        role: 'admin'
      };
      localStorage.setItem('hubstaff_user', JSON.stringify(userData));

      // Call onLogin prop to update App state
      if (onLogin) {
        onLogin(userData);
      }

      // Redirect to dashboard with success message
      navigate('/dashboard', { 
        state: { 
          message: response.message,
          isNewOrganization: true
        }
      });
    } catch (error) {
      console.error('Registration failed:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response?.status === 404) {
        errorMessage = 'Registration service not found. Please check if the backend server is running.';
      } else if (error.response?.status === 422) {
        // Validation errors
        if (Array.isArray(error.response.data?.detail)) {
          const fieldErrors = error.response.data.detail;
          const messages = fieldErrors.map(err => {
            const field = err.loc?.[err.loc.length - 1] || 'field';
            return `${field.replace('_', ' ')}: ${err.msg}`;
          });
          errorMessage = messages.join(', ');
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.detail || 'Invalid request. Please check your information.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later or contact support.';
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection and ensure the backend server is running.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please ensure the backend server is running at http://localhost:8001';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create Your Organization
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Set up your organization and become the administrator
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Debug Tools */}
          <div className="mb-6 space-y-4">
            <RegistrationDebug />
            <TokenDebug />
          </div>
          
          {/* Information Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">What happens when you register?</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>New Organization:</strong> A completely isolated workspace is created for your team</li>
                    <li><strong>Admin Account:</strong> You become the organization administrator with full control</li>
                    <li><strong>Data Privacy:</strong> Your organization's data is completely separate from others</li>
                    <li><strong>Team Management:</strong> You can invite team members and manage their access</li>
                    <li><strong>Free Trial:</strong> Start with a 14-day free trial of all features</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Organization Information
              </h3>
              
              <div>
                <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700">
                  Organization Name *
                </label>
                <input
                  id="organization_name"
                  name="organization_name"
                  type="text"
                  required
                  value={formData.organization_name}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.organization_name ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Your company name"
                />
                {errors.organization_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.organization_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="organization_domain" className="block text-sm font-medium text-gray-700">
                  Organization Domain * 
                  <span className="text-xs text-gray-500 ml-1">(used for unique identification)</span>
                </label>
                <input
                  id="organization_domain"
                  name="organization_domain"
                  type="text"
                  required
                  value={formData.organization_domain}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.organization_domain ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="my-company"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Only letters, numbers, and hyphens. This will be your unique organization identifier.
                </p>
                {errors.organization_domain && (
                  <p className="mt-1 text-sm text-red-600">{errors.organization_domain}</p>
                )}
              </div>
            </div>

            {/* Administrator Account */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Administrator Account
              </h3>
              
              <div>
                <label htmlFor="admin_name" className="block text-sm font-medium text-gray-700">
                  Your Full Name *
                </label>
                <input
                  id="admin_name"
                  name="admin_name"
                  type="text"
                  required
                  value={formData.admin_name}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.admin_name ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="John Doe"
                />
                {errors.admin_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.admin_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  id="admin_email"
                  name="admin_email"
                  type="email"
                  required
                  value={formData.admin_email}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.admin_email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="admin@yourcompany.com"
                />
                {errors.admin_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.admin_email}</p>
                )}
              </div>

              <div>
                <label htmlFor="admin_password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <input
                  id="admin_password"
                  name="admin_password"
                  type="password"
                  required
                  value={formData.admin_password}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.admin_password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters with uppercase, lowercase, and numbers
                </p>
                {errors.admin_password && (
                  <p className="mt-1 text-sm text-red-600">{errors.admin_password}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Plan Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Plan Selection
              </h3>
              
              <div>
                <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
                  Select Plan
                </label>
                <select
                  id="plan"
                  name="plan"
                  value={formData.plan}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="free">Free Plan (Up to 5 users)</option>
                  <option value="starter">Starter Plan (Up to 15 users)</option>
                  <option value="professional">Professional Plan (Up to 50 users)</option>
                  <option value="enterprise">Enterprise Plan (Unlimited users)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  All plans start with a 14-day free trial
                </p>
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="accept_terms"
                    name="accept_terms"
                    type="checkbox"
                    checked={formData.accept_terms}
                    onChange={handleChange}
                    className={`focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded ${
                      errors.accept_terms ? 'border-red-300' : ''
                    }`}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="accept_terms" className="text-gray-700">
                    I accept the{' '}
                    <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
                      Terms and Conditions
                    </a>{' '}
                    *
                  </label>
                  {errors.accept_terms && (
                    <p className="mt-1 text-sm text-red-600">{errors.accept_terms}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="accept_privacy"
                    name="accept_privacy"
                    type="checkbox"
                    checked={formData.accept_privacy}
                    onChange={handleChange}
                    className={`focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded ${
                      errors.accept_privacy ? 'border-red-300' : ''
                    }`}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="accept_privacy" className="text-gray-700">
                    I accept the{' '}
                    <a href="/privacy" className="text-indigo-600 hover:text-indigo-500">
                      Privacy Policy
                    </a>{' '}
                    *
                  </label>
                  {errors.accept_privacy && (
                    <p className="mt-1 text-sm text-red-600">{errors.accept_privacy}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {isLoading ? 'Creating Organization...' : 'Create Organization'}
              </button>
            </div>

            {errors.submit && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Registration Failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{errors.submit}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationRegistrationPage;