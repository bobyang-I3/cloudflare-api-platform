import React, { useState } from 'react';
import { User, authApi } from '../api';

interface ApiKeyPanelProps {
  user: User;
  token: string;
}

export default function ApiKeyPanel({ user, token }: ApiKeyPanelProps) {
  const [currentUser, setCurrentUser] = useState(user);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentUser.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshKey = async () => {
    if (!confirm('Are you sure you want to generate a new API key? The old key will stop working.')) {
      return;
    }

    setRefreshing(true);
    try {
      const updatedUser = await authApi.refreshApiKey(token);
      setCurrentUser(updatedUser);
    } catch (error) {
      alert('Failed to refresh API key');
    } finally {
      setRefreshing(false);
    }
  };

  const maskedKey = currentUser.api_key.slice(0, 8) + '••••••••••••••••' + currentUser.api_key.slice(-4);

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          API Key Management
        </h2>

        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Your API Key
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <code style={{
                flex: 1,
                padding: '12px',
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {showKey ? currentUser.api_key : maskedKey}
              </code>
              <button
                onClick={() => setShowKey(!showKey)}
                className="button button-secondary"
                style={{ padding: '12px 16px' }}
              >
                {showKey ? '👁️' : '👁️‍🗨️'}
              </button>
              <button
                onClick={copyToClipboard}
                className="button button-primary"
                style={{ padding: '12px 16px' }}
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
          </div>

          <button
            onClick={handleRefreshKey}
            disabled={refreshing}
            className="button button-secondary"
          >
            {refreshing ? 'Generating...' : '🔄 Generate New Key'}
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            How to use your API key
          </h3>
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <p style={{ marginBottom: '12px' }}>
              Include your API key in the <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px' }}>X-API-Key</code> header when making requests:
            </p>
            <pre style={{
              background: '#1f2937',
              color: '#f9fafb',
              padding: '16px',
              borderRadius: '6px',
              overflow: 'auto',
              fontSize: '13px'
            }}>
{`curl -X POST http://localhost:8000/api/ai/chat \\
  -H "X-API-Key: ${showKey ? currentUser.api_key : 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "@cf/meta/llama-3.1-8b-instruct"
  }'`}
            </pre>
          </div>
        </div>

        <div style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>⚠️ Important</div>
          <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.6' }}>
            <li>Keep your API key secret</li>
            <li>Don't share it or commit it to version control</li>
            <li>Refresh it immediately if you suspect it's been compromised</li>
            <li>Old keys stop working after generating a new one</li>
          </ul>
        </div>
      </div>

      {/* Account Info */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Account Information
        </h3>
        <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Username:</span>
            <span style={{ fontWeight: '500' }}>{currentUser.username}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Email:</span>
            <span style={{ fontWeight: '500' }}>{currentUser.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Account Status:</span>
            <span style={{
              fontWeight: '500',
              color: currentUser.is_active ? '#10b981' : '#ef4444'
            }}>
              {currentUser.is_active ? '✓ Active' : '✗ Inactive'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Member Since:</span>
            <span style={{ fontWeight: '500' }}>
              {new Date(currentUser.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

