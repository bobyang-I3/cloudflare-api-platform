import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User, Clock } from 'lucide-react';

interface UserInfo {
  id: string;
  username: string;
  email: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender: UserInfo;
}

interface ConversationUser {
  user: UserInfo;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

// Use full URL for production to bypass proxy issues
const API_BASE = import.meta.env.VITE_API_BASE || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? `http://${window.location.hostname}:8000/api`
    : '/api');

export default function MessagesPanel() {
  const [conversations, setConversations] = useState<ConversationUser[]>([]);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showNewChat, setShowNewChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadConversations();
    loadAllUsers();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      if (selectedUser) {
        loadMessages(selectedUser.id, false);
      }
      loadConversations();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedUser]);

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

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/messages/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMessages = async (userId: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        // Refresh conversations to update unread count
        if (showLoading) loadConversations();
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: selectedUser.id,
          content: newMessage.trim(),
        }),
      });
      
      if (response.ok) {
        setNewMessage('');
        loadMessages(selectedUser.id, false);
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const selectUser = (user: UserInfo) => {
    setSelectedUser(user);
    setShowNewChat(false);
    loadMessages(user.id);
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

  return (
    <div style={{ display: 'flex', height: '600px', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      
      {/* Left Sidebar - Conversations */}
      <div style={{ width: '320px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={24} color="#667eea" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Messages</h2>
            </div>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              style={{
                padding: '8px 12px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              New Chat
            </button>
          </div>
          
          {/* New Chat - User List */}
          {showNewChat && (
            <div style={{ marginTop: '12px', maxHeight: '200px', overflowY: 'auto', background: '#f9fafb', borderRadius: '8px', padding: '8px' }}>
              {allUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => selectUser(user)}
                  style={{
                    padding: '10px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    background: 'white',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>{user.username}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
              <MessageSquare size={48} style={{ margin: '0 auto 12px' }} />
              <p>No conversations yet</p>
              <p style={{ fontSize: '14px' }}>Click "New Chat" to start messaging</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.user.id}
                onClick={() => selectUser(conv.user)}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  background: selectedUser?.id === conv.user.id ? '#f3f4f6' : 'white',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedUser?.id !== conv.user.id) e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (selectedUser?.id !== conv.user.id) e.currentTarget.style.background = 'white';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '16px'
                    }}>
                      {conv.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{conv.user.username}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatTime(conv.last_message_time)}</div>
                    </div>
                  </div>
                  {conv.unread_count > 0 && (
                    <div style={{
                      minWidth: '20px',
                      height: '20px',
                      borderRadius: '10px',
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 6px'
                    }}>
                      {conv.unread_count}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {conv.last_message}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Right Side - Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '20px'
                }}>
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '18px' }}>{selectedUser.username}</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>{selectedUser.email}</div>
                </div>
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
                  <MessageSquare size={48} style={{ margin: '0 auto 12px' }} />
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
                  <Send size={18} />
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
              <User size={64} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ marginBottom: '8px' }}>Select a conversation</h3>
              <p>Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

