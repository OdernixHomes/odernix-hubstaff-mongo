import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { projectsAPI, usersAPI } from "../api/client";

export const ProjectsPage = ({ user, onLogout }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState({
    name: "",
    client: "",
    description: "",
    initialTasks: []
  });
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignee_id: "",
    priority: "medium",
    estimated_hours: "",
    due_date: ""
  });

  useEffect(() => {
    fetchProjectData();
  }, []);

  const fetchProjectData = async () => {
    try {
      const [projectsResponse, statsResponse, usersResponse] = await Promise.all([
        projectsAPI.getProjects(),
        projectsAPI.getProjectStats(),
        usersAPI.getUsers()
      ]);
      
      setProjects(projectsResponse.data);
      setUsers(usersResponse.data);
      
      // Also fetch some tasks for display
      if (projectsResponse.data.length > 0) {
        const tasksPromises = projectsResponse.data.slice(0, 3).map(project => 
          projectsAPI.getProjectTasks(project.id).catch(() => ({ data: [] }))
        );
        const tasksResponses = await Promise.all(tasksPromises);
        const allTasks = tasksResponses.flatMap(response => response.data);
        setTasks(allTasks);
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      // Create the project first
      const projectData = {
        name: newProject.name,
        client: newProject.client,
        description: newProject.description
      };
      
      const projectResponse = await projectsAPI.createProject(projectData);
      const createdProject = projectResponse.data;
      
      // Create initial tasks if any
      if (newProject.initialTasks.length > 0) {
        const taskPromises = newProject.initialTasks.map(task => 
          projectsAPI.createTask(createdProject.id, task)
        );
        await Promise.all(taskPromises);
      }
      
      alert(`Project "${newProject.name}" created successfully!`);
      setNewProject({ name: "", client: "", description: "", initialTasks: [] });
      setShowCreateModal(false);
      fetchProjectData(); // Refresh data
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleViewProject = (projectId) => {
    // For now, just show project details in an alert
    const project = projects.find(p => p.id === projectId);
    if (project) {
      alert(`Project Details:\n\nName: ${project.name}\nClient: ${project.client}\nBudget: $${project.budget}\nStatus: ${project.status}\nHours Tracked: ${project.hours_tracked || 0}h\nSpent: $${project.spent || 0}`);
    }
  };

  const handleEditProject = (project) => {
    // For now, just show edit functionality placeholder
    alert(`Edit functionality for "${project.name}" will be implemented in a future update.`);
  };

  // Get users that current user can assign tasks to based on role
  const getAssignableUsers = () => {
    if (user.role === 'admin') {
      // Admin can assign to managers and users
      return users.filter(u => u.role === 'manager' || u.role === 'user');
    } else if (user.role === 'manager') {
      // Manager can assign to users only
      return users.filter(u => u.role === 'user');
    }
    return []; // Regular users cannot assign tasks
  };

  const handleAddTask = (projectId) => {
    if (user.role !== 'admin' && user.role !== 'manager') {
      alert('Only administrators and managers can create tasks.');
      return;
    }
    setSelectedProjectId(projectId);
    setNewTask({
      title: "",
      description: "",
      assignee_id: "",
      priority: "medium",
      estimated_hours: "",
      due_date: ""
    });
    setShowTaskModal(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        assignee_id: newTask.assignee_id,
        priority: newTask.priority,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
        due_date: newTask.due_date || null
      };

      await projectsAPI.createTask(selectedProjectId, taskData);
      alert(`Task "${newTask.title}" created successfully!`);
      setNewTask({
        title: "",
        description: "",
        assignee_id: "",
        priority: "medium",
        estimated_hours: "",
        due_date: ""
      });
      setShowTaskModal(false);
      setSelectedProjectId(null);
      fetchProjectData(); // Refresh data
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const addTaskToProject = () => {
    if (user.role !== 'admin' && user.role !== 'manager') {
      return;
    }
    
    const newTaskForProject = {
      title: "",
      description: "",
      assignee_id: "",
      priority: "medium",
      estimated_hours: "",
      due_date: ""
    };
    setNewProject({
      ...newProject,
      initialTasks: [...newProject.initialTasks, newTaskForProject]
    });
  };

  const updateInitialTask = (index, field, value) => {
    const updatedTasks = [...newProject.initialTasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setNewProject({ ...newProject, initialTasks: updatedTasks });
  };

  const removeInitialTask = (index) => {
    const updatedTasks = newProject.initialTasks.filter((_, i) => i !== index);
    setNewProject({ ...newProject, initialTasks: updatedTasks });
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <Header user={user} onLogout={onLogout} currentPage="Projects" />
        <div className="flex">
          <Sidebar currentPage="Projects" />
          <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
                  <p className="text-gray-600 text-sm">Loading projects...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <Header user={user} onLogout={onLogout} currentPage="Projects" />
      <div className="flex">
        <Sidebar currentPage="Projects" />
        
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header Section */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5 rounded-2xl"></div>
              <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xl">📁</span>
                      </div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Projects
                      </h1>
                    </div>
                    <p className="text-gray-600 text-lg">
                      Manage your projects and track their progress, <span className="font-semibold text-emerald-600">{user.name}</span>.
                    </p>
                  </div>
                  {(user.role === 'admin' || user.role === 'manager') && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-700 flex items-center transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <span className="mr-2 text-lg">➕</span>
                      New Project
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => {
                const gradientColors = [
                  { gradient: "from-blue-500 to-cyan-600", lightGradient: "from-blue-600/10 to-cyan-600/10", textColor: "text-blue-600" },
                  { gradient: "from-emerald-500 to-teal-600", lightGradient: "from-emerald-600/10 to-teal-600/10", textColor: "text-emerald-600" },
                  { gradient: "from-purple-500 to-pink-600", lightGradient: "from-purple-600/10 to-pink-600/10", textColor: "text-purple-600" },
                  { gradient: "from-orange-500 to-red-600", lightGradient: "from-orange-600/10 to-red-600/10", textColor: "text-orange-600" },
                  { gradient: "from-indigo-500 to-purple-600", lightGradient: "from-indigo-600/10 to-purple-600/10", textColor: "text-indigo-600" }
                ];
                const colorScheme = gradientColors[index % gradientColors.length];
                
                return (
                  <div key={project.id} className="relative group cursor-pointer">
                    <div className={`absolute inset-0 bg-gradient-to-r ${colorScheme.lightGradient} rounded-2xl transform group-hover:scale-105 transition-transform duration-200`}></div>
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 bg-gradient-to-r ${colorScheme.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                            <span className="text-white text-lg">📊</span>
                          </div>
                          <h3 className={`text-lg font-bold ${colorScheme.textColor}`}>{project.name}</h3>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          project.status === 'active' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-gray-700 font-medium mb-1">Client:</p>
                        <p className="text-gray-600">{project.client}</p>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">⏱️</span>
                            <span className="text-sm text-gray-600">Hours tracked:</span>
                          </div>
                          <span className={`font-bold ${colorScheme.textColor}`}>{(project.hours_tracked || 0).toFixed(2)}h</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">👤</span>
                            <span className="text-sm text-gray-600">Created by:</span>
                          </div>
                          <span className="font-medium text-gray-700">{getUserName(project.created_by)}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => handleViewProject(project.id)}
                            className={`${colorScheme.textColor} hover:opacity-80 text-sm font-medium transition-opacity duration-200`}
                          >
                            👁️ View
                          </button>
                          {(user.role === 'admin' || user.role === 'manager') && (
                            <button 
                              onClick={() => handleEditProject(project)}
                              className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors duration-200"
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </div>
                        {(user.role === 'admin' || user.role === 'manager') && (
                          <button 
                            onClick={() => handleAddTask(project.id)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-green-600 hover:to-emerald-700 flex items-center transform hover:scale-105 transition-all duration-200 shadow-lg"
                          >
                            <span className="mr-1">+</span>
                            Add Task
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Enhanced Tasks Section */}
            <div className="mt-12">
              <div className="relative group mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-purple-600/5 rounded-2xl"></div>
                <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">📋</span>
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Recent Tasks
                    </h2>
                  </div>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-gray-600/5 rounded-2xl"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📝 Task</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📁 Project</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">👤 Assignee</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📊 Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🎯 Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {tasks.length > 0 ? tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-white/60 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {projects.find(p => p.id === task.project_id)?.name || 'Unknown Project'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getUserName(task.assignee_id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              task.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : task.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status}
                            </span>
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
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center space-y-3">
                              <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-slate-300 rounded-2xl flex items-center justify-center">
                                <span className="text-2xl">📋</span>
                              </div>
                              <p className="text-gray-500 font-medium">No tasks found</p>
                              <p className="text-sm text-gray-400">Tasks will appear here once they're created</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={newProject.client}
                    onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Initial Tasks Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Initial Tasks (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={addTaskToProject}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      + Add Task
                    </button>
                  </div>
                  
                  {newProject.initialTasks.map((task, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-3 mb-2 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-700">Task {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeInitialTask(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            placeholder="Task title"
                            value={task.title}
                            onChange={(e) => updateInitialTask(index, 'title', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <select
                            value={task.assignee_id}
                            onChange={(e) => updateInitialTask(index, 'assignee_id', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select assignee</option>
                            {getAssignableUsers().map(user => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.role})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <select
                            value={task.priority}
                            onChange={(e) => updateInitialTask(index, 'priority', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                          </select>
                        </div>
                        
                        <div>
                          <input
                            type="number"
                            placeholder="Estimated hours"
                            value={task.estimated_hours}
                            onChange={(e) => updateInitialTask(index, 'estimated_hours', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="0"
                            step="0.5"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <textarea
                          placeholder="Task description (optional)"
                          value={task.description}
                          onChange={(e) => updateInitialTask(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100/50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-700 font-medium transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Create Project
                </button>
              </div>
              </form>
            </div>
          </div>
          
        
      )}

      {/* Enhanced Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/20 transform transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-purple-600/5 rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📝</span>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Add New Task
                </h3>
              </div>
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To
                  </label>
                  <select
                    value={newTask.assignee_id}
                    onChange={(e) => setNewTask({...newTask, assignee_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select assignee</option>
                    {getAssignableUsers().map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({...newTask, estimated_hours: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.5"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskModal(false);
                      setSelectedProjectId(null);
                    }}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100/50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-600 hover:to-purple-700 font-medium transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};