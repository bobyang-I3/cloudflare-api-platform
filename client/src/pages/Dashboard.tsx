import { useState, useEffect } from 'react';
import { User, aiApi, usageApi, Model, ChatMessage, UsageStats } from '../api';
import ChatPanel from '../components/ChatPanel';
import UsagePanel from '../components/UsagePanel';
import ApiKeyPanel from '../components/ApiKeyPanel';
import AdminPanel from '../components/AdminPanel';
import CreditPanel from '../components/CreditPanel';
import MessagesPanel from '../components/MessagesPanel';
import ForumPanel from '../components/ForumPanel';
import ProfilePanel from '../components/ProfilePanel';
import GroupChatPanel from '../components/GroupChatPanel';
import MarketplacePanel from '../components/MarketplacePanel';
import MyResourcesPanel from '../components/MyResourcesPanel';
import ResourceTransactionsPanel from '../components/ResourceTransactionsPanel';
import ResourcePoolPanel from '../components/ResourcePoolPanel';
import ConversationSidebar, { Conversation } from '../components/ConversationSidebar';
import { MessageSquare, BarChart3, Key, Settings, LogOut, Zap, DollarSign, Mail, Users, UserCircle, UsersRound, Store, Package, Receipt, ChevronDown, Database } from 'lucide-react';

interface DashboardProps {
  token: string;
  user: User;
  onLogout: () => void;
}

type Tab = 'chat' | 'usage' | 'credits' | 'messages' | 'forum' | 'profile' | 'groups' | 'marketplace' | 'my-resources' | 'transactions' | 'resource-pool' | 'apikey' | 'admin';

export default function Dashboard({ token, user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [models, setModels] = useState<Model[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  
  // Conversation management state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [currentModel, setCurrentModel] = useState('@cf/meta/llama-3.1-8b-instruct');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // User menu state
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-collapse sidebar on mobile
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Load models
    aiApi.getModels().then(setModels).catch(console.error);
    
    // Load usage stats
    usageApi.getStats(token).then(setStats).catch(console.error);
    
    // Load conversations from localStorage (per user)
    const userConvKey = `conversations_${user.id}`;
    const userLastConvKey = `lastConversationId_${user.id}`;
    
    const stored = localStorage.getItem(userConvKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const convs = parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        }));
        setConversations(convs);
        
        // Load last active conversation
        const lastConvId = localStorage.getItem(userLastConvKey);
        if (lastConvId && convs.some((c: Conversation) => c.id === lastConvId)) {
          loadConversation(lastConvId, convs);
        }
      } catch (e) {
        console.error('Failed to load conversations:', e);
      }
    }
  }, [token, user.id]);

  // Save conversations whenever they change (per user)
  useEffect(() => {
    const userConvKey = `conversations_${user.id}`;
    if (conversations.length > 0) {
      try {
        // Limit to 50 most recent conversations to prevent storage overflow
        const limitedConversations = conversations
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 50);
        
        localStorage.setItem(userConvKey, JSON.stringify(limitedConversations));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn('LocalStorage quota exceeded. Clearing old conversations...');
          // Keep only the 10 most recent conversations
          const recentConversations = conversations
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 10);
          
          try {
            localStorage.setItem(userConvKey, JSON.stringify(recentConversations));
            setConversations(recentConversations);
          } catch (e) {
            // If still failing, clear all and start fresh
            console.error('Unable to save conversations. Clearing storage.');
            localStorage.removeItem(userConvKey);
          }
        } else {
          console.error('Failed to save conversations:', error);
        }
      }
    } else {
      // Clear if no conversations
      localStorage.removeItem(userConvKey);
    }
  }, [conversations, user.id]);

  // Save current conversation ID (per user)
  useEffect(() => {
    const userLastConvKey = `lastConversationId_${user.id}`;
    if (currentConversationId) {
      localStorage.setItem(userLastConvKey, currentConversationId);
    } else {
      localStorage.removeItem(userLastConvKey);
    }
  }, [currentConversationId, user.id]);

  const loadConversation = (id: string, convList = conversations) => {
    const conv = convList.find(c => c.id === id);
    if (conv) {
      setCurrentConversationId(id);
      setCurrentMessages(conv.messages);
      setCurrentModel(conv.model);
    }
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      model: currentModel
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    setCurrentMessages([]);
    setActiveTab('chat');
  };

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
    setActiveTab('chat');
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setCurrentMessages([]);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, title: newTitle, updatedAt: new Date() } : c
    ));
  };

  const handleMessagesChange = (messages: ChatMessage[]) => {
    // Only update if messages actually changed
    if (JSON.stringify(messages) === JSON.stringify(currentMessages)) {
      return;
    }
    
    setCurrentMessages(messages);
    
    // Update conversation (but don't trigger if no conversation and no messages)
    if (currentConversationId) {
      setConversations(prev => prev.map(c => {
        if (c.id === currentConversationId) {
          // Skip update if messages are the same
          if (JSON.stringify(c.messages) === JSON.stringify(messages)) {
            return c;
          }
          
          // Auto-generate title from first user message
          let title = c.title;
          if (title === 'New Chat' && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
            }
          }
          return {
            ...c,
            title,
            messages,
            model: currentModel,
            updatedAt: new Date()
          };
        }
        return c;
      }));
    } else if (messages.length > 0) {
      // Only create new conversation if we actually have messages
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg 
        ? firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
        : 'New Chat';
      
      const newConv: Conversation = {
        id: `conv_${Date.now()}`,
        title,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages,
        model: currentModel
      };
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
    }
  };

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
    if (currentConversationId) {
      setConversations(prev => prev.map(c =>
        c.id === currentConversationId ? { ...c, model, updatedAt: new Date() } : c
      ));
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '12px 16px' : '20px 32px',
          maxWidth: '1600px',
          margin: '0 auto'
        }}>
          <div style={{ flex: isMobile ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
              <Zap size={isMobile ? 20 : 28} color="white" strokeWidth={2.5} />
              <h1 style={{ 
                fontSize: isMobile ? '18px' : '28px', 
                fontWeight: '700', 
                color: 'white', 
                marginBottom: '2px', 
                letterSpacing: '-0.02em' 
              }}>
                Cloudflare AI
              </h1>
            </div>
            {!isMobile && (
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', marginTop: '4px' }}>
                Welcome back, <span style={{ fontWeight: '600' }}>{user.username}</span> · {models.length} models ready
              </p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: isMobile ? '6px' : '12px', alignItems: 'center' }}>
            {!isMobile && stats && (
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Zap size={16} color="white" />
                <span style={{ fontWeight: '700', color: 'white', fontSize: '16px' }}>
                  {stats.total_tokens.toLocaleString()}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>tokens</span>
              </div>
            )}
            
            {/* User Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  fontSize: isMobile ? '12px' : '14px',
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: isMobile ? '8px' : '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '6px' : '10px',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showUserMenu ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)';
                }}
              >
                <UserCircle size={isMobile ? 16 : 20} />
                {!isMobile && <span>{user.username}</span>}
                <ChevronDown size={14} style={{ 
                  transition: 'transform 0.2s',
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)'
                }} />
              </button>
              
              {/* Dropdown Menu */}
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                  minWidth: '200px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setShowUserMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'white',
                      border: 'none',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#1f2937',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <UserCircle size={18} color="#667eea" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#ef4444',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          background: 'rgba(0,0,0,0.05)',
          display: 'flex',
          gap: isMobile ? '4px' : '8px',
          paddingLeft: isMobile ? '8px' : '32px',
          paddingRight: isMobile ? '8px' : '32px',
          maxWidth: '1600px',
          margin: '0 auto',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {[
            // Core Features
            { id: 'chat', icon: MessageSquare, label: 'Chat', tab: 'chat', group: 'core' },
            { id: 'usage', icon: BarChart3, label: 'Usage', tab: 'usage', group: 'core' },
            
            // Social & Community  
            { id: 'messages', icon: Mail, label: 'Messages', tab: 'messages', group: 'social' },
            { id: 'forum', icon: Users, label: 'Forum', tab: 'forum', group: 'social' },
            { id: 'groups', icon: UsersRound, label: 'Groups', tab: 'groups', group: 'social' },
            
            // Marketplace & Trading
            { id: 'marketplace', icon: Store, label: 'Market', tab: 'marketplace', group: 'market' },
            { id: 'my-resources', icon: Package, label: 'My Resources', tab: 'my-resources', group: 'market' },
            { id: 'transactions', icon: Receipt, label: 'Transactions', tab: 'transactions', group: 'market' },
            { id: 'resource-pool', icon: Database, label: 'Resource Pool', tab: 'resource-pool', group: 'market' },
            
            // Account Management
            { id: 'credits', icon: DollarSign, label: 'Credits', tab: 'credits', group: 'account' },
            { id: 'apikey', icon: Key, label: 'API Key', tab: 'apikey', group: 'account' },
            
            // Admin
            ...(user.is_admin ? [{ id: 'admin', icon: Settings, label: 'Admin', tab: 'admin', group: 'admin' }] : []),
          ].map(({ id, icon: Icon, label, tab, group }, index, array) => {
            const prevItem = array[index - 1];
            const showDivider = prevItem && prevItem.group !== group;
            
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
                {showDivider && (
                  <div style={{
                    width: '1px',
                    height: isMobile ? '24px' : '32px',
                    background: 'rgba(255,255,255,0.3)',
                    margin: isMobile ? '0 4px' : '0 8px'
                  }} />
                )}
                <button
                  onClick={() => setActiveTab(tab as Tab)}
                  style={{
                    padding: isMobile ? '10px 12px' : '14px 20px',
                    border: 'none',
                    background: activeTab === tab ? 'rgba(255,255,255,0.95)' : 'transparent',
                    cursor: 'pointer',
                    borderRadius: activeTab === tab ? (isMobile ? '8px 8px 0 0' : '12px 12px 0 0') : '0',
                    color: activeTab === tab ? '#667eea' : 'rgba(255,255,255,0.85)',
                    fontWeight: activeTab === tab ? '600' : '500',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '6px' : '8px',
                    fontSize: isMobile ? '12px' : '14px',
                    whiteSpace: 'nowrap',
                    boxShadow: activeTab === tab ? '0 -2px 8px rgba(102, 126, 234, 0.2)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                    }
                  }}
                >
                  <Icon size={isMobile ? 16 : 18} />
                  {!isMobile && label}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content - Three column layout for chat */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activeTab === 'chat' ? (
          <>
            {/* Conversation Sidebar */}
            <ConversationSidebar
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={handleRenameConversation}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            
            {/* Chat Panel */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
              <ChatPanel 
                apiKey={user.api_key} 
                models={models}
                initialMessages={currentMessages}
                initialModel={currentModel}
                onMessagesChange={handleMessagesChange}
                onModelChange={handleModelChange}
              />
            </div>
          </>
        ) : (
          <div className="container" style={{ paddingTop: '24px', width: '100%' }}>
            {activeTab === 'usage' && (
              <UsagePanel token={token} />
            )}
            {activeTab === 'credits' && (
              <CreditPanel token={token} isAdmin={user.is_admin || false} />
            )}
            {activeTab === 'messages' && (
              <MessagesPanel />
            )}
            {activeTab === 'forum' && (
              <ForumPanel />
            )}
            {activeTab === 'groups' && (
              <GroupChatPanel />
            )}
            {activeTab === 'profile' && (
              <ProfilePanel />
            )}
            {activeTab === 'marketplace' && (
              <MarketplacePanel />
            )}
            {activeTab === 'my-resources' && (
              <MyResourcesPanel />
            )}
            {activeTab === 'transactions' && (
              <ResourceTransactionsPanel />
            )}
            {activeTab === 'resource-pool' && (
              <ResourcePoolPanel />
            )}
            {activeTab === 'apikey' && (
              <ApiKeyPanel user={user} token={token} />
            )}
            {activeTab === 'admin' && user.is_admin && (
              <AdminPanel />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
