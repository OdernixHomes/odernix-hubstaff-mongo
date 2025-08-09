import React from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Time tracking software for the{" "}
            <span className="text-yellow-300 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">global workforce</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-100 mb-8 max-w-3xl mx-auto leading-relaxed">
            Integrated time tracking, productivity metrics, and payroll for your distributed team.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8 px-4 sm:px-0">
            <input
              type="email"
              placeholder="Enter your work email"
              className="px-4 py-3 w-full sm:w-80 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <Link
              to="/signup"
              className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors w-full sm:w-auto text-center shadow-lg"
            >
              Create account
            </Link>
          </div>
          
          <div className="text-gray-200 text-sm space-x-2 sm:space-x-4 flex flex-wrap justify-center items-center">
            <span>Free 14-day trial</span>
            <span className="hidden sm:inline">•</span>
            <span>No credit card required</span>
            <span className="hidden sm:inline">•</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
            <div className="flex items-center justify-center sm:justify-start space-x-3 text-white bg-white bg-opacity-10 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
              <span className="text-yellow-400 text-xl sm:text-2xl">⏰</span>
              <span className="text-sm sm:text-base font-medium">Global time tracking</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start space-x-3 text-white bg-white bg-opacity-10 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
              <span className="text-yellow-400 text-xl sm:text-2xl">📊</span>
              <span className="text-sm sm:text-base font-medium">Productivity data</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start space-x-3 text-white bg-white bg-opacity-10 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
              <span className="text-yellow-400 text-xl sm:text-2xl">💰</span>
              <span className="text-sm sm:text-base font-medium">Flexible payroll</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start space-x-3 text-white bg-white bg-opacity-10 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
              <span className="text-yellow-400 text-xl sm:text-2xl">👥</span>
              <span className="text-sm sm:text-base font-medium">Attendance management</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start space-x-3 text-white bg-white bg-opacity-10 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
              <span className="text-yellow-400 text-xl sm:text-2xl">💡</span>
              <span className="text-sm sm:text-base font-medium">Project cost & budgeting</span>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative max-w-5xl mx-auto">
            <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 rounded-lg sm:rounded-xl shadow-2xl flex items-center justify-center">
              <div className="text-center text-white">
                <h3 className="text-2xl sm:text-3xl font-bold mb-2">📊 Dashboard Preview</h3>
                <p className="text-lg opacity-90">Your productivity at a glance</p>
              </div>
            </div>
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 hidden sm:block">
              <div className="w-20 h-40 sm:w-32 sm:h-64 bg-gradient-to-b from-green-500 to-teal-600 rounded-lg shadow-xl flex items-center justify-center">
                <div className="text-center text-white">
                  <span className="text-lg sm:text-xl">📱</span>
                  <p className="text-xs mt-1">Mobile</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-device Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white bg-opacity-5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
            Multi-device time clock software
          </h2>
          <p className="text-base sm:text-lg text-gray-100 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
            Save hours each week with our easy-to-use employee time tracking. Then, convert desktop, web, mobile, or GPS 
            time tracking data to automated timesheets.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center bg-white bg-opacity-10 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-white border-opacity-20">
              <div className="w-full h-32 sm:h-48 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-4xl">💻</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Desktop</h3>
              <p className="text-sm sm:text-base text-gray-200">Track time automatically with desktop apps for Windows, Mac, and Linux.</p>
            </div>
            
            <div className="text-center bg-white bg-opacity-10 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-white border-opacity-20">
              <div className="w-full h-32 sm:h-48 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-4xl">🌐</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Web</h3>
              <p className="text-sm sm:text-base text-gray-200">Access time tracking from any browser with our web-based platform.</p>
            </div>
            
            <div className="text-center bg-white bg-opacity-10 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-white border-opacity-20 sm:col-span-2 lg:col-span-1">
              <div className="w-full h-32 sm:h-48 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-4xl">📱</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Mobile</h3>
              <p className="text-sm sm:text-base text-gray-200">Track time on the go with iOS and Android mobile apps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-8 sm:mb-12 leading-tight">
            Time tracking & productivity metrics trusted by{" "}
            <span className="text-yellow-300">112,000+</span> businesses
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white border-opacity-20">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-300 mb-2">500k+</div>
              <div className="text-sm sm:text-base text-gray-200 font-medium">Active users</div>
            </div>
            <div className="text-center bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white border-opacity-20">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-300 mb-2">21M+</div>
              <div className="text-sm sm:text-base text-gray-200 font-medium">Total hours tracked</div>
            </div>
            <div className="text-center bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white border-opacity-20">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-300 mb-2">4M+</div>
              <div className="text-sm sm:text-base text-gray-200 font-medium">Tasks completed</div>
            </div>
            <div className="text-center bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white border-opacity-20">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-300 mb-2">300k+</div>
              <div className="text-sm sm:text-base text-gray-200 font-medium">Payments</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Groups of <span className="text-blue-600">features</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            <div className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Time Tracking</h3>
              <p className="text-sm sm:text-base text-gray-600">Automatic time tracking with detailed reports and analytics.</p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Employee productivity</h3>
              <p className="text-sm sm:text-base text-gray-600">Monitor activity levels and productivity metrics.</p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors sm:col-span-2 lg:col-span-1">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Workforce management</h3>
              <p className="text-sm sm:text-base text-gray-600">Manage teams, projects, and tasks efficiently.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg sm:rounded-xl shadow-lg flex items-center justify-center">
                <div className="text-center text-white">
                  <span className="text-6xl mb-4 block">⏰</span>
                  <h4 className="text-xl font-semibold">Time Tracking</h4>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
                <span className="text-blue-600">⏰</span> Time tracking
              </h3>
              <p className="text-base sm:text-lg text-gray-600 mb-6 leading-relaxed">
                Smarter, streamlined employee time tracking for any type of business. 
                Track work hours, set limits, and get detailed timesheets to review and 
                approve with one simple tool.
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600 text-lg">✓</span>
                  <span className="text-sm sm:text-base text-gray-700 font-medium">Automatic time tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600 text-lg">✓</span>
                  <span className="text-sm sm:text-base text-gray-700 font-medium">Manual time entry</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600 text-lg">✓</span>
                  <span className="text-sm sm:text-base text-gray-700 font-medium">Time tracking reports</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="text-xl font-bold">Hubstaff</span>
          </div>
          <p className="text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base">
            Time tracking software for the global workforce
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
            <Link to="/login" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Login</Link>
            <Link to="/signup" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Sign Up</Link>
            <a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Features</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
};