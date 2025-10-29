import React, { useState, useRef, useEffect } from 'react';
import { aiApi, Model, ChatMessage } from '../api';
import { Send, Loader2, Image as ImageIcon, X, User, Bot, Sparkles, Palette, BarChart3 } from 'lucide-react';

interface ChatPanelProps {
  apiKey: string;
  models: Model[];
  initialMessages?: ChatMessage[];
  initialModel?: string;
  onMessagesChange?: (messages: ChatMessage[]) => void;
  onModelChange?: (model: string) => void;
}

interface MessageWithMetadata extends ChatMessage {
  tokens?: number;
}

export default function ChatPanel({ 
  apiKey, 
  models, 
  initialMessages = [],
  initialModel = '@cf/meta/llama-3.1-8b-instruct',
  onMessagesChange,
  onModelChange
}: ChatPanelProps) {
  const [messages, setMessages] = useState<MessageWithMetadata[]>(initialMessages);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);

  // Update messages when initialMessages changes (conversation switch)
  useEffect(() => {
    // Only update if it's actually different
    if (JSON.stringify(initialMessages) !== JSON.stringify(messages)) {
      isInternalUpdate.current = false; // This is an external update
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Update model when initialModel changes
  useEffect(() => {
    if (initialModel !== selectedModel) {
      setSelectedModel(initialModel);
    }
  }, [initialModel]);

  // Notify parent of message changes (but only for internal updates)
  useEffect(() => {
    if (onMessagesChange && isInternalUpdate.current) {
      onMessagesChange(messages);
    }
    // Reset flag after notification
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
    if (onModelChange) {
      onModelChange(newModel);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: any = {
      role: 'user',
      content: input.trim()
    };
    
    // Add image data if uploaded (for vision models)
    if (uploadedImage) {
      userMessage.image = uploadedImage;
    }

    // Save image reference before clearing
    const imageToSend = uploadedImage;
    
    // Add message to UI
    isInternalUpdate.current = true;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await aiApi.chat(apiKey, {
        messages: [...messages, userMessage],
        model: selectedModel
      });

      const assistantMessage: MessageWithMetadata = {
        role: 'assistant',
        content: response.response,
        tokens: response.total_tokens
      };

      isInternalUpdate.current = true;
      setMessages(prev => [...prev, assistantMessage]);
      
      // Only clear image after successful response
      setUploadedImage(null);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      setError(errorMsg);
      
      // Remove user message on error
      isInternalUpdate.current = true;
      setMessages(prev => prev.slice(0, -1));
      
      // Restore image if failed
      if (imageToSend) {
        setUploadedImage(imageToSend);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image size should be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    isInternalUpdate.current = true; // Mark as internal update
    setMessages([]);
    setError('');
  };

  // Format message content with basic markdown-like styling
  const formatMessage = (content: string) => {
    // Check if content is an image data URI
    if (content.startsWith('data:image/')) {
      return (
        <img 
          src={content} 
          alt="Generated image" 
          style={{
            maxWidth: '100%',
            borderRadius: '8px',
            marginTop: '8px'
          }}
        />
      );
    }
    
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Code block
        const code = part.slice(3, -3).trim();
        const lines = code.split('\n');
        const language = lines[0].trim();
        const codeContent = lines.length > 1 ? lines.slice(1).join('\n') : code;
        
        return (
          <pre key={idx} style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '12px',
            borderRadius: '6px',
            overflowX: 'auto',
            fontSize: '13px',
            fontFamily: 'Monaco, Consolas, monospace',
            margin: '8px 0'
          }}>
            {language && (
              <div style={{
                color: '#94a3b8',
                fontSize: '11px',
                marginBottom: '8px',
                textTransform: 'uppercase'
              }}>
                {language}
              </div>
            )}
            <code>{codeContent}</code>
          </pre>
        );
      } else if (part.startsWith('`') && part.endsWith('`')) {
        // Inline code
        return (
          <code key={idx} style={{
            background: '#f1f5f9',
            color: '#e11d48',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '13px',
            fontFamily: 'Monaco, Consolas, monospace'
          }}>
            {part.slice(1, -1)}
          </code>
        );
      } else {
        // Regular text with line breaks
        return (
          <span key={idx} style={{ whiteSpace: 'pre-wrap' }}>
            {part}
          </span>
        );
      }
    });
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb',
        background: 'white'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              marginBottom: '8px',
              color: '#374151'
            }}>
              Select Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              {(() => {
                // Group models by task type
                const taskGroups = models.reduce((acc, model) => {
                  const task = model.task || 'text-generation';
                  if (!acc[task]) acc[task] = [];
                  acc[task].push(model);
                  return acc;
                }, {} as Record<string, Model[]>);

                // Task emoji mapping
                const taskEmoji: Record<string, string> = {
                  'text-generation': '💬',
                  'text-to-image': '🎨',
                  'automatic-speech-recognition': '🎤',
                  'text-to-speech': '🔊',
                  'text-embeddings': '🔢',
                  'translation': '🌐',
                  'summarization': '📝',
                  'image-to-text': '🖼️',
                  'voice-activity-detection': '📡',
                  'text-classification': '📊',
                  'object-detection': '🔍',
                  'image-classification': '🏷️'
                };

                // Sort tasks
                const sortedTasks = Object.keys(taskGroups).sort((a, b) => {
                  if (a === 'text-generation') return -1;
                  if (b === 'text-generation') return 1;
                  return a.localeCompare(b);
                });

                return sortedTasks.map(task => {
                  const taskLabel = task.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  const emoji = taskEmoji[task] || '📦';
                  
                  const sortedModels = taskGroups[task].sort((a, b) => {
                    if (a.status === 'verified' && b.status !== 'verified') return -1;
                    if (b.status === 'verified' && a.status !== 'verified') return 1;
                    return a.provider.localeCompare(b.provider);
                  });

                  return (
                    <optgroup key={task} label={`${emoji} ${taskLabel}`}>
                      {sortedModels.map(model => {
                        const statusBadge = model.status === 'verified' ? ' ✓' :
                                          model.status === 'beta' ? ' β' :
                                          model.status === 'deprecated' ? ' (deprecated)' : '';
                        return (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.provider}){statusBadge}
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                });
              })()}
            </select>
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              marginTop: '6px',
              lineHeight: '1.4'
            }}>
              {(() => {
                const currentModel = models.find(m => m.id === selectedModel);
                if (currentModel?.description) {
                  return `ℹ️ ${currentModel.description}`;
                }
                return 'ℹ️ Cloudflare Workers AI - Free tier and pay-as-you-go available';
              })()}
            </div>
          </div>
          
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="button button-secondary"
              style={{ 
                fontSize: '14px', 
                padding: '10px 20px',
                marginTop: '28px'
              }}
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        background: '#f9fafb'
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#9ca3af',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>💬</div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
              Start a conversation
            </h2>
            <p style={{ fontSize: '16px', maxWidth: '400px' }}>
              Send a message to chat with any of the {models.length} available AI models from Cloudflare Workers AI
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: msg.role === 'user' ? '#667eea' : '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                
                {/* Message Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    color: '#1f2937',
                    wordBreak: 'break-word'
                  }}>
                    {formatMessage(msg.content)}
                  </div>
                  {msg.role === 'assistant' && msg.tokens !== undefined && (
                    <div style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginTop: '8px'
                    }}>
                      🪙 {msg.tokens} tokens
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{
                marginBottom: '24px',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  🤖
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Assistant
                  </div>
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    color: '#6b7280'
                  }}>
                    <div className="loading-dots">
                      Thinking<span>.</span><span>.</span><span>.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        padding: '20px 24px',
        borderTop: '1px solid #e5e7eb',
        background: 'white'
      }}>
        {error && (
          <div style={{
            marginBottom: '12px',
            padding: '12px 16px',
            background: '#fee2e2',
            color: '#dc2626',
            borderRadius: '8px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        {/* Image Upload Area for Vision Models */}
        {models.find(m => m.id === selectedModel)?.task === 'image-to-text' && (
          <div style={{ maxWidth: '900px', margin: '0 auto 12px' }}>
            {uploadedImage ? (
              <div style={{
                position: 'relative',
                border: '2px solid #10b981',
                borderRadius: '12px',
                padding: '12px',
                background: '#d1fae5'
              }}>
                <img 
                  src={uploadedImage} 
                  alt="Uploaded" 
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    display: 'block'
                  }}
                />
                <button
                  onClick={() => setUploadedImage(null)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed #667eea' : '2px dashed #d1d5db',
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? '#ede9fe' : '#f9fafb',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
                <div style={{ fontSize: '15px', color: '#374151', marginBottom: '4px' }}>
                  <strong>Drop an image here or click to upload</strong>
                </div>
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                  Supports JPG, PNG, GIF (max 5MB)
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', maxWidth: '900px', margin: '0 auto' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={loading ? "Waiting for response..." : (models.find(m => m.id === selectedModel)?.task === 'image-to-text' ? "Ask about the image..." : "Type your message... (Shift+Enter for new line)")}
            disabled={loading}
            rows={3}
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              fontSize: '15px',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="button button-primary"
            style={{
              padding: '14px 32px',
              fontSize: '15px',
              minWidth: '100px',
              opacity: (!input.trim() || loading) ? 0.5 : 1,
              cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳' : '📤'} Send
          </button>
        </div>
      </div>
    </div>
  );
}
