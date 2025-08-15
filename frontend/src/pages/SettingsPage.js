import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { usersAPI } from "../api/client";

export const SettingsPage = ({ user, onLogout }) => {
  const [settings, setSettings] = useState({
    screenshotInterval: 10,
    activityTracking: true,
    idleTimeout: 5,
    notifications: true,
    timezone: "UTC-5",
    workingHours: { start: "09:00", end: "17:00" }
  });
  const [userProfile, setUserProfile] = useState(user);
  const [loading, setLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    // Initialize settings from user data
    if (user.settings) {
      setSettings({
        ...settings,
        ...user.settings
      });
    }
    if (user.working_hours) {
      setSettings(prev => ({
        ...prev,
        workingHours: user.working_hours
      }));
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await usersAPI.updateCurrentUser({
        ...userProfile,
        settings,
        working_hours: settings.workingHours,
        timezone: settings.timezone
      });
      alert("Settings saved successfully!");
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        currentPage="Settings" 
        onToggleMobileSidebar={toggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      <div className="flex">
        <Sidebar 
          currentPage="Settings" 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
        
        <main className="flex-1 lg:ml-64 p-3 sm:p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Enhanced Header Section */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-gray-600/5 rounded-2xl"></div>
              <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg sm:text-xl">⚙️</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-600 to-gray-700 bg-clip-text text-transparent">
                    Settings
                  </h1>
                </div>
                <p className="text-gray-600 text-sm sm:text-lg">
                  Configure your time tracking and productivity settings, <span className="font-semibold text-slate-600">{user.name}</span>.
                </p>
              </div>
            </div>

            {/* Enhanced Profile Settings */}
            <div className="relative group mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-2xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">👤</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Profile Settings
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <input
                      type="text"
                      value={userProfile.role}
                      disabled
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-gray-100/50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Time Zone
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    >
                      <option value="UTC-5">Eastern Time (UTC-5)</option>
                      <option value="UTC-6">Central Time (UTC-6)</option>
                      <option value="UTC-7">Mountain Time (UTC-7)</option>
                      <option value="UTC-8">Pacific Time (UTC-8)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Time Tracking Settings */}
            <div className="relative group mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5 rounded-2xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">⏱️</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Time Tracking Settings
                  </h3>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Screenshot Interval (minutes)
                      </label>
                      <select
                        value={settings.screenshotInterval}
                        onChange={(e) => setSettings({...settings, screenshotInterval: parseInt(e.target.value)})}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                      >
                        <option value={5}>Every 5 minutes</option>
                        <option value={10}>Every 10 minutes</option>
                        <option value={15}>Every 15 minutes</option>
                        <option value={30}>Every 30 minutes</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Idle Timeout (minutes)
                      </label>
                      <select
                        value={settings.idleTimeout}
                        onChange={(e) => setSettings({...settings, idleTimeout: parseInt(e.target.value)})}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                      >
                        <option value={3}>3 minutes</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center p-3 sm:p-4 bg-white/50 rounded-xl border border-white/30">
                      <input
                        type="checkbox"
                        id="activityTracking"
                        checked={settings.activityTracking}
                        onChange={(e) => setSettings({...settings, activityTracking: e.target.checked})}
                        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 mr-3"
                      />
                      <label htmlFor="activityTracking" className="text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                        <span className="mr-2">🖱️</span>
                        Enable activity tracking (mouse and keyboard)
                      </label>
                    </div>

                    <div className="flex items-center p-3 sm:p-4 bg-white/50 rounded-xl border border-white/30">
                      <input
                        type="checkbox"
                        id="notifications"
                        checked={settings.notifications}
                        onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 mr-3"
                      />
                      <label htmlFor="notifications" className="text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                        <span className="mr-2">🔔</span>
                        Enable notifications
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Working Hours */}
            <div className="relative group mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-violet-600/5 rounded-2xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">🕐</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                    Working Hours
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={settings.workingHours.start}
                      onChange={(e) => setSettings({
                        ...settings, 
                        workingHours: {...settings.workingHours, start: e.target.value}
                      })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={settings.workingHours.end}
                      onChange={(e) => setSettings({
                        ...settings, 
                        workingHours: {...settings.workingHours, end: e.target.value}
                      })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Save Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-0">
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-gradient-to-r from-slate-500 to-gray-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:from-slate-600 hover:to-gray-700 disabled:opacity-50 font-medium transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <span>💾</span>
                <span>{loading ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};