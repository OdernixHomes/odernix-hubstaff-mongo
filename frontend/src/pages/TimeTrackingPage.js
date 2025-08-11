import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { Timer } from "../components/Timer";
import { timeTrackingAPI, projectsAPI, usersAPI } from "../api/client";
import { activityMonitor } from "../services/activityMonitor";

export const TimeTrackingPage = ({ user, onLogout }) => {
  const [activeEntry, setActiveEntry] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timer"); // timer, tasks, completed
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activityData, setActivityData] = useState({
    mouseActivity: 0,
    keyboardActivity: 0,
    screenshotCount: 0
  });
  const [realtimeActivity, setRealtimeActivity] = useState({
    mouseActivity: 0,
    keyboardActivity: 0
  });

  useEffect(() => {
    fetchData();
    
    // Cleanup activity monitor on unmount
    return () => {
      activityMonitor.stop();
    };
  }, []);
  
  // Monitor realtime activity when timer is active
  useEffect(() => {
    if (activeEntry) {
      // Start activity monitoring
      activityMonitor.start((activity) => {
        setRealtimeActivity({
          mouseActivity: activity.mouseActivity,
          keyboardActivity: activity.keyboardActivity
        });
      });
    } else {
      // Stop activity monitoring
      activityMonitor.stop();
      setRealtimeActivity({
        mouseActivity: 0,
        keyboardActivity: 0
      });
    }
  }, [activeEntry]);

  const fetchData = async () => {
    try {
      const [activeResponse, projectsResponse, allTasksResponse, usersResponse] = await Promise.all([
        timeTrackingAPI.getActiveEntry(),
        projectsAPI.getProjects(),
        projectsAPI.getAllTasks(),
        usersAPI.getUsers()
      ]);
      
      console.log('Active entry response:', activeResponse.data);
      console.log('Active entry ID:', activeResponse.data?.id);
      
      setActiveEntry(activeResponse.data);
      setProjects(projectsResponse.data);
      setAllTasks(allTasksResponse.data);
      setUsers(usersResponse.data);
      
      // Load tasks for selected project
      if (selectedProject) {
        fetchProjectTasks(selectedProject);
      }

      // Fetch activity data for current user if there's an active entry
      if (activeResponse.data) {
        fetchActivityData();
      }
    } catch (error) {
      console.error('Failed to fetch time tracking data:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityData = async () => {
    try {
      console.log('Fetching activity data...');
      // Get today's activity data from daily report
      const dailyReport = await timeTrackingAPI.getDailyReport();
      
      console.log('Activity data response:', dailyReport.data);
      
      if (dailyReport.data) {
        // Use real data from daily report if available
        const activityLevel = Math.max(0, Math.min(100, Math.round(dailyReport.data.activity_level || 0)));
        const screenshotCount = Math.max(0, dailyReport.data.screenshots_count || 0);
        
        setActivityData({
          mouseActivity: activityLevel,
          keyboardActivity: activityLevel,
          screenshotCount: screenshotCount
        });
        console.log('Activity data updated successfully');
      } else {
        // If no data available, show zeros (not mock data)
        console.log('No activity data available, using defaults');
        setActivityData({
          mouseActivity: 0,
          keyboardActivity: 0,
          screenshotCount: 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch activity data:', error);
      console.error('Activity data error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      // Set default values if fetch fails
      setActivityData({
        mouseActivity: 0,
        keyboardActivity: 0,
        screenshotCount: 0
      });
    }
  };

  const fetchProjectTasks = async (projectId) => {
    try {
      const response = await projectsAPI.getProjectTasks(projectId);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch project tasks:', error);
    }
  };

  const handleStart = async () => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }

    if (activeEntry) {
      alert('You already have an active timer running. Please stop it first.');
      return;
    }

    try {
      console.log('Starting timer for project:', selectedProject, 'task:', selectedTask);
      const response = await timeTrackingAPI.startTracking({
        project_id: selectedProject,
        task_id: selectedTask || null,
        description: "Working on project"
      });
      setActiveEntry(response.data);
      console.log('Timer started successfully:', response.data);
      // Fetch historical activity data
      fetchActivityData();
    } catch (error) {
      console.error('Failed to start tracking:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = 'Failed to start time tracking. Please try again.';
      
      if (error.response?.status === 400) {
        const errorDetail = error.response?.data?.detail || 'Invalid request';
        errorMessage = `Failed to start timer: ${errorDetail}`;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Project or task not found. Please refresh the page and try again.';
      }
      
      alert(errorMessage);
    }
  };

  const handleStop = async (entryId) => {
    if (!entryId) {
      console.error('No entry ID provided for stopping timer');
      alert('Unable to stop timer: No active entry found');
      return;
    }

    console.log('Attempting to stop timer with ID:', entryId);
    
    try {
      await timeTrackingAPI.stopTracking(entryId);
      setActiveEntry(null);
      // Reset activity data when stopping
      setActivityData({
        mouseActivity: 0,
        keyboardActivity: 0,
        screenshotCount: 0
      });
      setRealtimeActivity({
        mouseActivity: 0,
        keyboardActivity: 0
      });
      console.log('Timer stopped successfully');
    } catch (error) {
      console.error('Failed to stop tracking:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        entryId
      });
      
      let errorMessage = 'Failed to stop time tracking. Please try again.';
      
      if (error.response?.status === 400) {
        const errorDetail = error.response?.data?.detail || 'Invalid request';
        errorMessage = `Failed to stop timer: ${errorDetail}`;
      } else if (error.response?.status === 404) {
        errorMessage = 'Timer entry not found. It may have already been stopped.';
        // If entry not found, clear the local state anyway
        setActiveEntry(null);
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      }
      
      alert(errorMessage);
    }
  };

  const handlePause = async (entryId) => {
    if (!entryId) {
      console.error('No entry ID provided for pausing timer');
      alert('Unable to pause timer: No active entry found');
      return;
    }

    console.log('Attempting to pause timer with ID:', entryId);
    
    try {
      const response = await timeTrackingAPI.pauseTracking(entryId);
      setActiveEntry(response.data);
      console.log('Timer paused successfully');
    } catch (error) {
      console.error('Failed to pause tracking:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        entryId
      });
      
      let errorMessage = 'Failed to pause time tracking. Please try again.';
      
      if (error.response?.status === 400) {
        const errorDetail = error.response?.data?.detail || 'Invalid request';
        errorMessage = `Failed to pause timer: ${errorDetail}`;
      } else if (error.response?.status === 404) {
        errorMessage = 'Timer entry not found. It may have already been stopped.';
        // If entry not found, clear the local state anyway
        setActiveEntry(null);
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      }
      
      alert(errorMessage);
    }
  };

  const handleResume = async (entryId) => {
    if (!entryId) {
      console.error('No entry ID provided for resuming timer');
      alert('Unable to resume timer: No active entry found');
      return;
    }

    console.log('Attempting to resume timer with ID:', entryId);
    
    try {
      const response = await timeTrackingAPI.resumeTracking(entryId);
      setActiveEntry(response.data);
      console.log('Timer resumed successfully');
    } catch (error) {
      console.error('Failed to resume tracking:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        entryId
      });
      
      let errorMessage = 'Failed to resume time tracking. Please try again.';
      
      if (error.response?.status === 400) {
        const errorDetail = error.response?.data?.detail || 'Invalid request';
        errorMessage = `Failed to resume timer: ${errorDetail}`;
      } else if (error.response?.status === 404) {
        errorMessage = 'Timer entry not found. It may have already been stopped.';
        // If entry not found, clear the local state anyway
        setActiveEntry(null);
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      }
      
      alert(errorMessage);
    }
  };

  const handleReset = () => {
    // Reset local state only
    setSelectedProject("");
    setSelectedTask("");
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    setSelectedTask("");
    if (projectId) {
      fetchProjectTasks(projectId);
    } else {
      setTasks([]);
    }
  };

  const handleCompleteTask = async (taskId) => {
    if (!taskId) {
      console.error('No task ID provided');
      alert('Unable to complete task: Invalid task ID');
      return;
    }

    try {
      console.log('Completing task:', taskId);
      await projectsAPI.updateTask(taskId, { status: "completed" });
      fetchData(); // Refresh all data
      console.log('Task completed successfully');
      alert("Task marked as completed!");
    } catch (error) {
      console.error('Failed to complete task:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        taskId
      });
      
      let errorMessage = "Failed to mark task as completed. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Task not found. It may have been deleted.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication error. Please log in again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to modify this task.";
      }
      
      alert(errorMessage);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    if (!taskId || !newStatus) {
      console.error('Missing task ID or status');
      alert('Unable to update task: Missing required information');
      return;
    }

    try {
      console.log('Updating task status:', taskId, 'to:', newStatus);
      await projectsAPI.updateTask(taskId, { status: newStatus });
      fetchData(); // Refresh all data
      console.log('Task status updated successfully');
    } catch (error) {
      console.error('Failed to update task status:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        taskId,
        newStatus
      });
      
      let errorMessage = "Failed to update task status. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Task not found. It may have been deleted.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication error. Please log in again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to modify this task.";
      }
      
      alert(errorMessage);
    }
  };

  const getUserName = (userId) => {
    if (!userId || !Array.isArray(users)) return 'Unknown User';
    const foundUser = users.find(u => u && u.id === userId);
    return foundUser?.name || 'Unknown User';
  };

  const getProjectName = (projectId) => {
    if (!projectId || !Array.isArray(projects)) return 'Unknown Project';
    const project = projects.find(p => p && p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getTasksByStatus = (status) => {
    if (!status || !Array.isArray(allTasks)) return [];
    return allTasks.filter(task => task && task.status === status);
  };

  const getMyTasks = () => {
    if (!user?.id || !Array.isArray(allTasks)) return [];
    return allTasks.filter(task => task && task.assignee_id === user.id);
  };

  const getCompletedTasks = () => {
    if (!Array.isArray(allTasks)) return [];
    return allTasks.filter(task => task && task.status === 'completed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onLogout={onLogout} currentPage="Time Tracking" />
        <div className="flex">
          <Sidebar currentPage="Time Tracking" />
          <main className="flex-1 ml-64 p-8">
            <div className="flex items-center justify-center h-64">
              <div className="spinner"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        currentPage="Time Tracking"
        onToggleMobileSidebar={toggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      <div className="flex">
        <Sidebar 
          currentPage="Time Tracking" 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
        
        <main className="flex-1 lg:ml-64 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6 lg:mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Time Tracking & Tasks</h1>
              <p className="text-gray-600 mt-2 text-sm lg:text-base">
                Track your time and manage your tasks efficiently.
              </p>
            </div>

            {/* Tab Navigation - Responsive */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 lg:space-x-8 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("timer")}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm lg:text-base flex-shrink-0 ${
                      activeTab === "timer"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="hidden sm:inline">Timer & Tracking</span>
                    <span className="sm:hidden">Timer</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm lg:text-base flex-shrink-0 ${
                      activeTab === "tasks"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="hidden sm:inline">My Tasks ({getMyTasks().length})</span>
                    <span className="sm:hidden">Tasks ({getMyTasks().length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm lg:text-base flex-shrink-0 ${
                      activeTab === "completed"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="hidden sm:inline">Completed ({getCompletedTasks().length})</span>
                    <span className="sm:hidden">Done ({getCompletedTasks().length})</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Timer Tab */}
            {activeTab === "timer" && (
              <div className="space-y-6 lg:space-y-8">
                {/* Timer Section */}
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <Timer 
                      activeEntry={activeEntry}
                      onStart={handleStart}
                      onStop={handleStop}
                      onPause={handlePause}
                      onResume={handleResume}
                      onReset={handleReset}
                    />
                  </div>
                </div>

                {/* Project and Task Selection */}
                <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">What are you working on?</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedProject}
                        onChange={(e) => handleProjectChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
                      >
                        <option value="">Select a project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Task <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <select
                        value={selectedTask}
                        onChange={(e) => setSelectedTask(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
                        disabled={!selectedProject}
                      >
                        <option value="">Select a task (optional)</option>
                        {tasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {!selectedProject && (
                    <p className="mt-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
                      💡 Please select a project to start tracking time
                    </p>
                  )}
                </div>

                {/* Enhanced Activity Monitor - Responsive */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200 hidden lg:block"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 lg:p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-4 lg:mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Activity Monitor
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                      <div className="text-center group/item hover:transform hover:scale-105 transition-all duration-300">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover/item:shadow-xl lg:group-hover/item:rotate-12 transition-all duration-300">
                          <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1 text-sm lg:text-base">Screenshots</h4>
                        <p className="text-lg lg:text-xl font-bold text-blue-600">{activityData.screenshotCount}</p>
                        <p className="text-xs lg:text-sm text-gray-500">captured today</p>
                      </div>
                      <div className="text-center group/item hover:transform hover:scale-105 transition-all duration-300">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover/item:shadow-xl lg:group-hover/item:rotate-12 transition-all duration-300">
                          <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1 text-sm lg:text-base">Mouse Activity</h4>
                        <p className="text-lg lg:text-xl font-bold text-green-600">{activeEntry ? realtimeActivity.mouseActivity : activityData.mouseActivity}%</p>
                        <p className="text-xs lg:text-sm text-gray-500">active</p>
                      </div>
                      <div className="text-center group/item hover:transform hover:scale-105 transition-all duration-300">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover/item:shadow-xl lg:group-hover/item:rotate-12 transition-all duration-300">
                          <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1 text-sm lg:text-base">Keyboard Activity</h4>
                        <p className="text-lg lg:text-xl font-bold text-purple-600">{activeEntry ? realtimeActivity.keyboardActivity : activityData.keyboardActivity}%</p>
                        <p className="text-xs lg:text-sm text-gray-500">active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div className="space-y-6">
                {/* Enhanced Task Statistics - Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                      <div className="text-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="text-white text-sm">📋</span>
                        </div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-1">{getMyTasks().length}</div>
                        <div className="text-sm font-medium text-gray-600">Total Assigned</div>
                      </div>
                    </div>
                  </div>
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                      <div className="text-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="text-white text-sm">⏳</span>
                        </div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-1">{getTasksByStatus("todo").filter(t => t.assignee_id === user.id).length}</div>
                        <div className="text-sm font-medium text-gray-600">To Do</div>
                      </div>
                    </div>
                  </div>
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                      <div className="text-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="text-white text-sm">🔄</span>
                        </div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-1">{getTasksByStatus("in-progress").filter(t => t.assignee_id === user.id).length}</div>
                        <div className="text-sm font-medium text-gray-600">In Progress</div>
                      </div>
                    </div>
                  </div>
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                      <div className="text-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="text-white text-sm">✅</span>
                        </div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1">{getTasksByStatus("completed").filter(t => t.assignee_id === user.id).length}</div>
                        <div className="text-sm font-medium text-gray-600">Completed</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Active Tasks - Mobile Responsive */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200 hidden lg:block"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
                    <div className="p-4 lg:p-6 border-b border-white/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">My Active Tasks</h3>
                          <p className="text-sm text-gray-600 mt-1">Tasks assigned to you that need attention</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile Card View */}
                    <div className="lg:hidden p-4 space-y-4">
                      {getMyTasks().filter(task => task.status !== 'completed').map((task) => (
                        <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-gray-500 mt-1">{task.description.substring(0, 60)}...</p>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ml-2 flex-shrink-0 ${
                              task.priority === 'high' 
                                ? 'bg-red-100 text-red-800'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">{getProjectName(task.project_id)}</p>
                            <select
                              value={task.status}
                              onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                            disabled={task.status === 'completed'}
                          >
                            ✓ Complete Task
                          </button>
                        </div>
                      ))}
                      {getMyTasks().filter(task => task.status !== 'completed').length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          No active tasks assigned to you
                        </div>
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {getMyTasks().filter(task => task.status !== 'completed').map((task) => (
                            <tr key={task.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                  {task.description && (
                                    <div className="text-sm text-gray-500">{task.description.substring(0, 60)}...</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {getProjectName(task.project_id)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  task.priority === 'high' 
                                    ? 'bg-red-100 text-red-800'
                                    : task.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <select
                                  value={task.status}
                                  onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="todo">To Do</option>
                                  <option value="in-progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => handleCompleteTask(task.id)}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                                  disabled={task.status === 'completed'}
                                >
                                  ✓ Complete
                                </button>
                              </td>
                            </tr>
                          ))}
                          {getMyTasks().filter(task => task.status !== 'completed').length === 0 && (
                            <tr>
                              <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                No active tasks assigned to you
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Completed Tasks Tab */}
            {activeTab === "completed" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 lg:p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Completed Tasks</h3>
                  <p className="text-sm text-gray-500 mt-1">Your task completion history</p>
                </div>
                
                {/* Mobile Card View */}
                <div className="lg:hidden p-4 space-y-4">
                  {getCompletedTasks().map((task) => (
                    <div key={task.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1">{task.description.substring(0, 60)}...</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ml-2 flex-shrink-0 ${
                          task.priority === 'high' 
                            ? 'bg-red-100 text-red-800'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <p>{getProjectName(task.project_id)}</p>
                        <p>{new Date(task.updated_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <p>Assigned to: {getUserName(task.assignee_id)}</p>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">✓ Completed</span>
                      </div>
                    </div>
                  ))}
                  {getCompletedTasks().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      No completed tasks yet
                    </div>
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getCompletedTasks().map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-gray-500">{task.description.substring(0, 60)}...</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getProjectName(task.project_id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              task.priority === 'high' 
                                ? 'bg-red-100 text-red-800'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(task.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getUserName(task.assignee_id)}
                          </td>
                        </tr>
                      ))}
                      {getCompletedTasks().length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                            No completed tasks yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};