import { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ResourceListing {
  id: string;
  user_id: string;
  seller_username: string;
  model_id: string;
  model_name: string;
  provider: string;
  price_per_1m_tokens: number;
  official_price?: number;
  discount_percentage?: number;
  total_quota: number;
  available_quota: number;
  min_purchase: number;
  title: string;
  description?: string;
  status: string;
  total_sales: number;
  total_orders: number;
  success_rate: number;
  rating: number;
  review_count: number;
  created_at: string;
}

export default function MyResourcesPanel() {
  const [listings, setListings] = useState<ResourceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingListing, setEditingListing] = useState<ResourceListing | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    model_id: '',
    model_name: '',
    provider: '',
    price_per_1m_tokens: '',
    official_price: '',
    total_quota: '',
    min_purchase: '1.0',
    title: '',
    description: ''
  });

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/marketplace/my-listings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setListings(data);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Validate required fields
      if (!formData.model_id || !formData.model_name || !formData.provider || 
          !formData.price_per_1m_tokens || !formData.total_quota || !formData.title) {
        alert('Please fill in all required fields');
        return;
      }
      
      console.log('Creating listing with data:', formData);
      
      const response = await fetch(`${API_BASE}/api/marketplace/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model_id: formData.model_id,
          model_name: formData.model_name,
          provider: formData.provider,
          price_per_1m_tokens: parseFloat(formData.price_per_1m_tokens),
          official_price: formData.official_price ? parseFloat(formData.official_price) : null,
          total_quota: parseFloat(formData.total_quota),
          min_purchase: parseFloat(formData.min_purchase),
          title: formData.title,
          description: formData.description || null
        })
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        alert('Resource listed successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchMyListings();
      } else {
        let errorMessage = 'Unknown error';
        try {
          const error = await response.json();
          errorMessage = error.detail || JSON.stringify(error);
        } catch (e) {
          const text = await response.text();
          errorMessage = text || `HTTP ${response.status}`;
        }
        console.error('Server error:', errorMessage);
        alert(`Failed to create listing: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Create listing error:', error);
      alert(`Failed to create listing: ${error instanceof Error ? error.message : 'Network error. Please check your connection.'}`);
    }
  };

  const handleUpdateListing = async () => {
    if (!editingListing) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/marketplace/listings/${editingListing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_per_1m_tokens: formData.price_per_1m_tokens ? parseFloat(formData.price_per_1m_tokens) : undefined,
          title: formData.title || undefined,
          description: formData.description || undefined,
          status: formData.model_id || undefined  // Using model_id field for status temporarily
        })
      });
      
      if (response.ok) {
        alert('Listing updated successfully!');
        setEditingListing(null);
        resetForm();
        fetchMyListings();
      } else {
        const error = await response.json();
        alert(`Failed to update listing: ${error.detail}`);
      }
    } catch (error) {
      console.error('Update listing error:', error);
      alert('Failed to update listing. Please try again.');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        alert('Listing deleted successfully!');
        fetchMyListings();
      } else {
        const error = await response.json();
        alert(`Failed to delete listing: ${error.detail}`);
      }
    } catch (error) {
      console.error('Delete listing error:', error);
      alert('Failed to delete listing. Please try again.');
    }
  };

  const handleToggleStatus = async (listing: ResourceListing) => {
    const newStatus = listing.status === 'active' ? 'paused' : 'active';
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/marketplace/listings/${listing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        fetchMyListings();
      }
    } catch (error) {
      console.error('Toggle status error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      model_id: '',
      model_name: '',
      provider: '',
      price_per_1m_tokens: '',
      official_price: '',
      total_quota: '',
      min_purchase: '1.0',
      title: '',
      description: ''
    });
  };

  const openEditModal = (listing: ResourceListing) => {
    setEditingListing(listing);
    setFormData({
      model_id: listing.model_id,
      model_name: listing.model_name,
      provider: listing.provider,
      price_per_1m_tokens: listing.price_per_1m_tokens.toString(),
      official_price: listing.official_price?.toString() || '',
      total_quota: listing.total_quota.toString(),
      min_purchase: listing.min_purchase.toString(),
      title: listing.title,
      description: listing.description || ''
    });
  };

  const totalRevenue = listings.reduce((sum, l) => sum + l.total_sales * 0.85, 0);
  const totalOrders = listings.reduce((sum, l) => sum + l.total_orders, 0);
  const activeListings = listings.filter(l => l.status === 'active').length;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Package size={32} color="#3b82f6" />
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>My Resources</h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Manage your API resource listings</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '12px 20px',
            background: '#3b82f6',
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
          <Plus size={20} />
          List New Resource
        </button>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Total Revenue (85%)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{totalRevenue.toFixed(2)} Credits</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Total Orders</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{totalOrders}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Active Listings</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6' }}>{activeListings}</div>
        </div>
      </div>

      {/* Listings */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Loading your listings...
        </div>
      ) : listings.length === 0 ? (
        <div style={{ 
          background: 'white', 
          padding: '60px 20px', 
          borderRadius: '12px', 
          border: '2px dashed #d1d5db',
          textAlign: 'center'
        }}>
          <Package size={64} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#9ca3af' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1f2937' }}>No resources listed yet</h3>
          <p style={{ color: '#6b7280', margin: '0 0 20px 0' }}>Start earning by listing your unused API resources</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            List Your First Resource
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {listings.map(listing => (
            <div
              key={listing.id}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px',
                opacity: listing.status === 'active' ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                {/* Left: Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{listing.title}</h3>
                    <span style={{
                      padding: '4px 8px',
                      background: listing.status === 'active' ? '#dcfce7' : '#fef3c7',
                      color: listing.status === 'active' ? '#166534' : '#92400e',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {listing.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    {listing.model_name} • {listing.provider}
                  </div>
                  {listing.description && (
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px 0' }}>
                      {listing.description}
                    </p>
                  )}
                  
                  {/* Stats Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '16px',
                    marginTop: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Price</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {listing.price_per_1m_tokens.toFixed(2)}/1M
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Available</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        {listing.available_quota.toFixed(2)} Credits
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Sales</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                        {listing.total_sales.toFixed(2)} Credits
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Orders</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        {listing.total_orders}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Rating</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        ⭐ {listing.rating.toFixed(1)} ({listing.review_count})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '120px' }}>
                  <button
                    onClick={() => handleToggleStatus(listing)}
                    style={{
                      padding: '8px 12px',
                      background: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {listing.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                    {listing.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEditModal(listing)}
                    style={{
                      padding: '8px 12px',
                      background: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteListing(listing.id)}
                    style={{
                      padding: '8px 12px',
                      background: 'white',
                      border: '1px solid #fca5a5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      color: '#dc2626'
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingListing) && (
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
            setShowCreateModal(false);
            setEditingListing(null);
            resetForm();
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
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>
              {editingListing ? 'Edit Listing' : 'List New Resource'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Only show these fields when creating */}
              {!editingListing && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                      Model ID
                    </label>
                    <input
                      type="text"
                      value={formData.model_id}
                      onChange={(e) => setFormData({...formData, model_id: e.target.value})}
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
                      Model Name
                    </label>
                    <input
                      type="text"
                      value={formData.model_name}
                      onChange={(e) => setFormData({...formData, model_name: e.target.value})}
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
                      Provider
                    </label>
                    <input
                      type="text"
                      value={formData.provider}
                      onChange={(e) => setFormData({...formData, provider: e.target.value})}
                      placeholder="Meta"
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
                      Total Quota (Credits)
                    </label>
                    <input
                      type="number"
                      value={formData.total_quota}
                      onChange={(e) => setFormData({...formData, total_quota: e.target.value})}
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
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Fast & Reliable Llama 3.1 Access"
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
                  Price per 1M tokens (Credits)
                </label>
                <input
                  type="number"
                  value={formData.price_per_1m_tokens}
                  onChange={(e) => setFormData({...formData, price_per_1m_tokens: e.target.value})}
                  placeholder="5.00"
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
                  Official Price (optional, for discount calculation)
                </label>
                <input
                  type="number"
                  value={formData.official_price}
                  onChange={(e) => setFormData({...formData, official_price: e.target.value})}
                  placeholder="10.00"
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
                  Minimum Purchase (Credits)
                </label>
                <input
                  type="number"
                  value={formData.min_purchase}
                  onChange={(e) => setFormData({...formData, min_purchase: e.target.value})}
                  placeholder="1.00"
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
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your resource..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingListing(null);
                  resetForm();
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
                onClick={editingListing ? handleUpdateListing : handleCreateListing}
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
                {editingListing ? 'Update' : 'Create'} Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

