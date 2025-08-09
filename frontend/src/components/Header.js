import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useWebSocket } from "../hooks/useWebSocket";
import { Avatar } from "./Avatar";

export const Header = ({ user, onLogout, currentPage }) => {
  const { notifications, markNotificationAsRead } = useWebSocket(user);
  const [showNotifications, setShowNotifications] = useState(false);

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
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-white font-bold text-base sm:text-lg">H</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">Hubstaff</span>
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
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Avatar user={user} size="sm" />
                  <div className="hidden md:flex md:flex-col md:items-start">
                    <span className="text-gray-700 text-sm sm:text-base">{user.name}</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="md:hidden">
                    {getRoleBadge(user.role)}
                  </div>
                  <button
                    onClick={onLogout}
                    className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm ml-1 sm:ml-2 px-2 py-1 rounded"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-gray-900 text-sm sm:text-base">Sign in</Link>
              <Link to="/signup" className="bg-blue-600 text-white px-3 py-2 sm:px-4 text-xs sm:text-sm rounded-md hover:bg-blue-700">
                Free 14-day trial
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};