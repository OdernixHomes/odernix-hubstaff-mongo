import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { DashboardWidget } from "../components/DashboardWidget";
import { Avatar } from "../components/Avatar";
import { analyticsAPI, usersAPI, projectsAPI } from "../api/client";

export const DashboardPage = ({ user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState({
    widgets: [],
    teamActivity: [],
    recentProjects: []
  });
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [analyticsResponse, usersResponse, projectsResponse] = await Promise.all([
        analyticsAPI.getDashboardAnalytics(),
        usersAPI.getUsers({ limit: 10 }),
        projectsAPI.getProjects({ limit: 5 })
      ]);

      const analytics = analyticsResponse.data;
      const users = usersResponse.data;
      const projects = projectsResponse.data;

      const widgets = [
        { title: "Hours Worked", value: `${(analytics.user_stats?.total_hours || 0).toFixed(2)}h`, subtitle: "This month", icon: "⏰", color: "blue" },
        { title: "Active Workers", value: users.filter(u => u.status === 'active').length, subtitle: "Right now", icon: "👥", color: "green" },
        { title: "Projects", value: projects.length, subtitle: "Active projects", icon: "📁", color: "purple" },
        { title: "Activity Level", value: `${Math.round(analytics.user_stats?.avg_activity || 0)}%`, subtitle: "This week", icon: "📊", color: "orange" },
      ];

      setDashboardData({
        widgets,
        teamActivity: users,
        recentProjects: projects
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header 
          user={user} 
          onLogout={onLogout} 
          currentPage="Dashboard" 
          onToggleMobileSidebar={toggleMobileSidebar}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />
        <div className="flex">
          <Sidebar 
            currentPage="Dashboard" 
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={closeMobileSidebar}
          />
          <main className="flex-1 lg:ml-64 p-3 sm:p-4 md:p-6 lg:p-8 pt-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-48 sm:h-64">
                <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-blue-200 border-t-blue-600"></div>
                  <p className="text-gray-600 text-xs sm:text-sm">Loading your dashboard...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        currentPage="Dashboard" 
        onToggleMobileSidebar={toggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      <div className="flex">
        <Sidebar 
          currentPage="Dashboard" 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
        
        <main className="flex-1 lg:ml-64 p-3 sm:p-4 md:p-6 lg:p-8 pt-4">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header Section */}
            <div className="mb-6 sm:mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-xl sm:rounded-2xl"></div>
              <div className="relative bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <span className="text-white text-base sm:text-xl">📊</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Dashboard
                  </h1>
                </div>
                <p className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed">
                  Welcome back, <span className="font-semibold text-blue-600">{user.name}</span>! 
                  <span className="block sm:inline mt-1 sm:mt-0">
                    {user.role === 'admin' || user.role === 'owner' ? (
                      <span> You're managing <span className="font-semibold text-purple-600">{user.organization_name}</span> organization. Here's your team's productivity overview.</span>
                    ) : (
                      <span> You're part of <span className="font-semibold text-purple-600">{user.organization_name}</span> organization. Here's your productivity dashboard.</span>
                    )}
                  </span>
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {dashboardData.widgets.map((widget, index) => (
                <DashboardWidget key={index} {...widget} />
              ))}
            </div>

            {/* Enhanced Recent Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
              {/* Team Activity Card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-xl sm:rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm">👥</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      Team Activity
                    </h3>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {dashboardData.teamActivity.slice(0, 4).map((user, index) => (
                      <div key={user.id} className="group/item hover:bg-green-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 transition-colors duration-200">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="relative flex-shrink-0">
                            <Avatar user={user} size="sm" className="sm:w-10 sm:h-10" />
                            <div className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white ${
                              user.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-gray-900 group-hover/item:text-green-700 truncate text-sm sm:text-base">{user.name}</h4>
                              <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                                user.status === 'active' 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              }`}>
                                {user.status}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 capitalize truncate">{user.role}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Projects Card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl sm:rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm">📁</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Recent Projects
                    </h3>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {dashboardData.recentProjects.map((project, index) => (
                      <div key={project.id} className="group/item hover:bg-blue-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 transition-colors duration-200">
                        <div className="border-l-4 border-gradient-to-b from-blue-500 to-purple-600 pl-3 sm:pl-4 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <h4 className="font-semibold text-gray-900 group-hover/item:text-blue-700 truncate text-sm sm:text-base flex-1">{project.name}</h4>
                            <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0 ${
                              project.status === 'active' 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{project.client}</p>
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <span className="text-xs text-gray-500">⏱️</span>
                            <p className="text-xs sm:text-sm font-medium text-blue-600">{(project.hours_tracked || 0).toFixed(2)} hours tracked</p>
                          </div>
                        </div>
                      </div>
                    ))}
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