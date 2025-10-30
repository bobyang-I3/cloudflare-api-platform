import { useState, useEffect } from 'react';
import { Database, TrendingUp, Activity, Users, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface PoolStats {
  total_resources: number;
  total_deposited: number;
  total_usage: number;
  platform_revenue: number;
  active_providers: number;
}

interface PoolResource {
  id: string;
  owner_id: string;
  provider: string;
  model_family: string;
  original_quota: number;
  current_quota: number;
  quota_unit: string;
  status: string;
  total_requests: number;
  successful_requests: number;
  success_rate: number;
  created_at: string;
}

interface UsageLog {
  id: string;
  user: string;
  resource_owner: string;
  provider: string;
  model: string;
  cost_amount: number;
  credits_charged: number;
  created_at: string;
}

export default function AdminResourcePoolPanel() {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [resources, setResources] = useState<PoolResource[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'resources' | 'logs'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch pool stats
      const statsRes = await fetch(`${API_BASE}/api/resource-pool/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      
      // Fetch all resources (admin)
      const resourcesRes = await fetch(`${API_BASE}/api/resource-pool/admin/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resourcesRes.ok) {
        setResources(await resourcesRes.json());
      }
      
      // Fetch usage logs (admin)
      const logsRes = await fetch(`${API_BASE}/api/resource-pool/admin/usage-logs?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (logsRes.ok) {
        setUsageLogs(await logsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch pool data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return { bg: '#dcfce7', color: '#166534' };
      case 'depleted':
        return { bg: '#fee2e2', color: '#991b1b' };
      case 'suspended':
        return { bg: '#fef3c7', color: '#92400e' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading Resource Pool data...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Database size={32} color="#8b5cf6" />
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Resource Pool Management</h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Monitor and manage the platform's shared API resource pool
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{
            padding: '10px 16px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '8px', 
                background: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Database size={24} color="#8b5cf6" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Resources</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total_resources}</div>
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '8px', 
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={24} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Deposited</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                  {stats.total_deposited.toFixed(0)} Credits
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '8px', 
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Activity size={24} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Usage</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                  {stats.total_usage.toFixed(0)} Credits
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '8px', 
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={24} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Active Providers</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {stats.active_providers}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '8px', 
                background: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={24} color="#8b5cf6" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Platform Revenue</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {stats.platform_revenue.toFixed(0)} Credits
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div style={{ marginBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'overview', label: 'Overview', icon: Database },
            { id: 'resources', label: 'Resources', icon: CheckCircle },
            { id: 'logs', label: 'Usage Logs', icon: Activity }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              style={{
                padding: '12px 20px',
                background: activeView === id ? '#8b5cf6' : 'transparent',
                color: activeView === id ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '-2px',
                borderBottom: activeView === id ? '2px solid #8b5cf6' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources List */}
      {activeView === 'resources' && (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Provider</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Model</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Original Quota</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Current Quota</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Success Rate</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource, index) => {
                  const statusStyle = getStatusColor(resource.status);
                  return (
                    <tr key={resource.id} style={{ borderBottom: '1px solid #e5e7eb', background: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{resource.provider}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{resource.model_family}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>
                        {resource.original_quota.toFixed(0)} {resource.quota_unit}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                        {resource.current_quota.toFixed(0)} {resource.quota_unit}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: resource.success_rate >= 95 ? '#10b981' : '#f59e0b' }}>
                        {resource.success_rate.toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: statusStyle.bg,
                          color: statusStyle.color
                        }}>
                          {resource.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Usage Logs */}
      {activeView === 'logs' && (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Resource Owner</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Provider</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Model</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Cost</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Charged</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.map((log, index) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb', background: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{log.user}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{log.resource_owner}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{log.provider}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{log.model}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>
                      {log.cost_amount.toFixed(2)} Credits
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: '#3b82f6' }}>
                      {log.credits_charged.toFixed(2)} Credits
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overview (default) */}
      {activeView === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Resource Status Summary */}
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Resource Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={20} color="#10b981" />
                  <span>Active Resources</span>
                </div>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                  {resources.filter(r => r.status.toLowerCase() === 'active').length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} color="#f59e0b" />
                  <span>Suspended Resources</span>
                </div>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {resources.filter(r => r.status.toLowerCase() === 'suspended').length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <XCircle size={20} color="#ef4444" />
                  <span>Depleted Resources</span>
                </div>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
                  {resources.filter(r => r.status.toLowerCase() === 'depleted').length}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {usageLogs.slice(0, 5).map(log => (
                <div key={log.id} style={{ fontSize: '14px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {log.user} used {log.model}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Charged {log.credits_charged.toFixed(2)} Credits • {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

