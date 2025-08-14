import { authAPI, organizationAPI } from '../api/client';

// Token storage key (must match API client expectations)
const TOKEN_KEY = 'hubstaff_token';
const USER_KEY = 'hubstaff_user';

// Organization Registration (NEW SECURE METHOD)
export const registerOrganization = async (registrationData) => {
  try {
    const response = await organizationAPI.register(registrationData);
    
    // Store authentication data
    if (response.data.access_token) {
      localStorage.setItem(TOKEN_KEY, response.data.access_token);
    }
    
    // Store user and organization data
    if (response.data.admin_user_id && response.data.organization_id) {
      const userData = {
        id: response.data.admin_user_id,
        organization_id: response.data.organization_id,
        organization_name: response.data.organization_name,
        organization_domain: response.data.organization_domain,
        is_organization_owner: true,
        role: 'admin'
      };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    }
    
    return response.data;
  } catch (error) {
    console.error('Organization registration failed:', error);
    throw error;
  }
};

// Traditional Login
export const login = async (credentials) => {
  try {
    const response = await authAPI.login(credentials);
    
    // Store authentication data
    if (response.data.access_token) {
      localStorage.setItem(TOKEN_KEY, response.data.access_token);
    }
    
    // Store user data
    if (response.data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Accept Invitation
export const acceptInvitation = async (acceptData) => {
  try {
    const response = await authAPI.acceptInvite(acceptData);
    
    // Store authentication data
    if (response.data.access_token) {
      localStorage.setItem(TOKEN_KEY, response.data.access_token);
    }
    
    // Store user data with organization context
    if (response.data.user) {
      const userData = {
        ...response.data.user,
        organization: response.data.organization
      };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    }
    
    return response.data;
  } catch (error) {
    console.error('Accept invitation failed:', error);
    throw error;
  }
};

// Logout
export const logout = async () => {
  try {
    await authAPI.logout();
  } catch (error) {
    console.error('Logout API call failed:', error);
    // Continue with local cleanup even if API call fails
  } finally {
    // Always clean up local storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const response = await authAPI.getCurrentUser();
    
    // Update stored user data
    if (response.data) {
      localStorage.setItem(USER_KEY, JSON.stringify(response.data));
    }
    
    return response.data;
  } catch (error) {
    console.error('Get current user failed:', error);
    // If the request fails, clear stored data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);
  return !!(token && user);
};

// Get stored user data
export const getStoredUser = () => {
  try {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing stored user data:', error);
    return null;
  }
};

// Get stored token
export const getStoredToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Organization Management
export const inviteUserToOrganization = async (inviteData) => {
  try {
    const response = await organizationAPI.inviteUser(inviteData);
    return response.data;
  } catch (error) {
    console.error('User invitation failed:', error);
    throw error;
  }
};

export const getOrganizationStats = async () => {
  try {
    const response = await organizationAPI.getStats();
    return response.data;
  } catch (error) {
    console.error('Get organization stats failed:', error);
    throw error;
  }
};

export const getOrganizationMembers = async () => {
  try {
    const response = await organizationAPI.getMembers();
    return response.data;
  } catch (error) {
    console.error('Get organization members failed:', error);
    throw error;
  }
};

// Password Management
export const forgotPassword = async (email) => {
  try {
    const response = await authAPI.forgotPassword({ email });
    return response.data;
  } catch (error) {
    console.error('Forgot password failed:', error);
    throw error;
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    const response = await authAPI.resetPassword({ token, new_password: newPassword });
    return response.data;
  } catch (error) {
    console.error('Reset password failed:', error);
    throw error;
  }
};

// Legacy registration (DEPRECATED - will be disabled by security middleware)
export const register = async (userData) => {
  try {
    console.warn('DEPRECATED: Direct registration is disabled for security. Use registerOrganization instead.');
    const response = await authAPI.register(userData);
    return response.data;
  } catch (error) {
    // If it's the expected security error, provide helpful message
    if (error.response?.status === 410) {
      throw new Error('Direct registration is disabled. Please use organization registration instead.');
    }
    console.error('Registration failed:', error);
    throw error;
  }
};

export default {
  registerOrganization,
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getStoredUser,
  getStoredToken,
  acceptInvitation,
  inviteUserToOrganization,
  getOrganizationStats,
  getOrganizationMembers,
  forgotPassword,
  resetPassword,
  register
};