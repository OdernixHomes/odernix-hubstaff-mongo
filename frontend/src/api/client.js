import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API_BASE = `${BACKEND_URL}/api`;

// Debug logging
console.log('Backend URL:', BACKEND_URL);
console.log('API Base:', API_BASE);

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hubstaff_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      // Only redirect to login if it's not a login request failure
      localStorage.removeItem('hubstaff_token');
      localStorage.removeItem('hubstaff_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  getCurrentUser: () => apiClient.get('/auth/me'),
  inviteUser: (inviteData) => apiClient.post('/auth/invite', inviteData),
  acceptInvite: (acceptData) => apiClient.post('/auth/accept-invite', acceptData),
  getInvitations: () => apiClient.get('/auth/invitations'),
  getAllInvitations: () => apiClient.get('/auth/invitations/all'),
  forgotPassword: (forgotData) => apiClient.post('/auth/forgot-password', forgotData),
  resetPassword: (resetData) => apiClient.post('/auth/reset-password', resetData),
};

// Organization API (NEW - SECURE REGISTRATION)
export const organizationAPI = {
  register: (registrationData) => apiClient.post('/organizations/register', registrationData),
  getMyOrganization: () => apiClient.get('/organizations/me'),
  updateOrganization: (updateData) => apiClient.put('/organizations/me', updateData),
  getStats: () => apiClient.get('/organizations/stats'),
  getMembers: () => apiClient.get('/organizations/members'),
  inviteUser: (inviteData) => apiClient.post('/organizations/invite', inviteData),
  getInvitations: () => apiClient.get('/organizations/invitations'),
  getAuditLog: (params = {}) => apiClient.get('/organizations/audit-log', { params }),
};

// Users API
export const usersAPI = {
  getUsers: (params = {}) => apiClient.get('/users/', { params }),
  getUser: (userId) => apiClient.get(`/users/${userId}`),
  updateUser: (userId, userData) => apiClient.put(`/users/${userId}`, userData),
  updateCurrentUser: (userData) => apiClient.put('/users/me', userData),
  deleteUser: (userId) => apiClient.delete(`/users/${userId}`),
  getTeamStats: () => apiClient.get('/users/team/stats'),
};

// Projects API
export const projectsAPI = {
  getProjects: (params = {}) => apiClient.get('/projects/', { params }),
  getProject: (projectId) => apiClient.get(`/projects/${projectId}`),
  createProject: (projectData) => apiClient.post('/projects', projectData),
  updateProject: (projectId, projectData) => apiClient.put(`/projects/${projectId}`, projectData),
  deleteProject: (projectId) => apiClient.delete(`/projects/${projectId}`),
  getProjectTasks: (projectId) => apiClient.get(`/projects/${projectId}/tasks`),
  createTask: (projectId, taskData) => apiClient.post(`/projects/${projectId}/tasks`, taskData),
  getProjectStats: () => apiClient.get('/projects/stats/dashboard'),
  // Task management
  getAllTasks: () => apiClient.get('/projects/tasks/all'),
  getAssignedTasks: () => apiClient.get('/projects/tasks/assigned'),
  updateTask: (taskId, taskData) => apiClient.put(`/projects/tasks/${taskId}`, taskData),
};

// Time Tracking API
export const timeTrackingAPI = {
  startTracking: (data) => apiClient.post('/time-tracking/start', data),
  stopTracking: (entryId) => apiClient.post(`/time-tracking/stop/${entryId}`),
  pauseTracking: (entryId) => apiClient.post(`/time-tracking/pause/${entryId}`),
  resumeTracking: (entryId) => apiClient.post(`/time-tracking/resume/${entryId}`),
  getActiveEntry: () => apiClient.get('/time-tracking/active'),
  getTimeEntries: (params = {}) => apiClient.get('/time-tracking/entries', { params }),
  createManualEntry: (data) => apiClient.post('/time-tracking/manual', data),
  updateTimeEntry: (entryId, data) => apiClient.put(`/time-tracking/entries/${entryId}`, data),
  recordActivity: (data) => apiClient.post('/time-tracking/activity', data),
  uploadScreenshot: (entryId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/time-tracking/screenshot?time_entry_id=${entryId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getDailyReport: (date) => apiClient.get('/time-tracking/reports/daily', { params: { date } }),
  getTeamTimeReport: (startDate, endDate) => apiClient.get('/time-tracking/reports/team', { 
    params: { start_date: startDate, end_date: endDate } 
  }),
};

// Analytics API
export const analyticsAPI = {
  getDashboardAnalytics: () => apiClient.get('/analytics/dashboard/'),
  getTeamAnalytics: (startDate, endDate) => apiClient.get('/analytics/team/', {
    params: { start_date: startDate, end_date: endDate }
  }),
  getProductivityAnalytics: (period = 'week') => apiClient.get('/analytics/productivity/', {
    params: { period }
  }),
  getScreenshotStats: (startDate, endDate) => apiClient.get('/analytics/screenshots/stats/', {
    params: { start_date: startDate, end_date: endDate }
  }),
  generateCustomReport: (params) => apiClient.get('/analytics/reports/custom/', { params }),
};

// Integrations API
export const integrationsAPI = {
  getIntegrations: () => apiClient.get('/integrations/'),
  connectSlack: (webhookUrl) => apiClient.post('/integrations/slack/connect', { webhook_url: webhookUrl }),
  connectTrello: (apiKey, token) => apiClient.post('/integrations/trello/connect', { api_key: apiKey, token }),
  connectGitHub: (token) => apiClient.post('/integrations/github/connect', { token }),
  sendSlackNotification: (message, channel) => apiClient.post('/integrations/slack/notify', { message, channel }),
  createTrelloCard: (listId, name, description) => apiClient.post('/integrations/trello/create-card', { list_id: listId, name, description }),
  createGitHubIssue: (repo, title, body, labels) => apiClient.post('/integrations/github/create-issue', { repo, title, body, labels }),
  disconnectIntegration: (integrationId) => apiClient.delete(`/integrations/${integrationId}`),
};

// WebSocket API
export const websocketAPI = {
  getOnlineUsers: () => apiClient.get('/online-users/'),
};

// Activity Monitoring API
export const activityAPI = {
  // Activity updates
  updateActivity: (activityData) => apiClient.post('/monitoring/activity/update', activityData),
  
  // Screenshot management
  uploadScreenshot: (formData) => apiClient.post('/monitoring/screenshot/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getScreenshots: (timeEntryId) => apiClient.get(`/monitoring/screenshots/${timeEntryId}`),
  deleteScreenshot: (screenshotId) => apiClient.delete(`/monitoring/screenshots/${screenshotId}`),
  
  // Application tracking
  recordApplicationSwitch: (appData) => apiClient.post('/monitoring/application/switch', appData),
  
  // Website tracking
  recordWebsiteNavigation: (navData) => apiClient.post('/monitoring/website/navigate', navData),
  
  // Monitoring settings
  getMonitoringSettings: () => apiClient.get('/monitoring/settings'),
  updateMonitoringSettings: (settings) => apiClient.put('/monitoring/settings', settings),
};

// Productivity Tracking API
export const productivityAPI = {
  // Tracking control
  startTracking: (data) => apiClient.post('/productivity/tracking/start', data),
  stopTracking: (timeEntryId) => apiClient.post('/productivity/tracking/stop', { time_entry_id: timeEntryId }),
  updateActivity: (timeEntryId, activityData) => apiClient.post('/productivity/tracking/activity', {
    time_entry_id: timeEntryId,
    ...activityData
  }),
  
  // Screenshot management
  uploadScreenshot: (formData) => apiClient.post('/productivity/screenshots/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Reports and analytics
  getUserReport: (userId, startDate, endDate) => apiClient.get(`/productivity/reports/user/${userId}`, {
    params: { start_date: startDate, end_date: endDate }
  }),
  getOrganizationReport: (startDate, endDate) => apiClient.get('/productivity/reports/organization', {
    params: { start_date: startDate, end_date: endDate }
  }),
  
  // Alerts management
  getAlerts: (limit = 50, unreadOnly = false) => apiClient.get('/productivity/alerts', {
    params: { limit, unread_only: unreadOnly }
  }),
  markAlertAsRead: (alertId) => apiClient.put(`/productivity/alerts/${alertId}/read`),
  
  // Active users monitoring
  getActiveUsers: () => apiClient.get('/productivity/users/active'),
  
  // Privacy and consent
  getPrivacySettings: () => apiClient.get('/productivity/privacy/settings'),
  recordConsent: (consentGiven) => apiClient.post('/productivity/consent', { consent_given: consentGiven }),
};

// Advanced Analytics API
export const advancedAnalyticsAPI = {
  // Enhanced dashboard
  getEnhancedDashboard: (days = 7) => apiClient.get('/advanced-analytics/dashboard/enhanced', {
    params: { days }
  }),
  
  // Detailed analytics
  getDetailedProductivity: (startDate, endDate, granularity = 'daily') => 
    apiClient.get('/advanced-analytics/productivity/detailed', {
      params: { start_date: startDate, end_date: endDate, granularity }
    }),
  
  // Team analytics
  getComprehensiveTeamAnalytics: (startDate, endDate, teamIds = null) =>
    apiClient.get('/advanced-analytics/team/comprehensive', {
      params: { start_date: startDate, end_date: endDate, team_ids: teamIds }
    }),
  
  // Goals management
  createGoal: (goalData) => apiClient.post('/advanced-analytics/goals', goalData),
  getGoals: (activeOnly = true) => apiClient.get('/advanced-analytics/goals', {
    params: { active_only: activeOnly }
  }),
  updateGoal: (goalId, goalData) => apiClient.put(`/advanced-analytics/goals/${goalId}`, goalData),
  
  // Reports
  generateCustomReport: (reportData) => apiClient.post('/advanced-analytics/reports/generate', reportData),
  
  // Insights
  getProductivityInsights: (days = 7) => apiClient.get('/advanced-analytics/insights', {
    params: { days }
  }),
  
  // Heatmap
  getProductivityHeatmap: (startDate, endDate) => apiClient.get('/advanced-analytics/heatmap', {
    params: { start_date: startDate, end_date: endDate }
  }),
  
  // Alerts
  getProductivityAlerts: (unresolvedOnly = true) => apiClient.get('/advanced-analytics/alerts', {
    params: { unresolved_only: unresolvedOnly }
  }),
};

// Health check API
export const healthAPI = {
  checkConnection: async () => {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return { success: response.ok, status: response.status };
    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false, error: error.message };
    }
  }
};

export default apiClient;