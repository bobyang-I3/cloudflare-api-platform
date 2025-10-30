import { useState, useEffect } from 'react';
import { Receipt, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Transaction {
  id: string;
  type: 'purchase' | 'sale';
  listing_title: string;
  model_name: string;
  buyer_username: string;
  seller_username: string;
  amount: number;
  tokens_purchased: number;
  tokens_used: number;
  tokens_remaining: number;
  status: string;
  created_at: string;
  seller_revenue?: number;
}

export default function ResourceTransactionsPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'purchases' | 'sales'>('all');
  
  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/marketplace/transactions?transaction_type=${filter}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color="#10b981" />;
      case 'pending':
        return <Clock size={16} color="#f59e0b" />;
      case 'failed':
        return <XCircle size={16} color="#ef4444" />;
      default:
        return <Clock size={16} color="#9ca3af" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: '#dcfce7', text: '#166534' };
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'failed':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  // Calculate stats
  const totalPurchases = transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
  const totalSales = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + (t.seller_revenue || 0), 0);
  const purchaseCount = transactions.filter(t => t.type === 'purchase').length;
  const saleCount = transactions.filter(t => t.type === 'sale').length;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Receipt size={32} color="#3b82f6" />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Transaction History</h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>View your purchase and sale history</p>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Total Purchased</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>-${totalPurchases.toFixed(2)}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>{purchaseCount} transactions</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Total Revenue</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>+${totalSales.toFixed(2)}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>{saleCount} transactions</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Net Balance</div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: (totalSales - totalPurchases) >= 0 ? '#10b981' : '#ef4444' 
          }}>
            {(totalSales - totalPurchases) >= 0 ? '+' : ''}${(totalSales - totalPurchases).toFixed(2)}
          </div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>from marketplace</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '20px',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '12px'
      }}>
        {(['all', 'purchases', 'sales'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '8px 16px',
              background: filter === tab ? '#eff6ff' : 'transparent',
              color: filter === tab ? '#3b82f6' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Loading transactions...
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ 
          background: 'white', 
          padding: '60px 20px', 
          borderRadius: '12px', 
          border: '2px dashed #d1d5db',
          textAlign: 'center'
        }}>
          <Receipt size={64} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#9ca3af' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1f2937' }}>No transactions yet</h3>
          <p style={{ color: '#6b7280', margin: 0 }}>
            {filter === 'purchases' ? 'You haven\'t made any purchases' : 
             filter === 'sales' ? 'You haven\'t made any sales' : 
             'No transaction history found'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {transactions.map(txn => {
            const statusColor = getStatusColor(txn.status);
            
            return (
              <div
                key={txn.id}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '20px',
                  transition: 'box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                  {/* Left: Transaction Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      {/* Type Icon */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: txn.type === 'purchase' ? '#fee2e2' : '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {txn.type === 'purchase' ? 
                          <ArrowUpRight size={20} color="#ef4444" /> :
                          <ArrowDownLeft size={20} color="#10b981" />
                        }
                      </div>

                      {/* Title and Model */}
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold' }}>
                          {txn.listing_title}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {txn.model_name} • {txn.type === 'purchase' ? 'from' : 'to'} @
                          {txn.type === 'purchase' ? txn.seller_username : txn.buyer_username}
                        </div>
                      </div>
                    </div>

                    {/* Token Info */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '24px', 
                      marginTop: '12px',
                      fontSize: '13px',
                      color: '#6b7280'
                    }}>
                      <div>
                        <span style={{ fontWeight: '500' }}>Tokens:</span> {txn.tokens_purchased.toLocaleString()}
                      </div>
                      <div>
                        <span style={{ fontWeight: '500' }}>Used:</span> {txn.tokens_used.toLocaleString()}
                      </div>
                      <div>
                        <span style={{ fontWeight: '500' }}>Remaining:</span> {txn.tokens_remaining.toLocaleString()}
                      </div>
                    </div>

                    {/* Progress Bar (only for purchases) */}
                    {txn.type === 'purchase' && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ 
                          height: '6px', 
                          background: '#e5e7eb', 
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${(txn.tokens_used / txn.tokens_purchased) * 100}%`,
                            background: '#3b82f6',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Amount and Status */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-end',
                    gap: '8px'
                  }}>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: 'bold',
                      color: txn.type === 'purchase' ? '#ef4444' : '#10b981'
                    }}>
                      {txn.type === 'purchase' ? '-' : '+'}$
                      {txn.type === 'purchase' ? txn.amount.toFixed(2) : (txn.seller_revenue || 0).toFixed(2)}
                    </div>
                    
                    <div style={{
                      padding: '4px 10px',
                      background: statusColor.bg,
                      color: statusColor.text,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {getStatusIcon(txn.status)}
                      {txn.status.toUpperCase()}
                    </div>

                    <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>
                      {new Date(txn.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>

                    {txn.type === 'purchase' && txn.amount > 0 && (
                      <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>
                        ${(txn.amount / txn.tokens_purchased * 1_000_000).toFixed(2)}/1M tokens
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

