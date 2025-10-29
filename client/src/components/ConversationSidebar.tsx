import React, { useState } from 'react';
import { ChatMessage } from '../api';

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  model: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  collapsed,
  onToggleCollapse
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleRenameStart = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleRenameSave = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      onDeleteConversation(id);
    }
  };

  if (collapsed) {
    return (
      <div style={{
        width: '60px',
        background: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0'
      }}>
        <button
          onClick={onToggleCollapse}
          style={{
            padding: '12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px'
          }}
          title="Expand sidebar"
        >
          ▶️
        </button>
        <button
          onClick={onNewConversation}
          style={{
            marginTop: '12px',
            padding: '12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px'
          }}
          title="New conversation"
        >
          ➕
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '280px',
      background: '#f9fafb',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
          Conversations
        </h2>
        <button
          onClick={onToggleCollapse}
          style={{
            padding: '4px 8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
          title="Collapse sidebar"
        >
          ◀️
        </button>
      </div>

      {/* New Conversation Button */}
      <div style={{ padding: '12px' }}>
        <button
          onClick={onNewConversation}
          className="button button-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>➕</span>
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px'
      }}>
        {conversations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            No conversations yet
          </div>
        ) : (
          conversations
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .map(conversation => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                style={{
                  padding: '12px',
                  marginBottom: '4px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: currentConversationId === conversation.id ? '#667eea' : 'white',
                  color: currentConversationId === conversation.id ? 'white' : '#374151',
                  transition: 'all 0.2s',
                  position: 'relative',
                  border: '1px solid',
                  borderColor: currentConversationId === conversation.id ? '#667eea' : '#e5e7eb'
                }}
                onMouseEnter={(e) => {
                  if (currentConversationId !== conversation.id) {
                    e.currentTarget.style.background = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentConversationId !== conversation.id) {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                {editingId === conversation.id ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSave(conversation.id);
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                      onBlur={() => handleRenameSave(conversation.id)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: '60px'
                    }}>
                      {conversation.title}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      opacity: 0.7
                    }}>
                      {conversation.messages.length} messages
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      display: 'flex',
                      gap: '4px'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameStart(conversation);
                        }}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDelete(conversation.id, e)}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
