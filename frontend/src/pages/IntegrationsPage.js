import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { integrationsAPI } from "../api/client";

export const IntegrationsPage = ({ user, onLogout }) => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [connectionData, setConnectionData] = useState({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await integrationsAPI.getIntegrations();
      setIntegrations(response.data.integrations || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (type) => {
    try {
      let response;
      switch (type) {
        case 'slack':
          response = await integrationsAPI.connectSlack(connectionData.webhook_url);
          break;
        case 'trello':
          response = await integrationsAPI.connectTrello(connectionData.api_key, connectionData.token);
          break;
        case 'github':
          response = await integrationsAPI.connectGitHub(connectionData.token);
          break;
        default:
          throw new Error('Unknown integration type');
      }
      
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} connected successfully!`);
      setShowConnectModal(false);
      setConnectionData({});
      fetchIntegrations();
    } catch (error) {
      console.error(`Failed to connect ${type}:`, error);
      const errorMessage = error.response?.data?.detail || `Failed to connect ${type}. Please check your credentials.`;
      alert(errorMessage);
    }
  };

  const handleDisconnect = async (integration) => {
    const confirmDisconnect = window.confirm(`Are you sure you want to disconnect ${integration.type.charAt(0).toUpperCase() + integration.type.slice(1)}?`);
    if (confirmDisconnect) {
      try {
        await integrationsAPI.disconnectIntegration(integration.id);
        alert(`${integration.type.charAt(0).toUpperCase() + integration.type.slice(1)} disconnected successfully!`);
        fetchIntegrations();
      } catch (error) {
        console.error(`Failed to disconnect ${integration.type}:`, error);
        const errorMessage = error.response?.data?.detail || `Failed to disconnect ${integration.type}`;
        alert(errorMessage);
      }
    }
  };

  const availableIntegrations = [
    {
      name: 'Slack',
      type: 'slack',
      icon: '💬',
      description: 'Send notifications and updates to Slack channels',
      fields: [
        { name: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/...' }
      ]
    },
    {
      name: 'Trello',
      type: 'trello',
      icon: '📋',
      description: 'Create cards and sync with Trello boards',
      fields: [
        { name: 'api_key', label: 'API Key', type: 'text', placeholder: 'Your Trello API Key' },
        { name: 'token', label: 'Token', type: 'text', placeholder: 'Your Trello Token' }
      ]
    },
    {
      name: 'GitHub',
      type: 'github',
      icon: '💻',
      description: 'Create issues and sync with repositories',
      fields: [
        { name: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
        <Header 
        user={user} 
        onLogout={onLogout} 
        currentPage="Integrations" 
        onToggleMobileSidebar={toggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
        <div className="flex">
          <Sidebar 
          currentPage="Integrations" 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
          <main className="flex-1 lg:ml-64 p-3 sm:p-4 lg:p-8">
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                <p className="text-gray-600 text-sm">Loading integrations...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        currentPage="Integrations" 
        onToggleMobileSidebar={toggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      <div className="flex">
        <Sidebar 
          currentPage="Integrations" 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
        
        <main className="flex-1 lg:ml-64 p-3 sm:p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header Section */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-blue-600/5 rounded-2xl"></div>
              <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg sm:text-xl">🔗</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    Integrations
                  </h1>
                </div>
                <p className="text-gray-600 text-sm sm:text-lg">
                  Connect your favorite tools to streamline your workflow, <span className="font-semibold text-indigo-600">{user.name}</span>.
                </p>
              </div>
            </div>

            {/* Enhanced Connected Integrations */}
            {integrations.length > 0 && (
              <div className="mb-8 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-2xl"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6">
                  <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm">✅</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      Connected Integrations
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {integrations.map((integration) => (
                      <div key={integration.id} className="bg-white/90 rounded-xl shadow-lg p-4 sm:p-6 border border-white/20 hover:shadow-xl transition-all duration-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
                          <div className="flex items-center">
                            <span className="text-xl sm:text-2xl mr-3">
                              {integration.type === 'slack' ? '💬' : integration.type === 'trello' ? '📋' : '💻'}
                            </span>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 capitalize">
                              {integration.type}
                            </h3>
                          </div>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 self-start sm:self-center">
                            Connected
                          </span>
                        </div>
                        <p className="text-gray-600 mb-4 text-xs sm:text-sm">
                          Connected on {format(new Date(integration.created_at), 'PPP')}
                        </p>
                        <button
                          onClick={() => handleDisconnect(integration)}
                          className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium hover:bg-red-50 px-2 py-1 rounded transition-colors duration-200"
                        >
                          Disconnect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Available Integrations */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-indigo-600/5 rounded-2xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6">
                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm">🚀</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Available Integrations
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {availableIntegrations.map((integration) => {
                    const isConnected = integrations.some(i => i.type === integration.type);
                    return (
                      <div key={integration.type} className="bg-white/90 rounded-xl shadow-lg p-4 sm:p-6 border border-white/20 hover:shadow-xl transition-all duration-200">
                        <div className="flex items-center mb-4">
                          <span className="text-xl sm:text-2xl mr-3">{integration.icon}</span>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{integration.name}</h3>
                        </div>
                        <p className="text-gray-600 mb-4 text-xs sm:text-sm">{integration.description}</p>
                        <button
                          onClick={() => {
                            if (!isConnected) {
                              setSelectedIntegration(integration);
                              setShowConnectModal(true);
                            }
                          }}
                          disabled={isConnected}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                            isConnected
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white hover:from-indigo-600 hover:to-blue-700 transform hover:scale-105 shadow-lg'
                          }`}
                        >
                          {isConnected ? 'Connected' : 'Connect'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Enhanced Connect Modal */}
      {showConnectModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl border border-white/20 transform transition-all duration-300 max-h-[90vh] overflow-y-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-blue-600/5 rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm">🔗</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Connect {selectedIntegration.name}
                </h3>
              </div>
              <div className="space-y-4">
                {selectedIntegration.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={connectionData[field.name] || ''}
                      onChange={(e) => setConnectionData({
                        ...connectionData,
                        [field.name]: e.target.value
                      })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowConnectModal(false);
                    setConnectionData({});
                  }}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100/50 transition-all duration-200 order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConnect(selectedIntegration.type)}
                  className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-indigo-600 hover:to-blue-700 font-medium transform hover:scale-105 transition-all duration-200 shadow-lg text-sm order-1 sm:order-2"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};