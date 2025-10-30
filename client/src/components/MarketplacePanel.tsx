import { useState, useEffect } from 'react';
import { Store, Search, TrendingDown, Star, ShoppingCart, Package } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface MarketplaceListing {
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

interface MarketplaceStats {
  total_listings: number;
  total_sellers: number;
  total_transactions: number;
  total_volume: number;
  avg_discount: number;
  active_models: number;
}

export default function MarketplacePanel() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [providerFilter, setProviderFilter] = useState('');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchListings();
  }, [sortBy, providerFilter]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/marketplace/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/api/marketplace/listings?sort_by=${sortBy}`;
      if (providerFilter) {
        url += `&provider=${encodeURIComponent(providerFilter)}`;
      }
      
      const response = await fetch(url, {
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

  const handlePurchase = async () => {
    if (!selectedListing || !purchaseAmount) return;
    
    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount < selectedListing.min_purchase) {
      alert(`Minimum purchase is ${selectedListing.min_purchase} Credits`);
      return;
    }
    
    if (amount > selectedListing.available_quota) {
      alert('Insufficient quota available');
      return;
    }
    
    setIsPurchasing(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/marketplace/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listing_id: selectedListing.id,
          amount: amount
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Purchase successful! You received ${data.tokens_purchased.toLocaleString()} tokens.`);
        setSelectedListing(null);
        setPurchaseAmount('');
        fetchListings();
        fetchStats();
      } else {
        const error = await response.json();
        alert(`Purchase failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const filteredListings = listings.filter(listing =>
    listing.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const providers = Array.from(new Set(listings.map(l => l.provider)));

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Store size={32} color="#3b82f6" />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>API Resource Marketplace</h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Buy and sell API resources from the community</p>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Active Listings</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{stats.total_listings}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Volume</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.total_volume.toFixed(2)} Credits</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Avg Discount</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.avg_discount.toFixed(1)}%</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Active Models</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.active_models}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search models, titles, providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Provider Filter */}
          <div style={{ flex: '0 0 180px' }}>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="">All Providers</option>
              {providers.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div style={{ flex: '0 0 180px' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="sales">Most Popular</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Loading marketplace...
        </div>
      ) : filteredListings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Package size={48} style={{ margin: '0 auto 12px', opacity: 0.5, color: '#9ca3af' }} />
          <p style={{ color: '#6b7280' }}>No listings found</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {filteredListings.map(listing => (
            <div
              key={listing.id}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px',
                transition: 'all 0.2s',
                cursor: 'pointer',
                boxShadow: selectedListing?.id === listing.id ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
                borderColor: selectedListing?.id === listing.id ? '#3b82f6' : '#e5e7eb'
              }}
              onClick={() => setSelectedListing(listing)}
            >
              {/* Header */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold' }}>{listing.title}</h3>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {listing.model_name} • {listing.provider}
                    </div>
                  </div>
                  {listing.discount_percentage && listing.discount_percentage > 0 && (
                    <div style={{
                      background: '#dcfce7',
                      color: '#166534',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <TrendingDown size={14} />
                      {listing.discount_percentage.toFixed(0)}% OFF
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  by @{listing.seller_username}
                </div>
              </div>

              {/* Price */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {listing.price_per_1m_tokens.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Credits / 1M tokens</span>
                </div>
                {listing.official_price && (
                  <div style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through' }}>
                    Official: {listing.official_price.toFixed(2)} Credits
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', 
                gap: '8px', 
                marginBottom: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #f3f4f6'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Rating</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={14} fill="#fbbf24" color="#fbbf24" />
                    {listing.rating.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Orders</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{listing.total_orders}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Success</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{listing.success_rate.toFixed(0)}%</div>
                </div>
              </div>

              {/* Availability */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Available: {listing.available_quota.toFixed(2)} / {listing.total_quota.toFixed(2)} Credits
                </div>
                <div style={{ 
                  height: '4px', 
                  background: '#e5e7eb', 
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(listing.available_quota / listing.total_quota) * 100}%`,
                    background: listing.available_quota / listing.total_quota > 0.5 ? '#10b981' : '#f59e0b',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>

              {/* Description */}
              {listing.description && (
                <p style={{ 
                  fontSize: '13px', 
                  color: '#6b7280', 
                  margin: '0 0 12px 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {listing.description}
                </p>
              )}

              {/* Min Purchase */}
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                Min purchase: {listing.min_purchase.toFixed(2)} Credits
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Modal */}
      {selectedListing && (
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
            if (!isPurchasing) {
              setSelectedListing(null);
              setPurchaseAmount('');
            }
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' }}>
              Purchase Resource
            </h2>

            {/* Listing Info */}
            <div style={{ 
              background: '#f9fafb', 
              padding: '16px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                {selectedListing.title}
              </h3>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                {selectedListing.model_name} • {selectedListing.provider}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Seller: @{selectedListing.seller_username}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6', marginTop: '12px' }}>
                {selectedListing.price_per_1m_tokens.toFixed(2)} Credits / 1M tokens
              </div>
            </div>

            {/* Purchase Amount */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Purchase Amount (Credits)
              </label>
              <input
                type="number"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                min={selectedListing.min_purchase}
                max={selectedListing.available_quota}
                step="0.01"
                placeholder={`Min: ${selectedListing.min_purchase} Credits`}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                disabled={isPurchasing}
              />
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Available: {selectedListing.available_quota.toFixed(2)} Credits
              </div>
            </div>

            {/* Token Estimate */}
            {purchaseAmount && !isNaN(parseFloat(purchaseAmount)) && (
              <div style={{ 
                background: '#eff6ff', 
                padding: '12px', 
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '500' }}>
                  You will receive approximately:
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', marginTop: '4px' }}>
                  {Math.floor((parseFloat(purchaseAmount) / selectedListing.price_per_1m_tokens) * 1_000_000).toLocaleString()} tokens
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (!isPurchasing) {
                    setSelectedListing(null);
                    setPurchaseAmount('');
                  }
                }}
                disabled={isPurchasing}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isPurchasing ? 'not-allowed' : 'pointer',
                  opacity: isPurchasing ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={isPurchasing || !purchaseAmount}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isPurchasing || !purchaseAmount ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isPurchasing || !purchaseAmount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <ShoppingCart size={16} />
                {isPurchasing ? 'Processing...' : 'Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

