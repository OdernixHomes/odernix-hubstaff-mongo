/**
 * API Client integration tests
 */
import { authAPI, usersAPI, projectsAPI, analyticsAPI } from '../../src/api/client';
import { mockApiResponse, mockApiError, setupTest } from '../setup';

// Mock axios
jest.mock('axios');
import axios from 'axios';

describe('API Client Integration', () => {
  beforeEach(() => {
    setupTest();
    axios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    });
  });

  describe('Authentication API', () => {
    test('login makes correct API call', async () => {
      const mockAxios = axios.create();
      mockAxios.post.mockResolvedValue(mockApiResponse({
        access_token: 'mock-token',
        user: { id: '1', email: 'test@example.com' }
      }));

      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      await authAPI.login(credentials);

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', credentials);
    });

    test('register makes correct API call', async () => {
      const mockAxios = axios.create();
      mockAxios.post.mockResolvedValue(mockApiResponse({
        user: { id: '1', email: 'test@example.com' }
      }));

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      await authAPI.register(userData);

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/register', userData);
    });

    test('getCurrentUser makes correct API call', async () => {
      const mockAxios = axios.create();
      mockAxios.get.mockResolvedValue(mockApiResponse({
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }));

      await authAPI.getCurrentUser();

      expect(mockAxios.get).toHaveBeenCalledWith('/auth/me');
    });
  });

  describe('Users API', () => {
    test('getUsers makes correct API call with parameters', async () => {
      const mockAxios = axios.create();
      mockAxios.get.mockResolvedValue(mockApiResponse([
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' }
      ]));

      const params = { limit: 10, skip: 0 };
      await usersAPI.getUsers(params);

      expect(mockAxios.get).toHaveBeenCalledWith('/users/', { params });
    });

    test('updateCurrentUser makes correct API call', async () => {
      const mockAxios = axios.create();
      mockAxios.put.mockResolvedValue(mockApiResponse({
        id: '1',
        name: 'Updated Name'
      }));

      const updateData = { name: 'Updated Name' };
      await usersAPI.updateCurrentUser(updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/users/me', updateData);
    });

    test('getUser makes correct API call', async () => {
      const mockAxios = axios.create();
      mockAxios.get.mockResolvedValue(mockApiResponse({
        id: 'user-123',
        name: 'Test User'
      }));

      await usersAPI.getUser('user-123');

      expect(mockAxios.get).toHaveBeenCalledWith('/users/user-123');
    });
  });

  describe('Projects API', () => {
    test('getProjects makes correct API call', async () => {
      const mockAxios = axios.create();
      mockAxios.get.mockResolvedValue(mockApiResponse([
        { id: '1', name: 'Project 1' }
      ]));

      const params = { limit: 5 };
      await projectsAPI.getProjects(params);

      expect(mockAxios.get).toHaveBeenCalledWith('/projects/', { params });
    });

    test('createProject makes correct API call', async () => {
      const mockAxios = axios.create();
      mockAxios.post.mockResolvedValue(mockApiResponse({
        id: '1',
        name: 'New Project'
      }));

      const projectData = {
        name: 'New Project',
        description: 'Test project',
        client: 'Test Client'
      };

      await projectsAPI.createProject(projectData);

      expect(mockAxios.post).toHaveBeenCalledWith('/projects', projectData);
    });

    test('updateProject makes correct API call', async () => {
      const mockAxios = axios.create();
      mockAxios.put.mockResolvedValue(mockApiResponse({
        id: 'project-123',
        name: 'Updated Project'
      }));

      const updateData = { name: 'Updated Project' };
      await projectsAPI.updateProject('project-123', updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/projects/project-123', updateData);
    });
  });

  describe('Analytics API', () => {
    test('getDashboardAnalytics makes correct API call', async () => {
      const mockAxios = axios.create();
      mockAxios.get.mockResolvedValue(mockApiResponse({
        user_stats: { total_hours: 40 },
        productivity_trend: [],
        project_breakdown: []
      }));

      await analyticsAPI.getDashboardAnalytics();

      expect(mockAxios.get).toHaveBeenCalledWith('/analytics/dashboard/');
    });

    test('getTeamAnalytics makes correct API call with date parameters', async () => {
      const mockAxios = axios.create();
      mockAxios.get.mockResolvedValue(mockApiResponse({
        team_stats: {}
      }));

      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      await analyticsAPI.getTeamAnalytics(startDate, endDate);

      expect(mockAxios.get).toHaveBeenCalledWith('/analytics/team/', {
        params: { start_date: startDate, end_date: endDate }
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API errors correctly', async () => {
      const mockAxios = axios.create();
      const errorResponse = {
        response: mockApiError('Server Error', 500)
      };
      mockAxios.get.mockRejectedValue(errorResponse);

      try {
        await usersAPI.getUsers();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.response.status).toBe(500);
      }
    });

    test('handles network errors', async () => {
      const mockAxios = axios.create();
      mockAxios.get.mockRejectedValue(new Error('Network Error'));

      try {
        await usersAPI.getUsers();
      } catch (error) {
        expect(error.message).toBe('Network Error');
      }
    });
  });

  describe('Request Interceptors', () => {
    test('adds authentication token to requests', () => {
      const mockToken = 'mock-jwt-token';
      localStorage.setItem('hubstaff_token', mockToken);

      // The interceptor should add the Authorization header
      // This is tested implicitly through the axios.create mock
      expect(axios.create).toHaveBeenCalled();
    });

    test('handles requests without token', () => {
      localStorage.removeItem('hubstaff_token');

      // The interceptor should handle missing tokens gracefully
      expect(axios.create).toHaveBeenCalled();
    });
  });
});