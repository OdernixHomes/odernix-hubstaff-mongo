import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useWebSocket } from "../hooks/useWebSocket";
import { Avatar } from "./Avatar";

export const Header = ({ user, onLogout, currentPage, onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const { notifications, markNotificationAsRead } = useWebSocket(user);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleBadge = (role) => {
    const roleStyles = {
      admin: "bg-red-100 text-red-800 border-red-200",
      manager: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      user: "bg-green-100 text-green-800 border-green-200"
    };
    
    const roleLabels = {
      admin: "Admin",
      manager: "Manager",
      user: "User"
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleStyles[role] || roleStyles.user}`}>
        {roleLabels[role] || "User"}
      </span>
    );
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center">
            {/* Mobile Sidebar Toggle */}
            {user && (
              <button
                onClick={onToggleMobileSidebar}
                className="lg:hidden p-2 -ml-2 mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileSidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
            
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-white font-bold text-base sm:text-lg">H</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 hidden xs:inline">Hubstaff</span>
              <span className="text-lg font-bold text-gray-900 xs:hidden">H</span>
            </Link>
          </div>
          
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-gray-700 text-sm sm:text-base hidden sm:inline">{currentPage}</span>
              
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-1 sm:p-2 text-gray-600 hover:text-gray-900"
                >
                  🔔
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-3 sm:p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Notifications</h3>
                    </div>
                    <div className="max-h-48 sm:max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-3 sm:p-4 text-gray-500 text-center text-sm">No new notifications</p>
                      ) : (
                        notifications.map((notification) => (
                          <div key={notification.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                            <p className="text-sm text-gray-900">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{format(notification.timestamp, 'PPp')}</p>
                            <button
                              onClick={() => markNotificationAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                            >
                              Mark as read
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative">
                {/* Desktop User Info */}
                <div className="hidden md:flex items-center space-x-2">
                  <Avatar user={user} size="sm" />
                  <div className="flex flex-col items-start">
                    <span className="text-gray-700 text-sm">{user.name}</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <button
                    onClick={onLogout}
                    className="text-gray-500 hover:text-gray-700 text-sm ml-2 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>

                {/* Mobile User Menu */}
                <div className="md:hidden relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="User menu"
                  >
                    <Avatar user={user} size="sm" />
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          <Avatar user={user} size="md" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            <div className="mt-1">
                              {getRoleBadge(user.role)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <Link 
                          to="/settings" 
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Settings
                        </Link>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onLogout();
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-gray-900 text-sm sm:text-base">Sign in</Link>
              <Link to="/signup" className="bg-blue-600 text-white px-3 py-2 sm:px-4 text-xs sm:text-sm rounded-md hover:bg-blue-700">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};