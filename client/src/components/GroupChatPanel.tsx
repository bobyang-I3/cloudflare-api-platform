import { useState, useEffect, useRef } from 'react';
import { Users, Plus, Send, Settings, UserPlus, LogOut, Trash2, Clock, X } from 'lucide-react';

interface UserInfo {
  id: string;
  username: string;
  email: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  user: UserInfo;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  creator_id: string;
  created_at: string;
  updated_at: string;
  creator: UserInfo;
  members: GroupMember[];
  member_count: number;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: UserInfo;
}

// Use full URL for production to bypass proxy issues
const API_BASE = import.meta.env.VITE_API_BASE || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? `http://${window.location.hostname}:8000/api`
    : '/api');

export default function GroupChatPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Create group dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserInfo[]>([]);
  
  // Add member dialog
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadGroups();
    loadAvailableUsers();
    
    // Auto-refresh
    const interval = setInterval(() => {
      if (selectedGroup) {
        loadMessages(selectedGroup.id, false);
      }
      loadGroups();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedGroup]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.id);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/groups/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/messages/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMessages = async (groupId: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/groups/${groupId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const selectGroup = (group: Group) => {
    setSelectedGroup(group);
    loadMessages(group.id);
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/groups/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || null,
          member_ids: selectedMembers,
        }),
      });
      
      if (response.ok) {
        setNewGroupName('');
        setNewGroupDesc('');
        setSelectedMembers([]);
        setShowCreateDialog(false);
        loadGroups();
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const addMember = async (userId: string) => {
    if (!selectedGroup) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      
      if (response.ok) {
        loadGroups();
        // Reload selected group
        const updatedGroup = groups.find(g => g.id === selectedGroup.id);
        if (updatedGroup) {
          const token = localStorage.getItem('token');
          const groupResponse = await fetch(`${API_BASE}/groups/${selectedGroup.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (groupResponse.ok) {
            const data = await groupResponse.json();
            setSelectedGroup(data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const leaveGroup = async () => {
    if (!selectedGroup || !confirm('Are you sure you want to leave this group?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/groups/${selectedGroup.id}/members/${currentUserId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.ok) {
        setSelectedGroup(null);
        loadGroups();
      }
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/groups/${selectedGroup.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      
      if (response.ok) {
        setNewMessage('');
        loadMessages(selectedGroup.id, false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div style={{ display: 'flex', height: '600px', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      
      {/* Left Sidebar - Groups */}
      <div style={{ width: '320px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={24} color="#667eea" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Groups</h2>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              style={{
                padding: '8px 12px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>
        
        {/* Groups List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
              <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.5' }} />
              <p>No groups yet</p>
              <p style={{ fontSize: '14px' }}>Create or join a group</p>
            </div>
          ) : (
            groups.map(group => (
              <div
                key={group.id}
                onClick={() => selectGroup(group)}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  background: selectedGroup?.id === group.id ? '#f3f4f6' : 'white',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedGroup?.id !== group.id) e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (selectedGroup?.id !== group.id) e.currentTarget.style.background = 'white';
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '18px',
                    flexShrink: 0
                  }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {group.member_count} members
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Right Side - Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedGroup ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '4px' }}>
                  {selectedGroup.name}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  {selectedGroup.member_count} members
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowAddMemberDialog(true)}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Add Member"
                >
                  <UserPlus size={18} />
                </button>
                <button
                  onClick={leaveGroup}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Leave Group"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
            
            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: '#f9fafb'
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <Users size={48} style={{ margin: '0 auto 12px' }} />
                  <p>No messages yet</p>
                  <p style={{ fontSize: '14px' }}>Start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.sender_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        marginBottom: '16px'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        background: isOwn ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                        color: isOwn ? 'white' : '#1f2937',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        {!isOwn && (
                          <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px', opacity: 0.8 }}>
                            {msg.sender.username}
                          </div>
                        )}
                        <div style={{ marginBottom: '6px', wordWrap: 'break-word' }}>{msg.content}</div>
                        <div style={{
                          fontSize: '11px',
                          opacity: 0.7,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          justifyContent: 'flex-end'
                        }}>
                          <Clock size={12} />
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e5e7eb',
              background: 'white'
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  style={{
                    padding: '12px 24px',
                    background: newMessage.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <Send size={16} />
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Users size={64} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ marginBottom: '8px' }}>Select a group</h3>
              <p>Choose a group or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
      {showCreateDialog && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Create New Group</h2>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewGroupName('');
                  setNewGroupDesc('');
                  setSelectedMembers([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Description
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What's this group about?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Add Members
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}>
                  {availableUsers.map(user => (
                    <label
                      key={user.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        marginBottom: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={() => toggleMemberSelection(user.id)}
                        style={{ marginRight: '10px', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{user.username}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewGroupName('');
                    setNewGroupDesc('');
                    setSelectedMembers([]);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createGroup}
                  disabled={!newGroupName.trim()}
                  style={{
                    padding: '10px 24px',
                    background: newGroupName.trim() 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : '#e5e7eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: newGroupName.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: '600'
                  }}
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddMemberDialog && selectedGroup && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Add Member</h2>
              <button
                onClick={() => setShowAddMemberDialog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '16px' }}>
              {availableUsers.filter(u => !selectedGroup.members.some(m => m.user_id === u.id)).map(user => (
                <div
                  key={user.id}
                  onClick={() => {
                    addMember(user.id);
                    setShowAddMemberDialog(false);
                  }}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>{user.username}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

