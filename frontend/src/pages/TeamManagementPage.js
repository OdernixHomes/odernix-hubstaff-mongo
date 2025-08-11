import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { DashboardWidget } from "../components/DashboardWidget";
import { Avatar } from "../components/Avatar";
import { usersAPI, authAPI } from "../api/client";

export const TeamManagementPage = ({ user, onLogout }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [teamData, setTeamData] = useState({
    members: [],
    stats: {
      total_users: 0,
      active_users: 0,
      users_by_role: {}
    }
  });
  const [allInvitations, setAllInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const requests = [
        usersAPI.getUsers(),
        usersAPI.getTeamStats()
      ];
      
      // Only fetch invitations for admins
      if (user.role === 'admin') {
        requests.push(authAPI.getAllInvitations());
      }
      
      const responses = await Promise.all(requests);
      
      setTeamData({
        members: responses[0].data,
        stats: responses[1].data
      });
      
      // Set invitations only if user is admin
      if (user.role === 'admin' && responses[2]) {
        setAllInvitations(responses[2].data);
      } else {
        setAllInvitations([]);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    try {
      const response = await authAPI.inviteUser({ 
        email: inviteEmail, 
        role: inviteRole 
      });
      
      // Show invite link in alert
      const inviteLink = response.data.invite_link;
      alert(`Invitation sent to ${inviteEmail} with role: ${inviteRole}\n\nInvite Link:\n${inviteLink}\n\nShare this link with the user to register.`);
      
      setInviteEmail("");
      setInviteRole("user");
      setShowInviteModal(false);
      fetchTeamData(); // Refresh data
    } catch (error) {
      console.error('Failed to send invitation:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to send invitation';
      alert(`Error: ${errorMessage}`);
    }
  };

  const copyInviteLink = (inviteLink) => {
    navigator.clipboard.writeText(inviteLink);
    alert('Invite link copied to clipboard!');
  };

  const handleEditMember = (member) => {
    // Only allow editing for admin users
    if (user.role !== 'admin') {
      alert('Only administrators can edit team members.');
      return;
    }
    alert(`Edit functionality for "${member.name}" will be implemented in a future update.`);
  };

  const handleRemoveMember = async (member) => {
    // Only allow removal for admin users
    if (user.role !== 'admin') {
      alert('Only administrators can remove team members.');
      return;
    }
    
    if (member.id === user.id) {
      alert('You cannot remove yourself from the team.');
      return;
    }
    
    const confirmRemoval = window.confirm(`Are you sure you want to remove "${member.name}" from the team? This action cannot be undone.`);
    if (confirmRemoval) {
      try {
        await usersAPI.deleteUser(member.id);
        alert(`${member.name} has been removed from the team.`);
        fetchTeamData(); // Refresh data
      } catch (error) {
        console.error('Failed to remove team member:', error);
        const errorMessage = error.response?.data?.detail || 'Failed to remove team member';
        alert(`Error: ${errorMessage}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50">
        <Header 
        user={user} 
        onLogout={onLogout} 
        currentPage="Team" 
        onToggleMobileSidebar={toggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
        <div className="flex">
          <Sidebar 
          currentPage="Team" 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
          <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-200 border-t-rose-600"></div>
                  <p className="text-gray-600 text-sm">Loading team data...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        currentPage="Team" 
        onToggleMobileSidebar={toggleMobileSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      <div className="flex">
        <Sidebar 
          currentPage="Team" 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />
        
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header Section */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-600/5 to-pink-600/5 rounded-2xl"></div>
              <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xl">👥</span>
                      </div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                        Team Management
                      </h1>
                    </div>
                    <p className="text-gray-600 text-lg">
                      {user.role === 'admin' 
                        ? "Manage your team members and their roles, " 
                        : "View your team members and their current status, "}
                      <span className="font-semibold text-rose-600">{user.name}</span>.
                    </p>
                  </div>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-rose-600 hover:to-pink-700 flex items-center transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                    >
                      <span className="mr-2 text-lg">➕</span>
                      Invite Member
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <DashboardWidget 
                title="Team Members" 
                value={teamData.stats.total_users} 
                subtitle="Total registered" 
                icon="👥" 
                color="blue" 
              />
              <DashboardWidget 
                title="Active Users" 
                value={teamData.stats.active_users} 
                subtitle="Currently online" 
                icon="🟢" 
                color="green" 
              />
              <DashboardWidget 
                title="Pending Invites" 
                value={user.role === 'admin' ? allInvitations.filter(inv => inv.status === 'pending').length : 0} 
                subtitle="Awaiting response" 
                icon="📨" 
                color="purple" 
              />
            </div>

            {/* Enhanced Invitations Section - Admin Only */}
            {user.role === 'admin' && allInvitations.length > 0 && (
              <div className="relative group mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
                  <div className="p-6 border-b border-white/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">📨</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Invitations Sent</h3>
                        <p className="text-sm text-gray-600 mt-1">View all invitations you've sent and their current status</p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📧 Email</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">👤 Role</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📊 Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📅 Sent Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">⏰ Expires</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">⚡ Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/20">
                        {allInvitations.map((invite) => (
                          <tr key={invite.id} className="hover:bg-white/60 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {invite.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                invite.role === 'manager'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {invite.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                invite.status === 'accepted' 
                                  ? 'bg-green-100 text-green-800'
                                  : invite.status === 'expired'
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {invite.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(invite.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(invite.expires_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invite.status === 'pending' && (
                                <button
                                  onClick={() => copyInviteLink(invite.invite_link)}
                                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-1"
                                >
                                  <span>📋</span>
                                  <span>Copy</span>
                                </button>
                              )}
                              {invite.status === 'accepted' && (
                                <span className="text-green-600 text-xs">✓ Joined</span>
                              )}
                              {invite.status === 'expired' && (
                                <span className="text-red-600 text-xs">⚠ Expired</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Team Members List */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-2xl transform group-hover:scale-105 transition-transform duration-200"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
                <div className="p-6 border-b border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">👥</span>
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Team Members ({teamData.members.length})
                    </h3>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">👤 Member</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🏷️ Role</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📊 Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">⏰ Hours This Week</th>
                        {user.role === 'admin' && (
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">⚡ Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {teamData.members.map((member) => (
                        <tr key={member.id} className="hover:bg-white/60 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Avatar user={member} size="md" className="mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{member.name}</div>
                                <div className="text-sm text-gray-500">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              member.role === 'admin' 
                                ? 'bg-red-100 text-red-800'
                                : member.role === 'manager'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              member.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-blue-600">{(member.weekly_hours || 0).toFixed(1)}h</span>
                          </td>
                          {user.role === 'admin' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleEditMember(member)}
                                  className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:from-blue-600 hover:to-cyan-700 transform hover:scale-105 transition-all duration-200 shadow-sm"
                                >
                                  ✏️ Edit
                                </button>
                                <button 
                                  onClick={() => handleRemoveMember(member)}
                                  className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:from-red-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-sm"
                                >
                                  🗑️ Remove
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Enhanced Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/20 transform transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-600/5 to-pink-600/5 rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">➕</span>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                  Invite Team Member
                </h3>
              </div>
              <form onSubmit={handleInviteUser}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    required
                    placeholder="colleague@company.com"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 hover:bg-white/90"
                    required
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100/50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-rose-600 hover:to-pink-700 font-medium transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2"
                  >
                    <span>📧</span>
                    <span>Send Invitation</span>
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