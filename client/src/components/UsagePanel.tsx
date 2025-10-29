import { useState, useEffect } from 'react';
import { usageApi, UsageStats, UsageLog } from '../api';
import UsageCharts from './UsageCharts';
import { BarChart3, Table } from 'lucide-react';

interface UsagePanelProps {
  token: string;
}

type UsageTab = 'stats' | 'charts';

export default function UsagePanel({ token }: UsagePanelProps) {
  const [activeTab, setActiveTab] = useState<UsageTab>('charts');
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, logsData] = await Promise.all([
        usageApi.getStats(token, days),
        usageApi.getLogs(token, 50, 0)
      ]);
      setStats(statsData);
      setLogs(logsData);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Tabs */}
      <div style={{ marginBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('charts')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'charts' ? '#667eea' : 'transparent',
              color: activeTab === 'charts' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px',
              borderBottom: activeTab === 'charts' ? '2px solid #667eea' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <BarChart3 size={18} />
            Charts
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'stats' ? '#667eea' : 'transparent',
              color: activeTab === 'stats' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px',
              borderBottom: activeTab === 'stats' ? '2px solid #667eea' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Table size={18} />
            Table View
          </button>
        </div>
      </div>

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <UsageCharts token={token} />
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#6b7280' }}>Loading usage data...</p>
        </div>
      )}

      {activeTab === 'stats' && !loading && (
        <div>
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Total Requests
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
            {stats?.total_requests.toLocaleString() || 0}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Total Tokens
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea' }}>
            {stats?.total_tokens.toLocaleString() || 0}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Input Tokens
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
            {stats?.total_input_tokens.toLocaleString() || 0}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Output Tokens
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
            {stats?.total_output_tokens.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Time Range
        </label>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Usage by Task Type */}
      {stats && Object.keys(stats.by_task).length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Usage by Task Type
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(stats.by_task)
              .sort(([, a], [, b]) => b.requests - a.requests)
              .map(([task, data]) => {
                const taskEmoji: Record<string, string> = {
                  'text-generation': '💬',
                  'text-to-image': '🎨',
                  'automatic-speech-recognition': '🎤',
                  'text-to-speech': '🔊',
                  'text-embeddings': '🔢',
                  'translation': '🌐',
                  'summarization': '📝',
                  'image-to-text': '🖼️'
                };
                return (
                  <div key={task}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      fontSize: '14px'
                    }}>
                      <span style={{ fontWeight: '500', color: '#374151' }}>
                        {taskEmoji[task] || '📊'} {task.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <span style={{ color: '#6b7280' }}>
                        {data.requests} requests · {data.tokens.toLocaleString()} tokens
                      </span>
                    </div>
                    <div style={{
                      height: '8px',
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: '#10b981',
                        width: `${stats.total_requests > 0 ? (data.requests / stats.total_requests) * 100 : 0}%`,
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Usage by Model */}
      {stats && Object.keys(stats.by_model).length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Usage by Model
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(stats.by_model)
              .sort(([, a], [, b]) => b.tokens - a.tokens)
              .map(([model, data]) => (
              <div key={model}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '14px'
                }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>
                    {model.split('/').pop()}
                  </span>
                  <span style={{ color: '#6b7280' }}>
                    {data.requests} requests · {data.tokens.toLocaleString()} tokens
                  </span>
                </div>
                <div style={{
                  height: '8px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    background: '#667eea',
                    width: `${stats.total_tokens > 0 ? (data.tokens / stats.total_tokens) * 100 : 0}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      <div className="card">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Recent Activity
        </h3>
        {logs.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
            No activity yet
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', fontWeight: '600', color: '#6b7280' }}>Time</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', color: '#6b7280' }}>Model</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', color: '#6b7280', textAlign: 'right' }}>
                    Tokens
                  </th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', color: '#6b7280', textAlign: 'right' }}>
                    Response Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 8px', color: '#374151' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#6b7280' }}>
                      {log.model_name.split('/').pop()}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#374151' }}>
                      <span style={{ fontWeight: '500' }}>{log.total_tokens}</span>
                      {' '}
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                        ({log.input_tokens}→{log.output_tokens})
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#6b7280' }}>
                      {log.response_time_ms.toFixed(0)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}

