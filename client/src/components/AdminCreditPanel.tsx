import { useState, useEffect } from 'react';
import { creditApi, api, CreditBalance, UserWithLimit } from '../api';

interface UserCreditInfo {
  user_id: string;
  username: string;
  email: string;
  balance: number;
  total_deposited: number;
  total_consumed: number;
}

export default function AdminCreditPanel() {
  const [users, setUsers] = useState<UserWithLimit[]>([]);
  const [userCredits, setUserCredits] = useState<Map<string, CreditBalance>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [operation, setOperation] = useState<'deposit' | 'deduct'>('deposit');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      // Load all users
      const usersData = await api.getUsers();
      setUsers(usersData);

      // Load credit balance for each user
      const creditMap = new Map<string, CreditBalance>();
      for (const userInfo of usersData) {
        try {
          // Try to get balance via admin endpoint (if exists) or regular endpoint
          const response = await fetch(`/api/credits/balance/${userInfo.user.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!response.ok) {
            // User doesn't have credits initialized yet
            creditMap.set(userInfo.user.id, {
              user_id: userInfo.user.id,
              balance: 0,
              total_deposited: 0,
              total_consumed: 0
            });
          } else {
            const balance = await response.json();
            creditMap.set(userInfo.user.id, balance);
          }
        } catch (err) {
          // User doesn't have credits initialized
          creditMap.set(userInfo.user.id, {
            user_id: userInfo.user.id,
            balance: 0,
            total_deposited: 0,
            total_consumed: 0
          });
        }
      }
      
      setUserCredits(creditMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      setError('Please select a user and enter a valid amount');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const amountValue = parseFloat(amount);
      const finalAmount = operation === 'deduct' ? -amountValue : amountValue;

      await creditApi.deposit(token, {
        user_id: selectedUser,
        amount: finalAmount,
        description: description || `Admin ${operation}: ${Math.abs(finalAmount)} credits`
      });

      setSuccess(`Successfully ${operation === 'deposit' ? 'deposited' : 'deducted'} ${Math.abs(finalAmount)} credits!`);
      setAmount('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      setError(err.message || `Failed to ${operation} credits`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ color: '#6b7280' }}>Loading credit data...</div>
      </div>
    );
  }

  const selectedUserInfo = users.find(u => u.user.id === selectedUser);
  const selectedUserCredit = selectedUser ? userCredits.get(selectedUser) : null;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
          💰 Credit Management
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Manage user credit balances
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        {/* User List */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>User Credits</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Balance</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Deposited</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Consumed</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userInfo) => {
                const credit = userCredits.get(userInfo.user.id);
                return (
                  <tr
                    key={userInfo.user.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: selectedUser === userInfo.user.id ? '#f0f9ff' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500', color: '#1f2937' }}>{userInfo.user.username}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{userInfo.user.email}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>
                      {credit?.balance.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#059669' }}>
                      {credit?.total_deposited.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>
                      {credit?.total_consumed.toFixed(4) || '0.0000'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedUser(userInfo.user.id)}
                        style={{
                          padding: '6px 12px',
                          background: selectedUser === userInfo.user.id ? '#3b82f6' : '#e5e7eb',
                          color: selectedUser === userInfo.user.id ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        {selectedUser === userInfo.user.id ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Operation Panel */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          height: 'fit-content',
          position: 'sticky',
          top: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            {operation === 'deposit' ? '➕ Deposit' : '➖ Deduct'} Credits
          </h3>

          {/* Operation Toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button
              onClick={() => setOperation('deposit')}
              style={{
                flex: 1,
                padding: '10px',
                background: operation === 'deposit' ? '#10b981' : '#f3f4f6',
                color: operation === 'deposit' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ➕ Deposit
            </button>
            <button
              onClick={() => setOperation('deduct')}
              style={{
                flex: 1,
                padding: '10px',
                background: operation === 'deduct' ? '#ef4444' : '#f3f4f6',
                color: operation === 'deduct' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ➖ Deduct
            </button>
          </div>

          {/* Selected User Info */}
          {selectedUserInfo && selectedUserCredit && (
            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Selected User</div>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                {selectedUserInfo.user.username}
              </div>
              <div style={{ fontSize: '14px', color: '#374151' }}>
                Current Balance: <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                  {selectedUserCredit.balance.toFixed(2)} credits
                </span>
              </div>
            </div>
          )}

          {!selectedUser && (
            <div style={{
              background: '#fef3c7',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              color: '#92400e',
              fontSize: '14px'
            }}>
              ⚠️ Please select a user from the list
            </div>
          )}

          {/* Amount Input */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              Amount (credits)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
              placeholder="0.00"
              min="0"
              step="0.01"
              disabled={!selectedUser}
            />
            {amount && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                ≈ ${(parseFloat(amount) * 0.01).toFixed(4)} USD
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
              placeholder="e.g., Bonus credits"
              disabled={!selectedUser}
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#991b1b',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: '#d1fae5',
              border: '1px solid #6ee7b7',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#065f46',
              fontSize: '14px'
            }}>
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedUser || !amount}
            style={{
              width: '100%',
              padding: '12px',
              background: !selectedUser || !amount ? '#d1d5db' : 
                          operation === 'deposit' ? '#10b981' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: !selectedUser || !amount ? 'not-allowed' : 'pointer'
            }}
          >
            {operation === 'deposit' ? '➕ Deposit' : '➖ Deduct'} Credits
          </button>
        </div>
      </div>
    </div>
  );
}

