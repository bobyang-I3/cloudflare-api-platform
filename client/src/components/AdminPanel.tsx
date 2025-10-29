import React, { useState, useEffect } from 'react';
import { api, UserWithLimit, PlatformStats } from '../api';
import AdminCreditPanel from './AdminCreditPanel';

type AdminTab = 'users' | 'credits';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserWithLimit[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithLimit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingLimit, setEditingLimit] = useState(false);
  
  // Limit form state
  const [limitForm, setLimitForm] = useState({
    max_requests_per_day: 1000,
    max_tokens_per_day: 100000,
    max_tokens_per_month: 1000000,
    is_limited: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, statsData] = await Promise.all([
        api.getUsers(),
        api.getPlatformStats()
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditLimit = (user: UserWithLimit) => {
    setSelectedUser(user);
    setEditingLimit(true);
    if (user.limit) {
      setLimitForm({
        max_requests_per_day: user.limit.max_requests_per_day,
        max_tokens_per_day: user.limit.max_tokens_per_day,
        max_tokens_per_month: user.limit.max_tokens_per_month,
        is_limited: user.limit.is_limited
      });
    } else {
      setLimitForm({
        max_requests_per_day: 1000,
        max_tokens_per_day: 100000,
        max_tokens_per_month: 1000000,
        is_limited: false
      });
    }
  };

  const handleSaveLimit = async () => {
    if (!selectedUser) return;
    
    try {
      await api.updateUserLimit(selectedUser.user.id, limitForm);
      setEditingLimit(false);
      setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update limit');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.updateUserStatus(userId, !currentStatus);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }
    
    try {
      await api.deleteUser(userId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading admin data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
          🔧 Admin Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Platform-wide user management and monitoring
        </p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '32px', borderBottom: '2px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'users' ? '#3b82f6' : 'transparent',
              color: activeTab === 'users' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '-2px',
              borderBottom: activeTab === 'users' ? '2px solid #3b82f6' : 'none'
            }}
          >
            👥 Users
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'credits' ? '#10b981' : 'transparent',
              color: activeTab === 'credits' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '-2px',
              borderBottom: activeTab === 'credits' ? '2px solid #10b981' : 'none'
            }}
          >
            💰 Credits
          </button>
        </div>
      </div>

      {/* Credits Tab */}
      {activeTab === 'credits' && <AdminCreditPanel />}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              color: '#991b1b'
            }}>
              {error}
            </div>
          )}

          {/* Platform Statistics */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div className="card" style={{ background: '#f0f9ff', borderColor: '#3b82f6' }}>
            <div style={{ fontSize: '13px', color: '#1e40af', marginBottom: '4px' }}>Total Users</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e3a8a' }}>{stats.total_users}</div>
          </div>
          
          <div className="card" style={{ background: '#f0fdf4', borderColor: '#10b981' }}>
            <div style={{ fontSize: '13px', color: '#047857', marginBottom: '4px' }}>Active Users</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#065f46' }}>{stats.active_users}</div>
          </div>
          
          <div className="card" style={{ background: '#fef3c7', borderColor: '#f59e0b' }}>
            <div style={{ fontSize: '13px', color: '#92400e', marginBottom: '4px' }}>Total Requests</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#78350f' }}>
              {stats.total_requests.toLocaleString()}
            </div>
          </div>
          
          <div className="card" style={{ background: '#f3e8ff', borderColor: '#a855f7' }}>
            <div style={{ fontSize: '13px', color: '#6b21a8', marginBottom: '4px' }}>Total Tokens</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#581c87' }}>
              {(stats.total_tokens / 1000000).toFixed(1)}M
            </div>
          </div>
          
          <div className="card" style={{ background: '#fff7ed', borderColor: '#f97316' }}>
            <div style={{ fontSize: '13px', color: '#9a3412', marginBottom: '4px' }}>Today's Requests</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#7c2d12' }}>
              {stats.requests_today.toLocaleString()}
            </div>
          </div>
          
          <div className="card" style={{ background: '#fce7f3', borderColor: '#ec4899' }}>
            <div style={{ fontSize: '13px', color: '#9d174d', marginBottom: '4px' }}>Today's Tokens</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#831843' }}>
              {(stats.tokens_today / 1000).toFixed(1)}K
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          👥 User Management
        </h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={tableHeaderStyle}>User</th>
                <th style={tableHeaderStyle}>Email</th>
                <th style={tableHeaderStyle}>Role</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Usage</th>
                <th style={tableHeaderStyle}>Limits</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(userItem => (
                <tr key={userItem.user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tableCellStyle}>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>{userItem.user.username}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>ID: {userItem.user.id.substring(0, 8)}...</div>
                  </td>
                  
                  <td style={tableCellStyle}>
                    <div style={{ fontSize: '14px', color: '#4b5563' }}>{userItem.user.email}</div>
                  </td>
                  
                  <td style={tableCellStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: userItem.user.is_admin ? '#dbeafe' : '#f3f4f6',
                      color: userItem.user.is_admin ? '#1e40af' : '#374151'
                    }}>
                      {userItem.user.role}
                    </span>
                  </td>
                  
                  <td style={tableCellStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: userItem.user.is_active ? '#d1fae5' : '#fee2e2',
                      color: userItem.user.is_active ? '#047857' : '#991b1b'
                    }}>
                      {userItem.user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  
                  <td style={tableCellStyle}>
                    <div style={{ fontSize: '13px' }}>
                      <div>📊 {userItem.total_requests} reqs</div>
                      <div>🎯 {(userItem.total_tokens / 1000).toFixed(1)}K tokens</div>
                      <div style={{ color: '#f59e0b' }}>Today: {userItem.requests_today} / {(userItem.tokens_today / 1000).toFixed(1)}K</div>
                    </div>
                  </td>
                  
                  <td style={tableCellStyle}>
                    {userItem.limit ? (
                      userItem.limit.is_limited ? (
                        <div style={{ fontSize: '12px', color: '#dc2626' }}>
                          <div>🚫 Limited</div>
                          <div>{userItem.limit.max_requests_per_day}/day</div>
                          <div>{(userItem.limit.max_tokens_per_day / 1000).toFixed(0)}K tok/day</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#10b981' }}>✅ Unlimited</div>
                      )
                    ) : (
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>No limit set</div>
                    )}
                  </td>
                  
                  <td style={tableCellStyle}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEditLimit(userItem)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Edit Limits
                      </button>
                      
                      {!userItem.user.is_admin && (
                        <>
                          <button
                            onClick={() => handleToggleUserStatus(userItem.user.id, userItem.user.is_active)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: userItem.user.is_active ? '#f59e0b' : '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            {userItem.user.is_active ? 'Disable' : 'Enable'}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteUser(userItem.user.id, userItem.user.username)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Limit Modal */}
      {editingLimit && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Edit Limits for {selectedUser.user.username}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={limitForm.is_limited}
                  onChange={(e) => setLimitForm({ ...limitForm, is_limited: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: '500' }}>Enable Limits</span>
              </label>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Max Requests per Day (0 = unlimited)
                </label>
                <input
                  type="number"
                  value={limitForm.max_requests_per_day}
                  onChange={(e) => setLimitForm({ ...limitForm, max_requests_per_day: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  disabled={!limitForm.is_limited}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Max Tokens per Day (0 = unlimited)
                </label>
                <input
                  type="number"
                  value={limitForm.max_tokens_per_day}
                  onChange={(e) => setLimitForm({ ...limitForm, max_tokens_per_day: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  disabled={!limitForm.is_limited}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Max Tokens per Month (0 = unlimited)
                </label>
                <input
                  type="number"
                  value={limitForm.max_tokens_per_month}
                  onChange={(e) => setLimitForm({ ...limitForm, max_tokens_per_month: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  disabled={!limitForm.is_limited}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={handleSaveLimit}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
                
                <button
                  onClick={() => { setEditingLimit(false); setSelectedUser(null); }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em'
};

const tableCellStyle: React.CSSProperties = {
  padding: '16px',
  fontSize: '14px',
  color: '#374151'
};


