import React, { useState, useEffect } from 'react';
import { Avatar } from './Avatar';
import { activityAPI, usersAPI } from '../api/client';

export const ScreenshotsGallery = ({ user }) => {
  const [screenshots, setScreenshots] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 });

  // Check if user has admin access
  const hasAdminAccess = user.role === 'admin' || user.role === 'manager';

  useEffect(() => {
    if (hasAdminAccess) {
      fetchUsers();
      fetchScreenshots();
    }
  }, [hasAdminAccess]);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchScreenshots();
    }
  }, [selectedUser, selectedDate, pagination.offset]);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchScreenshots = async () => {
    if (!hasAdminAccess) return;
    
    setLoading(true);
    try {
      // Calculate date range based on selection
      const params = {
        limit: pagination.limit,
        offset: pagination.offset
      };

      if (selectedUser) {
        params.user_id = selectedUser;
      }

      if (selectedDate) {
        const now = new Date();
        let startDate, endDate;

        switch (selectedDate) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'this-week':
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
            endDate = new Date();
            break;
          case 'last-week':
            const lastWeekEnd = new Date(now.setDate(now.getDate() - now.getDay()));
            const lastWeekStart = new Date(lastWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate = lastWeekStart;
            endDate = lastWeekEnd;
            break;
          case 'this-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date();
            break;
          default:
            // No date filter
            break;
        }

        if (startDate && endDate) {
          params.start_date = startDate.toISOString();
          params.end_date = endDate.toISOString();
        }
      }

      console.log('Fetching screenshots with params:', params);
      const response = await activityAPI.getAdminScreenshots(params);
      setScreenshots(response.data.screenshots || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total_count || 0
      }));

    } catch (error) {
      console.error('Failed to fetch screenshots:', error);
      if (error.response?.status === 403) {
        setScreenshots([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getActivityLevelColor = (level) => {
    if (level >= 80) return 'text-green-600 bg-green-100';
    if (level >= 60) return 'text-yellow-600 bg-yellow-100';
    if (level >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const openScreenshotModal = (screenshot) => {
    setSelectedScreenshot(screenshot);
  };

  const closeScreenshotModal = () => {
    setSelectedScreenshot(null);
  };

  if (!hasAdminAccess) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Access Restricted</h3>
          <p className="text-gray-500">Only administrators and managers can view team screenshots.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">📸</span>
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Team Screenshots
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">👤 Team Member</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Members</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📅 Date Range</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="last-week">Last Week</option>
              <option value="this-month">This Month</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: 0 }))}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-medium"
            >
              🔍 Apply Filters
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Total screenshots: <span className="font-semibold">{pagination.total}</span>
        </div>
      </div>

      {/* Screenshots Grid */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600"></div>
              <p className="text-gray-600">Loading screenshots...</p>
            </div>
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📸</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Screenshots Found</h3>
            <p className="text-gray-500">No screenshots found for the selected criteria. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {screenshots.map((screenshot) => (
                <div 
                  key={screenshot.id} 
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden cursor-pointer group"
                  onClick={() => openScreenshotModal(screenshot)}
                >
                  {/* Screenshot Preview */}
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    {screenshot.thumbnail_url ? (
                      <img
                        src={screenshot.thumbnail_url}
                        alt={`Screenshot by ${screenshot.user_name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full flex items-center justify-center text-gray-400" style={{ display: screenshot.thumbnail_url ? 'none' : 'flex' }}>
                      <div className="text-center">
                        <span className="text-4xl mb-2 block">📷</span>
                        <span className="text-sm">No Preview</span>
                      </div>
                    </div>

                    {/* Activity Level Badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityLevelColor(screenshot.activity_level)}`}>
                        {Math.round(screenshot.activity_level)}%
                      </span>
                    </div>
                  </div>

                  {/* Screenshot Info */}
                  <div className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar user={{ name: screenshot.user_name }} size="sm" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{screenshot.user_name}</h4>
                        <p className="text-xs text-gray-500 truncate">{screenshot.user_email}</p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1">
                      <div>📅 {formatTimestamp(screenshot.timestamp)}</div>
                      <div>📊 Activity: {Math.round(screenshot.activity_level)}%</div>
                      <div>🏷️ Type: {screenshot.screenshot_type}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} screenshots
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                    disabled={pagination.offset === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                    disabled={pagination.offset + pagination.limit >= pagination.total}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl max-h-full overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Avatar user={{ name: selectedScreenshot.user_name }} size="sm" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedScreenshot.user_name}</h3>
                    <p className="text-sm text-gray-600">{formatTimestamp(selectedScreenshot.timestamp)}</p>
                  </div>
                </div>
                
                <button
                  onClick={closeScreenshotModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                {selectedScreenshot.screenshot_url ? (
                  <img
                    src={selectedScreenshot.screenshot_url}
                    alt={`Screenshot by ${selectedScreenshot.user_name}`}
                    className="w-full h-auto rounded-lg shadow-lg max-h-96 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <span className="text-6xl mb-4 block">📷</span>
                      <span>Screenshot not available</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">📊 Activity Level:</span>
                  <div className={`mt-1 px-2 py-1 rounded-full text-xs font-medium inline-block ${getActivityLevelColor(selectedScreenshot.activity_level)}`}>
                    {Math.round(selectedScreenshot.activity_level)}%
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">🏷️ Type:</span>
                  <p className="text-gray-600 mt-1 capitalize">{selectedScreenshot.screenshot_type}</p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">📧 Email:</span>
                  <p className="text-gray-600 mt-1 text-xs">{selectedScreenshot.user_email}</p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">🆔 ID:</span>
                  <p className="text-gray-600 mt-1 text-xs font-mono">{selectedScreenshot.id.slice(0, 8)}...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};