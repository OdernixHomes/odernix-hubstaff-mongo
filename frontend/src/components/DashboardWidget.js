import React from "react";

export const DashboardWidget = ({ title, value, subtitle, icon, color = "blue" }) => {
  const colorClasses = {
    blue: {
      gradient: "from-blue-500 to-cyan-600",
      lightGradient: "from-blue-600/10 to-cyan-600/10",
      textGradient: "from-blue-600 to-cyan-600",
      valueColor: "text-blue-600"
    },
    green: {
      gradient: "from-green-500 to-emerald-600",
      lightGradient: "from-green-600/10 to-emerald-600/10",
      textGradient: "from-green-600 to-emerald-600",
      valueColor: "text-green-600"
    },
    purple: {
      gradient: "from-purple-500 to-pink-600",
      lightGradient: "from-purple-600/10 to-pink-600/10",
      textGradient: "from-purple-600 to-pink-600",
      valueColor: "text-purple-600"
    },
    orange: {
      gradient: "from-orange-500 to-red-600",
      lightGradient: "from-orange-600/10 to-red-600/10",
      textGradient: "from-orange-600 to-red-600",
      valueColor: "text-orange-600"
    }
  };

  const selectedColor = colorClasses[color] || colorClasses.blue;

  return (
    <div className="relative group cursor-pointer">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${selectedColor.lightGradient} rounded-xl sm:rounded-2xl transform group-hover:scale-105 transition-all duration-300`}></div>
      
      {/* Main Card */}
      <div className="relative bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Icon Container */}
              <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r ${selectedColor.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300 shadow-lg flex-shrink-0`}>
                <span className="text-white text-lg sm:text-2xl">{icon}</span>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className={`text-base sm:text-lg font-bold bg-gradient-to-r ${selectedColor.textGradient} bg-clip-text text-transparent mb-1 truncate`}>
                  {title}
                </h3>
                <p className={`text-2xl sm:text-3xl font-bold ${selectedColor.valueColor} mb-1 group-hover:scale-110 transition-transform duration-300 inline-block`}>
                  {value}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>
          
          {/* Decorative Element */}
          <div className={`w-1.5 sm:w-2 h-12 sm:h-16 bg-gradient-to-b ${selectedColor.gradient} rounded-full opacity-20 group-hover:opacity-60 transition-opacity duration-300 flex-shrink-0`}></div>
        </div>
        
        {/* Bottom Accent */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${selectedColor.gradient} rounded-b-xl sm:rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
      </div>
    </div>
  );
};