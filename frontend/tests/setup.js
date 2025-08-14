/**
 * Frontend test setup and utilities
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
}));

// Mock environment variables
process.env.REACT_APP_BACKEND_URL = 'http://localhost:8001';

// Test utilities
export const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  organization_id: 'test-org-id',
  organization_name: 'Test Organization',
  status: 'active',
  timezone: 'UTC',
  avatar: null,
  is_organization_owner: false,
  email_verified: true,
  created_at: '2025-01-01T00:00:00',
  last_active: null
};

export const mockAdminUser = {
  ...mockUser,
  name: 'Test Admin',
  email: 'admin@example.com',
  role: 'admin',
  is_organization_owner: true
};

export const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'A test project',
  client: 'Test Client',
  budget: 5000,
  spent: 1000,
  hours_tracked: 20,
  status: 'active',
  created_by: 'test-user-id',
  organization_id: 'test-org-id',
  team_members: ['test-user-id'],
  created_at: '2025-01-01T00:00:00',
  updated_at: '2025-01-01T00:00:00',
  deadline: '2025-12-31T23:59:59'
};

export const mockApiResponse = (data, status = 200) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

export const mockApiError = (message = 'API Error', status = 500) => ({
  status,
  ok: false,
  json: async () => ({ error: message, detail: message }),
  text: async () => JSON.stringify({ error: message }),
});

// Setup function for tests
export const setupTest = () => {
  // Clear all mocks
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  
  // Reset fetch mock
  fetch.mockClear();
  
  return {
    localStorage: localStorageMock,
    fetch: global.fetch,
  };
};