// ============================================
// FILE 5: app/admin/users/page.js (NEW - User Management Page)
// ============================================
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UserManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchUsers();
      }
    }
  }, [status, session]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        showMessage('error', 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showMessage('error', 'An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleRoleChange = async (userId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    const confirmMessage = `Are you sure you want to make this user ${newRole === 'ADMIN' ? 'an Admin' : 'a regular User'}?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole, updatedAt: data.updatedAt } : user
        ));
        showMessage('success', `User role updated to ${newRole} successfully`);
      } else {
        showMessage('error', data.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      showMessage('error', 'An error occurred while updating user role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    const confirmMessage = `Are you sure you want to delete user "${username}"? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
        showMessage('success', 'User deleted successfully');
      } else {
        showMessage('error', data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('error', 'An error occurred while deleting user');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200">
      {/* Header */}
      <div className="bg-[#0f0f0f] border-b border-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"></div>
          <span className="text-xl font-semibold text-white">Genie Admin - User Management</span>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/admin"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Back to Admin
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-gray-400">Manage user roles and permissions</p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg border animate-fadeIn ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/50 text-green-400' 
              : 'bg-red-500/10 border-red-500/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            {user.username}
                            {user.isSuperAdmin && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                Super Admin
                              </span>
                            )}
                            {parseInt(session?.user?.id) === user.id && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{user.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {!user.isSuperAdmin && parseInt(session?.user?.id) !== user.id && (
                          <>
                            <button
                              onClick={() => handleRoleChange(user.id, user.role)}
                              disabled={actionLoading === user.id}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                user.role === 'ADMIN'
                                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {actionLoading === user.id ? (
                                'Processing...'
                              ) : user.role === 'ADMIN' ? (
                                'Make User'
                              ) : (
                                'Make Admin'
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              disabled={actionLoading === user.id}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {user.isSuperAdmin && (
                          <span className="text-xs text-gray-500 italic">Protected</span>
                        )}
                        {!user.isSuperAdmin && parseInt(session?.user?.id) === user.id && (
                          <span className="text-xs text-gray-500 italic">Cannot modify self</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No users found</p>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Total Users</h3>
            <p className="text-2xl font-bold text-white">{users.length}</p>
          </div>
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Admins</h3>
            <p className="text-2xl font-bold text-purple-400">
              {users.filter(u => u.role === 'ADMIN').length}
            </p>
          </div>
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Regular Users</h3>
            <p className="text-2xl font-bold text-green-400">
              {users.filter(u => u.role === 'USER').length}
            </p>
          </div>
        </div>

        {/* Permissions Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-3">ℹ️ Permission Rules</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• <strong className="text-white">Super Admin</strong> cannot be modified or deleted</li>
            <li>• <strong className="text-white">Admins</strong> can promote users to admin or demote admins to users</li>
            <li>• <strong className="text-white">Admins</strong> can delete regular users but not other admins or themselves</li>
            <li>• You cannot modify your own role or delete yourself</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
