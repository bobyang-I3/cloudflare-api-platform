import { useState, useEffect } from 'react';
import { creditApi, CreditBalance, CreditTransaction, ModelPricing } from '../api';

interface CreditPanelProps {
  token: string;
  isAdmin: boolean;
}

export default function CreditPanel({ token }: CreditPanelProps) {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [pricing, setPricing] = useState<ModelPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transfer' | 'transactions' | 'pricing'>('overview');
  
  const [transferUsername, setTransferUsername] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balanceData, transactionsData, pricingData] = await Promise.all([
        creditApi.getBalance(token),
        creditApi.getTransactions(token, 20),
        creditApi.getPricing(),
      ]);
      setBalance(balanceData);
      setTransactions(transactionsData);
      setPricing(pricingData);
    } catch (error: any) {
      console.error('Failed to load credit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferUsername || !transferAmount || parseFloat(transferAmount) <= 0) {
      setTransferError('Please enter valid recipient and amount');
      return;
    }

    setTransferLoading(true);
    setTransferError('');
    setTransferSuccess(false);
    
    try {
      await creditApi.transfer(token, {
        to_username: transferUsername,
        amount: parseFloat(transferAmount),
        description: transferDescription || undefined,
      });
      
      setTransferUsername('');
      setTransferAmount('');
      setTransferDescription('');
      setTransferSuccess(true);
      await loadData();
      setTimeout(() => setActiveTab('overview'), 1500);
    } catch (error: any) {
      setTransferError(error.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  const totalIncome = transactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = transactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e3f2fd 50%, #f3e5f5 100%)',
      padding: isMobile ? '12px' : '24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Premium Balance Card */}
        {balance && (
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: isMobile ? '16px' : '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: isMobile ? '20px' : '40px',
            marginBottom: isMobile ? '16px' : '24px',
            boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)'
          }}>
            <div style={{
              position: 'absolute',
              top: isMobile ? '-50px' : '-100px',
              right: isMobile ? '-50px' : '-100px',
              width: isMobile ? '150px' : '300px',
              height: isMobile ? '150px' : '300px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%'
            }}></div>
            
            <div style={{ position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '32px' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '12px' : '14px', marginBottom: '8px' }}>
                    Available Balance
                  </div>
                  <div style={{ color: 'white', fontSize: isMobile ? '32px' : '48px', fontWeight: 'bold', letterSpacing: '-1px' }}>
                    {balance.balance.toFixed(2)}
                    <span style={{ fontSize: isMobile ? '16px' : '24px', marginLeft: '8px', opacity: 0.9 }}>credits</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '10px' : '16px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: isMobile ? '12px' : '16px',
                  padding: isMobile ? '12px' : '16px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '11px' : '12px', marginBottom: '4px' }}>
                    Total Received
                  </div>
                  <div style={{ color: 'white', fontSize: isMobile ? '18px' : '24px', fontWeight: '600' }}>
                    {balance.total_deposited.toFixed(2)}
                  </div>
                </div>
                
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: isMobile ? '12px' : '16px',
                  padding: isMobile ? '12px' : '16px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '11px' : '12px', marginBottom: '4px' }}>
                    Total Spent
                  </div>
                  <div style={{ color: 'white', fontSize: isMobile ? '18px' : '24px', fontWeight: '600' }}>
                    {balance.total_consumed.toFixed(4)}
                  </div>
                </div>
                
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: isMobile ? '12px' : '16px',
                  padding: isMobile ? '12px' : '16px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '11px' : '12px', marginBottom: '4px' }}>
                    Transactions
                  </div>
                  <div style={{ color: 'white', fontSize: isMobile ? '18px' : '24px', fontWeight: '600' }}>
                    {transactions.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '10px' : '16px', marginBottom: isMobile ? '16px' : '24px' }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'transfer', label: 'Transfer', icon: '💸' },
            { id: 'transactions', label: 'History', icon: '📜' },
            { id: 'pricing', label: 'Pricing', icon: '💰' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '20px',
                borderRadius: '16px',
                border: 'none',
                background: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.6)',
                boxShadow: activeTab === tab.id ? '0 8px 16px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: activeTab === tab.id ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{tab.icon}</div>
              <div style={{ fontWeight: '600', color: '#1f2937' }}>{tab.label}</div>
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div style={{ 
          background: 'white', 
          borderRadius: isMobile ? '16px' : '24px', 
          padding: isMobile ? '16px' : '32px', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)' 
        }}>
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold', marginBottom: isMobile ? '16px' : '24px' }}>Account Overview</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '12px' : '24px', marginBottom: isMobile ? '16px' : '32px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
                  borderRadius: isMobile ? '12px' : '16px',
                  padding: isMobile ? '16px' : '24px'
                }}>
                  <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#065f46', marginBottom: '8px' }}>💰 Income</div>
                  <div style={{ fontSize: isMobile ? '24px' : '36px', fontWeight: 'bold', color: '#065f46' }}>
                    +{totalIncome.toFixed(2)}
                  </div>
                  <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#047857' }}>credits received</div>
                </div>
                
                <div style={{
                  background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                  borderRadius: isMobile ? '12px' : '16px',
                  padding: isMobile ? '16px' : '24px'
                }}>
                  <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#7f1d1d', marginBottom: '8px' }}>💳 Expenses</div>
                  <div style={{ fontSize: isMobile ? '24px' : '36px', fontWeight: 'bold', color: '#991b1b', wordBreak: 'break-word' }}>
                    -{totalExpense.toFixed(4)}
                  </div>
                  <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#b91c1c' }}>credits spent</div>
                </div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
                borderRadius: isMobile ? '12px' : '16px',
                padding: isMobile ? '16px' : '24px',
                border: '1px solid #bae6fd'
              }}>
                <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '600', marginBottom: isMobile ? '12px' : '16px' }}>💡 Quick Info</h3>
                <ul style={{ fontSize: isMobile ? '12px' : '14px', color: '#1e40af', lineHeight: '1.8', listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '8px' }}>• Credits are the platform's currency</li>
                  <li style={{ marginBottom: '8px' }}>• Use Credits for all AI model requests</li>
                  <li style={{ marginBottom: '8px' }}>• Transfer Credits to other users anytime</li>
                  <li>• Different models have different pricing tiers</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'transfer' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💸</div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Transfer Credits</h2>
                <p style={{ color: '#6b7280' }}>Send credits to another user</p>
              </div>
              
              {transferSuccess && (
                <div style={{
                  background: '#d1fae5',
                  border: '1px solid #6ee7b7',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px',
                  color: '#065f46',
                  textAlign: 'center'
                }}>
                  ✅ Transfer successful!
                </div>
              )}
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  Recipient Username
                </label>
                <input
                  type="text"
                  value={transferUsername}
                  onChange={(e) => setTransferUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  placeholder="Enter username"
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  Amount (credits)
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  placeholder="Add a note..."
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              
              {transferError && (
                <div style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px',
                  color: '#991b1b'
                }}>
                  {transferError}
                </div>
              )}
              
              <button
                onClick={handleTransfer}
                disabled={transferLoading}
                style={{
                  width: '100%',
                  background: transferLoading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: transferLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                {transferLoading ? 'Processing...' : 'Send Credits'}
              </button>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Transaction History</h2>
              
              <div>
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      background: '#f9fafb',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {tx.description || tx.type}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: tx.amount > 0 ? '#059669' : '#dc2626'
                      }}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(4)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Balance: {tx.balance_after.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {transactions.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
                    No transactions yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Model Pricing</h2>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>Credit-based pricing for all models</p>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Model</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Provider</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Tier</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Input/1K</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Output/1K</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.map((model) => (
                      <tr key={model.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{model.model_name}</td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>{model.provider}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: model.tier === 'tiny' ? '#dbeafe' :
                                      model.tier === 'small' ? '#d1fae5' :
                                      model.tier === 'medium' ? '#fef3c7' : '#fee2e2',
                            color: model.tier === 'tiny' ? '#1e40af' :
                                  model.tier === 'small' ? '#065f46' :
                                  model.tier === 'medium' ? '#92400e' : '#991b1b'
                          }}>
                            {model.tier}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {model.credits_per_1k_input.toFixed(4)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {model.credits_per_1k_output.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

