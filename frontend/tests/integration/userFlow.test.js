/**
 * User flow integration tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import App from '../../src/App';
import { mockUser, mockProject, mockApiResponse, setupTest } from '../setup';

// Mock all API modules
jest.mock('../../src/api/client', () => ({
  authAPI: {
    login: jest.fn(),
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
  },
  usersAPI: {
    getUsers: jest.fn(),
  },
  projectsAPI: {
    getProjects: jest.fn(),
  },
  analyticsAPI: {
    getDashboardAnalytics: jest.fn(),
  },
  timeTrackingAPI: {
    getActiveEntry: jest.fn(),
    startTracking: jest.fn(),
    getTimeEntries: jest.fn(),
  },
}));

jest.mock('../../src/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: false,
    onlineUsers: [],
    notifications: [],
    sendMessage: jest.fn(),
    markNotificationAsRead: jest.fn(),
  }),
}));

// Mock react-router-dom for individual components
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const AppWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    setupTest();
  });

  test('complete login to dashboard flow', async () => {
    const { authAPI, usersAPI, projectsAPI, analyticsAPI } = require('../../src/api/client');
    
    // Mock successful login
    authAPI.login.mockResolvedValue(mockApiResponse({
      access_token: 'mock-token',
      user: mockUser,
    }));

    // Mock dashboard data loading
    authAPI.getCurrentUser.mockResolvedValue(mockApiResponse(mockUser));
    analyticsAPI.getDashboardAnalytics.mockResolvedValue(mockApiResponse({
      user_stats: { total_hours: 40, avg_activity: 85 },
      productivity_trend: [],
      project_breakdown: [],
    }));
    usersAPI.getUsers.mockResolvedValue(mockApiResponse([mockUser]));
    projectsAPI.getProjects.mockResolvedValue(mockApiResponse([mockProject]));

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    // Should start on login page
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();

    // Fill in login form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    // Should navigate to dashboard after successful login
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Should show user's name in dashboard
    expect(screen.getByText(new RegExp(mockUser.name, 'i'))).toBeInTheDocument();
  });

  test('handles login error flow', async () => {
    const { authAPI } = require('../../src/api/client');
    
    // Mock login failure
    authAPI.login.mockRejectedValue({
      response: { status: 401, data: { detail: 'Invalid credentials' } },
    });

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    // Fill in login form with invalid credentials
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    // Should stay on login page
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  test('logout flow', async () => {
    const { authAPI, usersAPI, projectsAPI, analyticsAPI } = require('../../src/api/client');
    
    // Setup authenticated state
    authAPI.getCurrentUser.mockResolvedValue(mockApiResponse(mockUser));
    analyticsAPI.getDashboardAnalytics.mockResolvedValue(mockApiResponse({
      user_stats: { total_hours: 0 },
      productivity_trend: [],
      project_breakdown: [],
    }));
    usersAPI.getUsers.mockResolvedValue(mockApiResponse([]));
    projectsAPI.getProjects.mockResolvedValue(mockApiResponse([]));
    authAPI.logout.mockResolvedValue(mockApiResponse({}));

    // Mock localStorage to simulate existing token
    localStorage.setItem('hubstaff_token', 'mock-token');
    localStorage.setItem('hubstaff_user', JSON.stringify(mockUser));

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    // Should show dashboard for authenticated user
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Find and click logout button
    const logoutButton = screen.getByText(/logout/i);
    fireEvent.click(logoutButton);

    // Should redirect to login page
    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    // Should clear localStorage
    expect(localStorage.removeItem).toHaveBeenCalledWith('hubstaff_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('hubstaff_user');
  });

  test('protected route access without authentication', () => {
    // Clear any existing tokens
    localStorage.removeItem('hubstaff_token');
    localStorage.removeItem('hubstaff_user');

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    // Should redirect to login page
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  test('navigation between pages', async () => {
    const { authAPI, usersAPI, projectsAPI, analyticsAPI, timeTrackingAPI } = require('../../src/api/client');
    
    // Setup authenticated state
    authAPI.getCurrentUser.mockResolvedValue(mockApiResponse(mockUser));
    analyticsAPI.getDashboardAnalytics.mockResolvedValue(mockApiResponse({
      user_stats: { total_hours: 0 },
      productivity_trend: [],
      project_breakdown: [],
    }));
    usersAPI.getUsers.mockResolvedValue(mockApiResponse([]));
    projectsAPI.getProjects.mockResolvedValue(mockApiResponse([mockProject]));
    timeTrackingAPI.getActiveEntry.mockResolvedValue(mockApiResponse(null));
    timeTrackingAPI.getTimeEntries.mockResolvedValue(mockApiResponse([]));

    localStorage.setItem('hubstaff_token', 'mock-token');
    localStorage.setItem('hubstaff_user', JSON.stringify(mockUser));

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    // Should start on dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Navigate to Projects page
    const projectsNavLink = screen.getByText('Projects');
    fireEvent.click(projectsNavLink);

    await waitFor(() => {
      expect(screen.getByText(/manage.*projects/i)).toBeInTheDocument();
    });

    // Navigate to Time Tracking page
    const timeTrackingNavLink = screen.getByText('Time Tracking');
    fireEvent.click(timeTrackingNavLink);

    await waitFor(() => {
      expect(screen.getByText(/track.*time/i)).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully during navigation', async () => {
    const { authAPI, usersAPI, projectsAPI, analyticsAPI } = require('../../src/api/client');
    
    // Setup authenticated state but with API errors
    authAPI.getCurrentUser.mockResolvedValue(mockApiResponse(mockUser));
    analyticsAPI.getDashboardAnalytics.mockRejectedValue(new Error('API Error'));
    usersAPI.getUsers.mockRejectedValue(new Error('API Error'));
    projectsAPI.getProjects.mockRejectedValue(new Error('API Error'));

    localStorage.setItem('hubstaff_token', 'mock-token');
    localStorage.setItem('hubstaff_user', JSON.stringify(mockUser));

    // Mock console.error to prevent test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    // Should still render dashboard despite API errors
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});