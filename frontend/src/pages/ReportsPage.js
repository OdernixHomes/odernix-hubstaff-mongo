import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { DashboardWidget } from "../components/DashboardWidget";
import { ProductivityChart, TimeTrackingChart } from "../components/Charts";
import { Avatar } from "../components/Avatar";
import { analyticsAPI } from "../api/client";

export const ReportsPage = ({ user, onLogout }) => {
  const [dateRange, setDateRange] = useState("this-week");
  const [selectedTeamMember, setSelectedTeamMember] = useState("all");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedTeamMember]);

  const fetchAnalyticsData = async () => {
    try {
      const [dashboardResponse, teamResponse, productivityResponse] = await Promise.all([
        analyticsAPI.getDashboardAnalytics(),
        analyticsAPI.getTeamAnalytics(),
        analyticsAPI.getProductivityAnalytics(dateRange === 'this-week' ? 'week' : 'month')
      ]);

      setAnalyticsData({
        dashboard: dashboardResponse.data,
        team: teamResponse.data,
        productivity: productivityResponse.data
      });
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
        <Header 
          user={user} 
          onLogout={onLogout} 
          currentPage="Reports" 
          onToggleMobileSidebar={toggleMobileSidebar}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />
        <div className="flex">
          <Sidebar 
            currentPage="Reports" 
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={closeMobileSidebar}
          />
          <main className="flex-1 lg:ml-64 p-3 sm:p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-200 border-t-violet-600"></div>
                  <p className="text-gray-600 text-sm">Loading reports...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const reportData = analyticsData?.dashboard?.user_stats || {
    total_hours: 0,
    avg_activity: 0,
    projects_count: 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        currentPage="Reports" 
        onToggleMobileSidebar={toggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      <div className="flex">
        <Sidebar 
          currentPage="Reports" 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
        
        <main className="flex-1 lg:ml-64 p-3 sm:p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header Section */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-purple-600/5 rounded-2xl"></div>
              <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg sm:text-xl">📊</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Analytics & Reports
                  </h1>
                </div>
                <p className="text-gray-600 text-sm sm:text-lg">
                  Analyze your team's productivity and time tracking data, <span className="font-semibold text-violet-600">{user.name}</span>.
                </p>
              </div>
            </div>

            {/* Enhanced Filters */}
            <div className="relative group mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">🔍</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    Filter & Generate Reports
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">
                      📅 Date Range
                    </label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    >
                      <option value="today">📅 Today</option>
                      <option value="this-week">📊 This Week</option>
                      <option value="this-month">📈 This Month</option>
                      <option value="last-month">📉 Last Month</option>
                      <option value="custom">⚙️ Custom Range</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">
                      👥 Team Member
                    </label>
                    <select
                      value={selectedTeamMember}
                      onChange={(e) => setSelectedTeamMember(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    >
                      <option value="all">👥 All Members</option>
                      {analyticsData?.team?.team_stats?.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          👤 {member.user_name}
                        </option>
                      )) || []}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                    <button 
                      onClick={fetchAnalyticsData}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-violet-600 hover:to-purple-700 w-full font-medium transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm"
                    >
                      <span>📊</span>
                      <span>Generate Report</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Report Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <DashboardWidget 
                title="Total Hours" 
                value={`${(reportData.total_hours || 0).toFixed(2)}h`} 
                subtitle="This period" 
                icon="⏰" 
                color="blue" 
              />
              <DashboardWidget 
                title="Average Daily" 
                value={`${((reportData.total_hours || 0) / 7).toFixed(1)}h`} 
                subtitle="Per day" 
                icon="📊" 
                color="green" 
              />
              <DashboardWidget 
                title="Productivity" 
                value={`${Math.round(reportData.avg_activity || 0)}%`} 
                subtitle="Average activity" 
                icon="📈" 
                color="purple" 
              />
              <DashboardWidget 
                title="Active Projects" 
                value={reportData.projects_count || 0} 
                subtitle="Currently running" 
                icon="📁" 
                color="orange" 
              />
              <DashboardWidget 
                title="Screenshots" 
                value="1,250" 
                subtitle="Captured this period" 
                icon="📸" 
                color="blue" 
              />
              <DashboardWidget 
                title="Activity Score" 
                value={`${Math.round(analyticsData?.productivity?.productivity_score || 0)}%`} 
                subtitle="Overall performance" 
                icon="⚡" 
                color="green" 
              />
            </div>

            {/* Enhanced Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Time Tracking Chart */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                  <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm">📊</span>
                    </div>
                    <h3 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Time Tracking Overview
                    </h3>
                  </div>
                  <div className="h-48 sm:h-64 bg-white/50 rounded-xl flex items-center justify-center border border-white/20">
                    {analyticsData?.productivity?.productivity_chart ? (
                      <TimeTrackingChart data={analyticsData.productivity.productivity_chart} />
                    ) : (
                      <div className="text-center">
                        <div className="w-full h-48 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="animate-pulse">
                              <span className="text-white text-3xl">📊</span>
                            </div>
                            <span className="text-white text-lg font-semibold">Loading Chart Data...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Productivity Trends Chart */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                  <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm">⚡</span>
                    </div>
                    <h3 className="text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      Productivity Trends
                    </h3>
                  </div>
                  <div className="h-48 sm:h-64 bg-white/50 rounded-xl flex items-center justify-center border border-white/20">
                    {analyticsData?.dashboard?.productivity_trend ? (
                      <ProductivityChart data={analyticsData.dashboard.productivity_trend} />
                    ) : (
                      <div className="text-center">
                        <div className="w-full h-48 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="animate-pulse">
                              <span className="text-white text-3xl">⚡</span>
                            </div>
                            <span className="text-white text-lg font-semibold">Loading Analytics...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Detailed Reports */}
            <div className="mt-12">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-gray-600/5 rounded-2xl"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
                  <div className="p-4 sm:p-6 border-b border-white/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-slate-500 to-gray-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs sm:text-sm">📋</span>
                      </div>
                      <h3 className="text-base sm:text-xl font-bold bg-gradient-to-r from-slate-600 to-gray-700 bg-clip-text text-transparent">
                        Detailed Time Report
                      </h3>
                    </div>
                  </div>
                  
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📅 Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">👤 Member</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📁 Project</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">⏰ Hours</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📊 Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/20">
                        {analyticsData?.team?.team_stats?.map((member, index) => (
                          <tr key={member.user_id} className="hover:bg-white/60 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {new Date(Date.now() - index * 86400000).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <Avatar user={{name: member.user_name}} size="sm" />
                                <span className="text-sm font-semibold text-gray-900">{member.user_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                              Project {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-bold text-blue-600">{(member.total_hours || 0).toFixed(2)}h</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  (member.avg_activity || 0) > 80 ? 'bg-green-500' :
                                  (member.avg_activity || 0) > 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                                <span className="text-sm font-bold text-purple-600">{Math.round(member.avg_activity || 0)}%</span>
                              </div>
                            </td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center">
                              <div className="flex flex-col items-center space-y-3">
                                <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-slate-300 rounded-2xl flex items-center justify-center">
                                  <span className="text-2xl">📊</span>
                                </div>
                                <p className="text-gray-500 font-medium">No data available</p>
                                <p className="text-sm text-gray-400">Generate a report to view analytics data</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4 p-4">
                    {analyticsData?.team?.team_stats?.length > 0 ? analyticsData.team.team_stats.map((member, index) => (
                      <div key={member.user_id} className="bg-white/90 rounded-xl p-4 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <Avatar user={{name: member.user_name}} size="sm" />
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">{member.user_name}</h4>
                                <p className="text-xs text-gray-500">{new Date(Date.now() - index * 86400000).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                (member.avg_activity || 0) > 80 ? 'bg-green-500' :
                                (member.avg_activity || 0) > 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-sm font-bold text-purple-600">{Math.round(member.avg_activity || 0)}%</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs">📁</span>
                              <span className="text-xs text-gray-500">Project {index + 1}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs">⏰</span>
                              <span className="text-sm font-bold text-blue-600">{(member.total_hours || 0).toFixed(2)}h</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center space-y-3 py-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-slate-300 rounded-2xl flex items-center justify-center">
                          <span className="text-2xl">📊</span>
                        </div>
                        <p className="text-gray-500 font-medium">No data available</p>
                        <p className="text-sm text-gray-400 text-center">Generate a report to view analytics data</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};