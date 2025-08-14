import React, { useState, useEffect } from 'react';
import { productivityAPI } from '../api/client';
import AdminProductivityDashboard from '../components/AdminProductivityDashboard';

const ProductivityReportsPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userReport, setUserReport] = useState(null);
  const [organizationReport, setOrganizationReport] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState('week');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    fetchReports();
  }, [selectedDateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange(selectedDateRange);

      // Fetch user's own report
      const userReportResponse = await productivityAPI.getUserReport(
        user.id,
        dateRange.start,
        dateRange.end
      );
      setUserReport(userReportResponse.data);

      // Fetch organization report if user is admin
      if (user.role === 'admin' || user.role === 'owner') {
        const orgReportResponse = await productivityAPI.getOrganizationReport(
          dateRange.start,
          dateRange.end
        );
        setOrganizationReport(orgReportResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
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
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 1);
        return { start: quarterStart, end: quarterEnd };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
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

  const getProductivityColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProductivityLevel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    if (score >= 20) return 'Below Average';
    return 'Needs Improvement';
  };

  const PersonalReportTab = () => (
    <div className="space-y-6">
      {userReport ? (
        <>
          {/* Personal Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 text-xl">⏱️</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Total Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(userReport.total_tracked_time)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-green-600 text-xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Productivity</p>
                  <p className={`text-2xl font-bold ${getProductivityColor(userReport.overall_productivity_score)}`}>
                    {userReport.overall_productivity_score?.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {getProductivityLevel(userReport.overall_productivity_score)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-purple-600 text-xl">🎯</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Focus Score</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {userReport.focus_score?.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <span className="text-orange-600 text-xl">📸</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Screenshots</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {userReport.screenshots_taken}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Distribution */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Active Time</span>
                    <span>{formatDuration(userReport.active_time)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{width: `${(userReport.active_time / userReport.total_tracked_time) * 100}%`}}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Idle Time</span>
                    <span>{formatDuration(userReport.idle_time)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{width: `${(userReport.idle_time / userReport.total_tracked_time) * 100}%`}}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Break Time</span>
                    <span>{formatDuration(userReport.break_time)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{width: `${(userReport.break_time / userReport.total_tracked_time) * 100}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Applications */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Applications</h3>
              {userReport.top_applications?.length > 0 ? (
                <div className="space-y-3">
                  {userReport.top_applications.slice(0, 5).map((app, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm">{app.name?.charAt(0) || '📱'}</span>
                        </div>
                        <span className="text-sm font-medium">{app.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatDuration(app.duration)}</div>
                        <div className="text-xs text-gray-500">{((app.duration / userReport.total_tracked_time) * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No application data available</p>
              )}
            </div>
          </div>

          {/* Productivity Insights */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {userReport.productive_time_percentage?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Productive Time</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {userReport.neutral_time_percentage?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Neutral Time</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {userReport.distracting_time_percentage?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Distracting Time</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {userReport.recommendations?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">💡 Personalized Recommendations</h3>
              <ul className="space-y-2">
                {userReport.recommendations.map((rec, index) => (
                  <li key={index} className="text-blue-700 flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Most Productive Hours */}
          {userReport.most_productive_hours?.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Productive Hours</h3>
              <div className="flex flex-wrap gap-2">
                {userReport.most_productive_hours.map((hour, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {hour}:00 - {hour + 1}:00
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Consider scheduling your most important tasks during these hours for maximum productivity.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Start tracking your time to see productivity insights here.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Productivity Reports</h1>
          <p className="mt-2 text-gray-600">
            Track and analyze your productivity patterns and insights
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex space-x-1 mb-4 sm:mb-0">
            {(user.role === 'admin' || user.role === 'owner') && (
              <>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'overview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Team Overview
                </button>
                <button
                  onClick={() => setActiveTab('personal')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'personal'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Personal Report
                </button>
              </>
            )}
          </div>
          
          <div className="flex space-x-2">
            {['today', 'week', 'month', 'quarter'].map(range => (
              <button
                key={range}
                onClick={() => setSelectedDateRange(range)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  selectedDateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : (
          <>
            {(user.role === 'admin' || user.role === 'owner') && activeTab === 'overview' ? (
              <AdminProductivityDashboard user={user} />
            ) : (
              <PersonalReportTab />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductivityReportsPage;