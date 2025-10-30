import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Package, Search, Edit2, RefreshCw, BarChart3, CheckCircle, XCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ModelPricing {
  id: number;
  model_id: string;
  model_name: string;
  provider: string;
  tier: string;
  credits_per_1k_input: number;
  credits_per_1k_output: number;
  is_active: boolean;
  provider_cost_input?: number;
  provider_cost_output?: number;
  profit_margin_input?: number;
  profit_margin_output?: number;
}

interface PricingStats {
  total_models: number;
  active_models: number;
  inactive_models: number;
  average_profit_margin: number;
  total_pricing_records: number;
}

export default function AdminPricingPanel() {
  const [pricingList, setPricingList] = useState<ModelPricing[]>([]);
  const [stats, setStats] = useState<PricingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelPricing | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    credits_per_1k_input: '',
    credits_per_1k_output: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, [activeOnly, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/api/admin/pricing/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      
      // Fetch pricing list
      const params = new URLSearchParams();
      if (activeOnly) params.append('active_only', 'true');
      if (searchTerm) params.append('search', searchTerm);
      
      const pricingRes = await fetch(`${API_BASE}/api/admin/pricing/models?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (pricingRes.ok) {
        setPricingList(await pricingRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (model: ModelPricing) => {
    setEditingModel(model);
    setEditForm({
      credits_per_1k_input: model.credits_per_1k_input.toString(),
      credits_per_1k_output: model.credits_per_1k_output.toString(),
      is_active: model.is_active
    });
  };

  const handleUpdate = async () => {
    if (!editingModel) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/pricing/models/${editingModel.model_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          credits_per_1k_input: parseFloat(editForm.credits_per_1k_input),
          credits_per_1k_output: parseFloat(editForm.credits_per_1k_output),
          is_active: editForm.is_active
        })
      });
      
      if (response.ok) {
        alert('Pricing updated successfully!');
        setEditingModel(null);
        fetchData();
      } else {
        const error = await response.json();
        alert(`Failed to update: ${error.detail}`);
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update pricing');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading pricing data...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <DollarSign size={32} color="#f59e0b" />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Model Pricing Management</h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Manage platform pricing for all AI models
        </p>
      </div>

      {/* Stats */}
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
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Package size={24} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Models</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total_models}</div>
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
                <CheckCircle size={24} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Active Models</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                  {stats.active_models}
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
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <XCircle size={24} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Inactive Models</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444" }}>
                  {stats.inactive_models}
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
                <TrendingUp size={24} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Avg Profit Margin</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {stats.average_profit_margin.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 42px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          Active Only
        </label>
        <button
          onClick={fetchData}
          style={{
            padding: '10px 16px',
            background: '#3b82f6',
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

      {/* Pricing Table */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Model</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Provider</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Input (Credits/1K)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Output (Credits/1K)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Profit Margin</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pricingList.map((pricing, index) => (
                <tr key={pricing.id} style={{ borderBottom: '1px solid #e5e7eb', background: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{pricing.model_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{pricing.model_id}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{pricing.provider}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                    {pricing.credits_per_1k_input.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                    {pricing.credits_per_1k_output.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: '#10b981' }}>
                    {pricing.profit_margin_input && pricing.profit_margin_output 
                      ? `~${Math.round((pricing.profit_margin_input + pricing.profit_margin_output) / 2)}%`
                      : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: pricing.is_active ? '#dcfce7' : '#fee2e2',
                      color: pricing.is_active ? '#166534' : '#991b1b'
                    }}>
                      {pricing.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(pricing)}
                      style={{
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingModel && (
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
          onClick={() => setEditingModel(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold' }}>
              Edit Pricing
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6b7280' }}>
              {editingModel.model_name}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Input Price (Credits per 1K tokens)
                </label>
                <input
                  type="number"
                  value={editForm.credits_per_1k_input}
                  onChange={(e) => setEditForm({...editForm, credits_per_1k_input: e.target.value})}
                  step="0.01"
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
                  Output Price (Credits per 1K tokens)
                </label>
                <input
                  type="number"
                  value={editForm.credits_per_1k_output}
                  onChange={(e) => setEditForm({...editForm, credits_per_1k_output: e.target.value})}
                  step="0.01"
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Active
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setEditingModel(null)}
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
                onClick={handleUpdate}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Update Pricing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

