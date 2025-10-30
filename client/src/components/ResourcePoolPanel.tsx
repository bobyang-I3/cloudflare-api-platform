import { useState, useEffect } from 'react';
import { Database, TrendingUp, Shield, Activity } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface PoolStats {
  total_resources: number;
  total_deposited: number;
  total_usage: number;
  platform_revenue: number;
  active_providers: number;
}

interface MyContribution {
  resource_id: string;
  model_id: string;
  model_name: string;
  status: string;
  initial_deposit: number;
  current_balance: number;
  total_usage: number;
  total_earned: number;
  deposited_at: string;
}

export default function ResourcePoolPanel() {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [myContributions, setMyContributions] = useState<MyContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // Deposit form state
  const [depositForm, setDepositForm] = useState({
    model_id: '',
    model_name: '',
    provider: '',
    api_key: '',
    quota_credits: '',
    base_url: ''
  });

  useEffect(() => {
    fetchPoolData();
  }, []);

  const fetchPoolData = async () => {
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
      
      // Fetch my contributions
      const myRes = await fetch(`${API_BASE}/api/resource-pool/my-contributions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (myRes.ok) {
        setMyContributions(await myRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch pool data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Validate required fields
      if (!depositForm.model_id || !depositForm.model_name || !depositForm.provider || 
          !depositForm.api_key || !depositForm.quota_credits) {
        alert('Please fill in all required fields');
        return;
      }
      
      // Validate Base URL for "Other" provider
      if (depositForm.provider === 'Other' && !depositForm.base_url) {
        alert('Base URL is required for custom providers. Please provide the API endpoint URL.');
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/resource-pool/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model_id: depositForm.model_id,
          model_name: depositForm.model_name,
          provider: depositForm.provider,
          api_key: depositForm.api_key,
          quota_credits: parseFloat(depositForm.quota_credits),
          base_url: depositForm.base_url || null
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Successfully deposited! You received ${result.credits_to_receive.toFixed(2)} Credits (initial 10% release after verification)`);
        setShowDepositModal(false);
        resetDepositForm();
        fetchPoolData();
      } else {
        const error = await response.json();
        alert(`Failed to deposit: ${error.detail}`);
      }
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Failed to deposit resource. Please try again.');
    }
  };

  const resetDepositForm = () => {
    setDepositForm({
      model_id: '',
      model_name: '',
      provider: '',
      api_key: '',
      quota_credits: '',
      base_url: ''
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading Resource Pool...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Database size={32} color="#8b5cf6" />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Resource Pool</h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
          Deposit your API resources into the shared pool and earn Credits when others use them
        </p>
        <button
          onClick={() => setShowDepositModal(true)}
          style={{
            padding: '12px 24px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Database size={20} />
          Deposit Resource
        </button>
      </div>

      {/* Pool Stats */}
      {stats && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Pool Overview</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                <Shield size={24} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Active Providers</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {stats.active_providers}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Contributions */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>My Contributions</h2>
        {myContributions.length === 0 ? (
          <div style={{ 
            background: 'white', 
            padding: '60px 20px', 
            borderRadius: '12px', 
            border: '2px dashed #d1d5db',
            textAlign: 'center'
          }}>
            <Database size={64} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#9ca3af' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1f2937' }}>No contributions yet</h3>
            <p style={{ color: '#6b7280', margin: '0 0 20px 0' }}>
              Deposit your API resources and start earning Credits passively
            </p>
            <button
              onClick={() => setShowDepositModal(true)}
              style={{
                padding: '12px 24px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Make Your First Deposit
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {myContributions.map(contrib => (
              <div
                key={contrib.resource_id}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                        {contrib.model_name}
                      </h3>
                      <span style={{
                        padding: '4px 8px',
                        background: contrib.status === 'active' ? '#dcfce7' : '#fef3c7',
                        color: contrib.status === 'active' ? '#166534' : '#92400e',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {contrib.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                      {contrib.model_id}
                    </div>
                    
                    {/* Stats Grid */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '16px'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Initial Deposit</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }}>
                          {contrib.initial_deposit.toFixed(2)} Credits
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Current Balance</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          {contrib.current_balance.toFixed(2)} Credits
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Total Usage</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>
                          {contrib.total_usage.toFixed(2)} Credits
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Total Earned</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                          {contrib.total_earned.toFixed(2)} Credits
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            setShowDepositModal(false);
            resetDepositForm();
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold' }}>
              Deposit API Resource
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6b7280' }}>
              Deposit your API key into the pool. You'll receive 90% of the quota value in Credits immediately (10% platform fee).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Model ID *
                </label>
                <input
                  type="text"
                  value={depositForm.model_id}
                  onChange={(e) => setDepositForm({...depositForm, model_id: e.target.value})}
                  placeholder="@cf/meta/llama-3.1-8b-instruct"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Model Name *
                </label>
                <input
                  type="text"
                  value={depositForm.model_name}
                  onChange={(e) => setDepositForm({...depositForm, model_name: e.target.value})}
                  placeholder="Llama 3.1 8B Instruct"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Provider *
                </label>
                <select
                  value={depositForm.provider}
                  onChange={(e) => setDepositForm({...depositForm, provider: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select a provider...</option>
                  <option value="OpenAI">OpenAI (GPT models)</option>
                  <option value="Anthropic">Anthropic (Claude models)</option>
                  <option value="Cloudflare">Cloudflare</option>
                  <option value="Other">Other (requires Base URL)</option>
                </select>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {depositForm.provider === 'Other' && '⚠️ For custom providers, you must provide a Base URL below'}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  API Key *
                </label>
                <input
                  type="password"
                  value={depositForm.api_key}
                  onChange={(e) => setDepositForm({...depositForm, api_key: e.target.value})}
                  placeholder="Your API key (encrypted and secure)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  🔒 Your API key will be encrypted and securely stored
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Quota Value (Credits) *
                </label>
                <input
                  type="number"
                  value={depositForm.quota_credits}
                  onChange={(e) => setDepositForm({...depositForm, quota_credits: e.target.value})}
                  placeholder="100.00"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  You'll receive {depositForm.quota_credits ? (parseFloat(depositForm.quota_credits) * 0.9).toFixed(2) : '0.00'} Credits (90% after fee)
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Base URL {depositForm.provider === 'Other' ? '*' : '(optional)'}
                </label>
                <input
                  type="text"
                  value={depositForm.base_url}
                  onChange={(e) => setDepositForm({...depositForm, base_url: e.target.value})}
                  placeholder={depositForm.provider === 'Other' ? 'https://your-api.com/v1' : 'https://api.openai.com/v1'}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${depositForm.provider === 'Other' && !depositForm.base_url ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  resetDepositForm();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Deposit Resource
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

