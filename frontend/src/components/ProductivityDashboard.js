import React, { useState, useEffect } from 'react';
import { advancedAnalyticsAPI } from '../api/client';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';

const ProductivityDashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await advancedAnalyticsAPI.getEnhancedDashboard(selectedPeriod);
      setDashboardData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-gray-200 rounded-xl"></div>
              <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex">
              <div className="text-red-400 text-2xl mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading Dashboard</h3>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchDashboardData}
                  className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, heatmap, insights, goals, alerts, trend, team_comparison } = dashboardData || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Productivity Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Track your productivity patterns and improve your performance
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Productivity Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="text-yellow-800 font-semibold mb-2 flex items-center">
              <span className="mr-2">⚡</span>
              Productivity Alerts ({alerts.length})
            </h3>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="text-sm text-yellow-700">
                  • {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summary && (
            <>
              <MetricCard
                title="Productivity Score"
                value={`${summary.productivity_score || 0}%`}
                trend={trend?.productivity}
                icon="🎯"
                colorClass={getScoreColor(summary.productivity_score || 0)}
              />
              <MetricCard
                title="Focus Score"
                value={`${summary.focus_score || 0}%`}
                trend={trend?.focus}
                icon="🧠"
                colorClass={getScoreColor(summary.focus_score || 0)}
              />
              <MetricCard
                title="Activity Level"
                value={`${summary.activity_level || 0}%`}
                trend={trend?.activity}
                icon="⚡"
                colorClass={getScoreColor(summary.activity_level || 0)}
              />
              <MetricCard
                title="Total Hours"
                value={`${summary.total_hours || 0}h`}
                trend={trend?.hours}
                icon="⏰"
                colorClass="text-blue-600 bg-blue-50 border-blue-200"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Productivity Heatmap */}
          <div className="lg:col-span-2">
            <ProductivityHeatmap data={heatmap} />
          </div>

          {/* Goals Progress */}
          <div className="space-y-6">
            <GoalsProgress goals={goals} />
            {team_comparison && <TeamComparison comparison={team_comparison} />}
          </div>
        </div>

        {/* Insights */}
        {insights && insights.length > 0 && (
          <ProductivityInsights insights={insights} />
        )}

        {/* Time Distribution */}
        {summary?.time_distribution && (
          <TimeDistribution distribution={summary.time_distribution} />
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, trend, icon, colorClass }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
    <div className="flex items-center justify-between mb-4">
      <div className="text-2xl">{icon}</div>
      {trend && (
        <div className="flex items-center text-sm">
          <span className="mr-1">{getTrendIcon(trend.direction)}</span>
          <span className={trend.direction === 'improving' ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(trend.percentage)}%
          </span>
        </div>
      )}
    </div>
    <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    <div className={`text-2xl font-bold mt-1 px-3 py-1 rounded-lg border ${colorClass}`}>
      {value}
    </div>
  </div>
);

const ProductivityHeatmap = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">📊</span>
        Productivity Heatmap
      </h3>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {data.daily_data?.map((day, index) => (
          <div
            key={index}
            className={`h-12 rounded-lg flex items-center justify-center text-sm font-medium ${
              day.productivity_score >= 80
                ? 'bg-green-500 text-white'
                : day.productivity_score >= 60
                ? 'bg-yellow-400 text-white'
                : day.productivity_score >= 40
                ? 'bg-orange-400 text-white'
                : 'bg-red-400 text-white'
            }`}
            title={`${format(parseISO(day.date), 'MMM d')}: ${day.productivity_score}% productivity`}
          >
            {day.productivity_score}%
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-400 rounded"></div>
          <span>Low</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

const GoalsProgress = ({ goals }) => {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">🎯</span>
        Goals Progress
      </h3>
      <div className="space-y-4">
        {goals.slice(0, 3).map((goal, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{goal.goal_type.replace('_', ' ')}</span>
              <span>{goal.achievement_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  goal.achievement_percentage >= 100
                    ? 'bg-green-500'
                    : goal.achievement_percentage >= 75
                    ? 'bg-blue-500'
                    : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(goal.achievement_percentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600">
              {goal.current_value} / {goal.target_value} {goal.goal_type.includes('hours') ? 'hours' : 'points'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TeamComparison = ({ comparison }) => {
  if (!comparison) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">👥</span>
        Team Comparison
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Your Score</span>
          <span className="font-bold">{comparison.user_score}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Team Average</span>
          <span className="font-bold">{comparison.team_average}%</span>
        </div>
        <div className={`flex justify-between items-center ${
          comparison.is_better ? 'text-green-600' : 'text-red-600'
        }`}>
          <span>Difference</span>
          <span className="font-bold">
            {comparison.is_better ? '+' : ''}{comparison.difference}%
          </span>
        </div>
      </div>
    </div>
  );
};

const ProductivityInsights = ({ insights }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
    <h3 className="text-xl font-bold mb-4 flex items-center">
      <span className="mr-2">💡</span>
      AI-Powered Insights
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {insights.map((insight, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border-2 ${
            insight.importance === 'high'
              ? 'bg-red-50 border-red-200'
              : insight.importance === 'medium'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <h4 className="font-semibold mb-2">{insight.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
          {insight.actionable && (
            <div className="text-xs text-blue-600 font-medium">Actionable</div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const TimeDistribution = ({ distribution }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
    <h3 className="text-xl font-bold mb-4 flex items-center">
      <span className="mr-2">⏱️</span>
      Time Distribution
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="text-center">
        <div className="text-3xl font-bold text-green-600">{distribution.productive}%</div>
        <div className="text-sm text-gray-600">Productive Time</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold text-yellow-600">{distribution.neutral}%</div>
        <div className="text-sm text-gray-600">Neutral Time</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold text-red-600">{distribution.distracting}%</div>
        <div className="text-sm text-gray-600">Distracting Time</div>
      </div>
    </div>
  </div>
);

export default ProductivityDashboard;