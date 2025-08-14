import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import ProductivityDashboard from '../components/ProductivityDashboard';
import { advancedAnalyticsAPI } from '../api/client';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const AnalyticsPage = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    if (activeTab === 'detailed') {
      fetchDetailedAnalytics();
    }
  }, [activeTab, dateRange]);

  const fetchDetailedAnalytics = async () => {
    try {
      setLoading(true);
      const response = await advancedAnalyticsAPI.getDetailedProductivity(
        dateRange.start,
        dateRange.end,
        'daily'
      );
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to fetch detailed analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProductivityDashboard user={user} />;
      case 'detailed':
        return <DetailedAnalytics data={analyticsData} loading={loading} />;
      case 'goals':
        return <GoalsManagement user={user} />;
      case 'reports':
        return <ReportsSection user={user} />;
      default:
        return <ProductivityDashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        currentPage="Analytics" 
        onToggleMobileSidebar={toggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      <div className="flex">
        <Sidebar 
          currentPage="Analytics" 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
        
        <main className="flex-1 lg:ml-64">
          {/* Tab Navigation */}
          <div className="bg-white/70 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <nav className="flex space-x-8">
                <TabButton
                  active={activeTab === 'dashboard'}
                  onClick={() => setActiveTab('dashboard')}
                  icon="📊"
                  text="Dashboard"
                />
                <TabButton
                  active={activeTab === 'detailed'}
                  onClick={() => setActiveTab('detailed')}
                  icon="📈"
                  text="Detailed Analytics"
                />
                <TabButton
                  active={activeTab === 'goals'}
                  onClick={() => setActiveTab('goals')}
                  icon="🎯"
                  text="Goals"
                />
                <TabButton
                  active={activeTab === 'reports'}
                  onClick={() => setActiveTab('reports')}
                  icon="📋"
                  text="Reports"
                />
              </nav>
            </div>
          </div>

          {/* Date Range Selector for non-dashboard tabs */}
          {activeTab !== 'dashboard' && (
            <div className="bg-white/50 backdrop-blur-sm border-b border-white/20 px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                />
                <button
                  onClick={() => setDateRange({
                    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                    end: format(new Date(), 'yyyy-MM-dd')
                  })}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Last 7 days
                </button>
                <button
                  onClick={() => setDateRange({
                    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                    end: format(new Date(), 'yyyy-MM-dd')
                  })}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Last 30 days
                </button>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="min-h-screen">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, text }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    <span>{icon}</span>
    <span>{text}</span>
  </button>
);

const DetailedAnalytics = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-xl"></div>
            <div className="h-80 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.metrics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-600">No data available</h3>
          <p className="text-gray-500">Select a date range to view detailed analytics</p>
        </div>
      </div>
    );
  }

  const { metrics, insights, summary } = data;

  // Prepare chart data
  const productivityChartData = {
    labels: metrics.daily_data?.map(d => format(new Date(d.date), 'MMM d')) || [],
    datasets: [
      {
        label: 'Productivity Score',
        data: metrics.daily_data?.map(d => d.productivity_score) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Activity Level',
        data: metrics.daily_data?.map(d => d.activity_level) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1,
      }
    ],
  };

  const hoursChartData = {
    labels: metrics.daily_data?.map(d => format(new Date(d.date), 'MMM d')) || [],
    datasets: [
      {
        label: 'Hours Tracked',
        data: metrics.daily_data?.map(d => d.hours) || [],
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
      }
    ],
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Detailed Analytics</h2>
        <p className="text-gray-600">In-depth analysis of your productivity patterns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Hours"
          value={`${summary?.total_tracked_hours?.toFixed(1) || 0}h`}
          icon="⏰"
          color="blue"
        />
        <SummaryCard
          title="Avg Productivity"
          value={`${summary?.average_productivity_score?.toFixed(1) || 0}%`}
          icon="🎯"
          color="green"
        />
        <SummaryCard
          title="Peak Day"
          value={summary?.peak_productivity_day ? format(new Date(summary.peak_productivity_day), 'MMM d') : 'N/A'}
          icon="📈"
          color="purple"
        />
        <SummaryCard
          title="Focus Score"
          value={`${metrics?.average_focus_score?.toFixed(1) || 0}%`}
          icon="🧠"
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          <h3 className="text-lg font-semibold mb-4">Productivity Trends</h3>
          <Line data={productivityChartData} options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
              }
            }
          }} />
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          <h3 className="text-lg font-semibold mb-4">Daily Hours</h3>
          <Bar data={hoursChartData} options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
              }
            }
          }} />
        </div>
      </div>

      {/* Insights */}
      {insights && insights.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          <h3 className="text-lg font-semibold mb-4">💡 Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800">{insight.title}</h4>
                <p className="text-sm text-blue-600 mt-1">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const GoalsManagement = ({ user }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await advancedAnalyticsAPI.getGoals();
      setGoals(response.data.goals || []);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading goals...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Goals Management</h2>
          <p className="text-gray-600">Set and track your productivity goals</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-gray-600">No goals set</h3>
          <p className="text-gray-500">Create your first productivity goal to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onUpdate={fetchGoals} />
          ))}
        </div>
      )}
    </div>
  );
};

const ReportsSection = ({ user }) => {
  const [reportHistory, setReportHistory] = useState([]);
  const [generating, setGenerating] = useState(false);

  const generateReport = async (type) => {
    try {
      setGenerating(true);
      await advancedAnalyticsAPI.generateCustomReport({
        report_type: type,
        start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        format: 'json'
      });
      // Handle report generation completion
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <p className="text-gray-600">Generate and download productivity reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportCard
          title="Daily Summary"
          description="Detailed daily productivity breakdown"
          icon="📅"
          onClick={() => generateReport('daily')}
          generating={generating}
        />
        <ReportCard
          title="Weekly Analysis"
          description="Weekly productivity trends and patterns"
          icon="📊"
          onClick={() => generateReport('weekly')}
          generating={generating}
        />
        <ReportCard
          title="Monthly Overview"
          description="Comprehensive monthly performance report"
          icon="📈"
          onClick={() => generateReport('monthly')}
          generating={generating}
        />
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700'
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

const GoalCard = ({ goal, onUpdate }) => {
  const progressColor = goal.achievement_percentage >= 100 ? 'green' : 
                       goal.achievement_percentage >= 75 ? 'blue' : 'yellow';

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
      <h3 className="font-semibold text-lg mb-2">{goal.goal_type.replace('_', ' ')}</h3>
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span>{goal.achievement_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full bg-${progressColor}-500`}
            style={{ width: `${Math.min(goal.achievement_percentage, 100)}%` }}
          ></div>
        </div>
      </div>
      <div className="text-sm text-gray-600">
        {goal.current_value} / {goal.target_value} {goal.goal_type.includes('hours') ? 'hours' : 'points'}
      </div>
    </div>
  );
};

const ReportCard = ({ title, description, icon, onClick, generating }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="font-semibold text-lg mb-2">{title}</h3>
    <p className="text-gray-600 text-sm mb-4">{description}</p>
    <button
      onClick={onClick}
      disabled={generating}
      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {generating ? 'Generating...' : 'Generate Report'}
    </button>
  </div>
);