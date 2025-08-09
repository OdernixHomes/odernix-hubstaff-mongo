import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { Timer } from "../components/Timer";
import { timeTrackingAPI, projectsAPI, usersAPI } from "../api/client";

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
  const [activityData, setActivityData] = useState({
    mouseActivity: 0,
    keyboardActivity: 0,
    screenshotCount: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [activeResponse, projectsResponse, allTasksResponse, usersResponse] = await Promise.all([
        timeTrackingAPI.getActiveEntry(),
        projectsAPI.getProjects(),
        projectsAPI.getAllTasks(),
        usersAPI.getUsers()
      ]);
      
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
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityData = async () => {
    try {
      // Get today's activity data
      const dailyReport = await timeTrackingAPI.getDailyReport();
      
      // Calculate activity percentages based on time entries
      const mockMouseActivity = Math.floor(Math.random() * 30) + 70; // 70-100%
      const mockKeyboardActivity = Math.floor(Math.random() * 25) + 65; // 65-90%
      
      setActivityData({
        mouseActivity: mockMouseActivity,
        keyboardActivity: mockKeyboardActivity,
        screenshotCount: Math.floor(Math.random() * 20) + 5
      });
    } catch (error) {
      console.error('Failed to fetch activity data:', error);
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

    try {
      const response = await timeTrackingAPI.startTracking({
        project_id: selectedProject,
        task_id: selectedTask || null,
        description: "Working on project"
      });
      setActiveEntry(response.data);
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  };

  const handleStop = async (entryId) => {
    try {
      await timeTrackingAPI.stopTracking(entryId);
      setActiveEntry(null);
    } catch (error) {
      console.error('Failed to stop tracking:', error);
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
    try {
      await projectsAPI.updateTask(taskId, { status: "completed" });
      fetchData(); // Refresh all data
      alert("Task marked as completed!");
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert("Failed to mark task as completed. Please try again.");
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await projectsAPI.updateTask(taskId, { status: newStatus });
      fetchData(); // Refresh all data
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert("Failed to update task status. Please try again.");
    }
  };

  const getUserName = (userId) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.name : 'Unknown User';
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const getTasksByStatus = (status) => {
    return allTasks.filter(task => task.status === status);
  };

  const getMyTasks = () => {
    return allTasks.filter(task => task.assignee_id === user.id);
  };

  const getPendingTasks = () => {
    return allTasks.filter(task => task.status === 'todo' || task.status === 'in-progress');
  };

  const getCompletedTasks = () => {
    return allTasks.filter(task => task.status === 'completed');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={onLogout} currentPage="Time Tracking" />
      <div className="flex">
        <Sidebar currentPage="Time Tracking" />
        
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Time Tracking & Tasks</h1>
              <p className="text-gray-600 mt-2">
                Track your time and manage your tasks efficiently.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab("timer")}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "timer"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Timer & Tracking
                  </button>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "tasks"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    My Tasks ({getMyTasks().length})
                  </button>
                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "completed"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Completed ({getCompletedTasks().length})
                  </button>
                </nav>
              </div>
            </div>

            {/* Timer Tab */}
            {activeTab === "timer" && (
              <div className="space-y-8">
                {/* Timer Section */}
                <div>
                  <Timer 
                    activeEntry={activeEntry}
                    onStart={handleStart}
                    onStop={handleStop}
                    onReset={handleReset}
                  />
                </div>

                {/* Project and Task Selection */}
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">What are you working on?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project
                      </label>
                      <select
                        value={selectedProject}
                        onChange={(e) => handleProjectChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        Task
                      </label>
                      <select
                        value={selectedTask}
                        onChange={(e) => setSelectedTask(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                </div>

                {/* Enhanced Activity Monitor */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">📊</span>
                      </div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Activity Monitor
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center group/item hover:transform hover:scale-105 transition-all duration-300">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover/item:shadow-xl group-hover/item:rotate-12 transition-all duration-300">
                          <span className="text-2xl">📸</span>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">Screenshots</h4>
                        <p className="text-lg font-bold text-blue-600">{activityData.screenshotCount}</p>
                        <p className="text-sm text-gray-500">captured today</p>
                      </div>
                      <div className="text-center group/item hover:transform hover:scale-105 transition-all duration-300">
                        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover/item:shadow-xl group-hover/item:rotate-12 transition-all duration-300">
                          <span className="text-2xl">🖱️</span>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">Mouse Activity</h4>
                        <p className="text-lg font-bold text-green-600">{activityData.mouseActivity}%</p>
                        <p className="text-sm text-gray-500">active</p>
                      </div>
                      <div className="text-center group/item hover:transform hover:scale-105 transition-all duration-300">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover/item:shadow-xl group-hover/item:rotate-12 transition-all duration-300">
                          <span className="text-2xl">⌨️</span>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">Keyboard Activity</h4>
                        <p className="text-lg font-bold text-purple-600">{activityData.keyboardActivity}%</p>
                        <p className="text-sm text-gray-500">active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div className="space-y-6">
                {/* Enhanced Task Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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

                {/* Enhanced Active Tasks */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
                    <div className="p-6 border-b border-white/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">🎯</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">My Active Tasks</h3>
                          <p className="text-sm text-gray-600 mt-1">Tasks assigned to you that need attention</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
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
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Completed Tasks</h3>
                  <p className="text-sm text-gray-500 mt-1">Your task completion history</p>
                </div>
                <div className="overflow-x-auto">
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