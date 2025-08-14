/**
 * DashboardPage component tests
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { mockUser, mockProject, mockApiResponse, setupTest } from '../setup';

// Mock the API client
jest.mock('../../src/api/client', () => ({
  analyticsAPI: {
    getDashboardAnalytics: jest.fn(),
  },
  usersAPI: {
    getUsers: jest.fn(),
  },
  projectsAPI: {
    getProjects: jest.fn(),
  },
}));

// Mock hooks
jest.mock('../../src/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: false,
    onlineUsers: [],
    notifications: [],
    sendMessage: jest.fn(),
    markNotificationAsRead: jest.fn(),
  }),
}));

describe('DashboardPage Component', () => {
  beforeEach(() => {
    setupTest();
  });

  test('renders dashboard with user information', async () => {
    const { analyticsAPI, usersAPI, projectsAPI } = require('../../src/api/client');
    
    analyticsAPI.getDashboardAnalytics.mockResolvedValue(mockApiResponse({
      user_stats: {
        total_hours: 40.5,
        total_entries: 10,
        avg_activity: 85,
      },
      productivity_trend: [],
      project_breakdown: [],
      period: {
        start_date: '2025-01-01T00:00:00',
        end_date: '2025-01-31T23:59:59',
      },
    }));

    usersAPI.getUsers.mockResolvedValue(mockApiResponse([mockUser]));
    projectsAPI.getProjects.mockResolvedValue(mockApiResponse([mockProject]));

    const mockLogout = jest.fn();

    render(<DashboardPage user={mockUser} onLogout={mockLogout} />);

    // Check if user name is displayed in welcome message
    await waitFor(() => {
      expect(screen.getByText(new RegExp(mockUser.name, 'i'))).toBeInTheDocument();
    });

    // Check if Dashboard title is displayed
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    const { analyticsAPI, usersAPI, projectsAPI } = require('../../src/api/client');
    
    // Return promises that don't resolve immediately
    analyticsAPI.getDashboardAnalytics.mockReturnValue(new Promise(() => {}));
    usersAPI.getUsers.mockReturnValue(new Promise(() => {}));
    projectsAPI.getProjects.mockReturnValue(new Promise(() => {}));

    const mockLogout = jest.fn();

    render(<DashboardPage user={mockUser} onLogout={mockLogout} />);

    expect(screen.getByText(/loading your dashboard/i)).toBeInTheDocument();
  });

  test('displays dashboard widgets after loading', async () => {
    const { analyticsAPI, usersAPI, projectsAPI } = require('../../src/api/client');
    
    const mockAnalytics = {
      user_stats: {
        total_hours: 40.5,
        avg_activity: 85,
      },
      productivity_trend: [],
      project_breakdown: [],
    };

    analyticsAPI.getDashboardAnalytics.mockResolvedValue(mockApiResponse(mockAnalytics));
    usersAPI.getUsers.mockResolvedValue(mockApiResponse([mockUser]));
    projectsAPI.getProjects.mockResolvedValue(mockApiResponse([mockProject]));

    const mockLogout = jest.fn();

    render(<DashboardPage user={mockUser} onLogout={mockLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Hours Worked')).toBeInTheDocument();
      expect(screen.getByText('40.50h')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // Activity level
    });
  });

  test('displays team activity section', async () => {
    const { analyticsAPI, usersAPI, projectsAPI } = require('../../src/api/client');
    
    const activeUser = { ...mockUser, status: 'active' };
    
    analyticsAPI.getDashboardAnalytics.mockResolvedValue(mockApiResponse({
      user_stats: { total_hours: 0 },
      productivity_trend: [],
      project_breakdown: [],
    }));
    usersAPI.getUsers.mockResolvedValue(mockApiResponse([activeUser]));
    projectsAPI.getProjects.mockResolvedValue(mockApiResponse([]));

    const mockLogout = jest.fn();

    render(<DashboardPage user={mockUser} onLogout={mockLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Team Activity')).toBeInTheDocument();
      expect(screen.getByText(activeUser.name)).toBeInTheDocument();
    });
  });

  test('displays recent projects section', async () => {
    const { analyticsAPI, usersAPI, projectsAPI } = require('../../src/api/client');
    
    analyticsAPI.getDashboardAnalytics.mockResolvedValue(mockApiResponse({
      user_stats: { total_hours: 0 },
      productivity_trend: [],
      project_breakdown: [],
    }));
    usersAPI.getUsers.mockResolvedValue(mockApiResponse([]));
    projectsAPI.getProjects.mockResolvedValue(mockApiResponse([mockProject]));

    const mockLogout = jest.fn();

    render(<DashboardPage user={mockUser} onLogout={mockLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Recent Projects')).toBeInTheDocument();
      expect(screen.getByText(mockProject.name)).toBeInTheDocument();
      expect(screen.getByText(mockProject.client)).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    const { analyticsAPI, usersAPI, projectsAPI } = require('../../src/api/client');
    
    analyticsAPI.getDashboardAnalytics.mockRejectedValue(new Error('API Error'));
    usersAPI.getUsers.mockRejectedValue(new Error('API Error'));
    projectsAPI.getProjects.mockRejectedValue(new Error('API Error'));

    const mockLogout = jest.fn();

    // Mock console.error to prevent error logs in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<DashboardPage user={mockUser} onLogout={mockLogout} />);

    // Should still render without crashing
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  test('shows organization-specific welcome message', () => {
    const mockLogout = jest.fn();

    render(<DashboardPage user={mockUser} onLogout={mockLogout} />);

    // Should show organization name in welcome message
    expect(screen.getByText(new RegExp(mockUser.organization_name, 'i'))).toBeInTheDocument();
  });

  test('shows different message for admin users', () => {
    const adminUser = { ...mockUser, role: 'admin', is_organization_owner: true };
    const mockLogout = jest.fn();

    render(<DashboardPage user={adminUser} onLogout={mockLogout} />);

    // Should show admin-specific message
    expect(screen.getByText(/you're managing/i)).toBeInTheDocument();
  });
});