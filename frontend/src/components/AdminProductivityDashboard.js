import React, { useState, useEffect } from 'react';
import { productivityAPI } from '../api/client';

const AdminProductivityDashboard = ({ user }) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [organizationReport, setOrganizationReport] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState('today');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userReport, setUserReport] = useState(null);

  useEffect(() => {
    if (user.role === 'admin' || user.role === 'owner') {
      fetchDashboardData();
      
      // Refresh data every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user.role, selectedDateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch active users
      const activeUsersResponse = await productivityAPI.getActiveUsers();
      setActiveUsers(activeUsersResponse.data.active_users || []);
      
      // Fetch alerts
      const alertsResponse = await productivityAPI.getAlerts(20, true);
      setAlerts(alertsResponse.data.alerts || []);
      
      // Fetch organization report
      const dateRange = getDateRange(selectedDateRange);
      const orgReportResponse = await productivityAPI.getOrganizationReport(
        dateRange.start,
        dateRange.end
      );
      setOrganizationReport(orgReportResponse.data);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReport = async (userId) => {
    try {
      const dateRange = getDateRange(selectedDateRange);
      const response = await productivityAPI.getUserReport(
        userId,
        dateRange.start,
        dateRange.end
      );
      setUserReport(response.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Failed to fetch user report:', error);
    }
  };

  const markAlertAsRead = async (alertId) => {
    try {
      await productivityAPI.markAlertAsRead(alertId);
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, is_read: true } : alert
      ));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const getDateRange = (range) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case 'week':
        const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
        return {
          start: weekStart,
          end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return { start: monthStart, end: monthEnd };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };

  const getActivityStatusColor = (level) => {
    if (level >= 80) return 'bg-green-500';
    if (level >= 60) return 'bg-blue-500';
    if (level >= 40) return 'bg-yellow-500';
    if (level >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (user.role !== 'admin' && user.role !== 'owner') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Admin access required to view productivity dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Productivity Dashboard
        </h2>
        <div className="flex space-x-2">
          {['today', 'week', 'month'].map(range => (
            <button
              key={range}
              onClick={() => setSelectedDateRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedDateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Organization Overview */}
      {organizationReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {organizationReport.total_users_tracked}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">⏱️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Tracked Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {organizationReport.total_tracked_hours?.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Avg Productivity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {organizationReport.avg_productivity_score?.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 text-xl">🚨</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {alerts.filter(a => !a.is_read).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currently Active Users */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Currently Active Users
              </h3>
              <span className="text-sm text-gray-500">
                {activeUsers.length} active
              </span>
            </div>
          </div>
          <div className="p-6">
            {activeUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No users currently being tracked
              </p>
            ) : (
              <div className="space-y-4">
                {activeUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => fetchUserReport(user.user_id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {user.user_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getActivityStatusColor(user.current_activity_level)} rounded-full border-2 border-white`}></div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.user_name}</p>
                        <p className="text-sm text-gray-500">
                          {user.current_application || 'No app detected'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {user.current_activity_level?.toFixed(0)}% active
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDuration(user.tracking_duration)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Alerts
            </h3>
          </div>
          <div className="p-6">
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No recent alerts
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertSeverityColor(alert.severity)} ${
                      alert.is_read ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs mt-1">{alert.message}</p>
                        <p className="text-xs mt-2 opacity-75">
                          {new Date(alert.triggered_at).toLocaleString()}
                        </p>
                      </div>
                      {!alert.is_read && (
                        <button
                          onClick={() => markAlertAsRead(alert.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 ml-2"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && userReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  User Productivity Report
                </h3>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setUserReport(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatDuration(userReport.total_tracked_time)}
                  </div>
                  <div className="text-sm text-gray-500">Tracked Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {userReport.overall_productivity_score?.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Productivity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {userReport.focus_score?.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Focus Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {userReport.screenshots_taken}
                  </div>
                  <div className="text-sm text-gray-500">Screenshots</div>
                </div>
              </div>

              {userReport.top_applications?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Top Applications</h4>
                  <div className="space-y-2">
                    {userReport.top_applications.slice(0, 5).map((app, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{app.name}</span>
                        <span className="text-gray-500">{formatDuration(app.duration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userReport.recommendations?.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {userReport.recommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductivityDashboard;