import { useState, useEffect } from 'react';
import { creditApi, CreditBalance, CreditTransaction, ModelPricing } from '../api';
import { Send, TrendingUp, TrendingDown, DollarSign, Users, ArrowRightLeft } from 'lucide-react';

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
  
  // Transfer state
  const [transferUsername, setTransferUsername] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

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
    
    try {
      await creditApi.transfer(token, {
        to_username: transferUsername,
        amount: parseFloat(transferAmount),
        description: transferDescription || undefined,
      });
      
      // Reset form and reload data
      setTransferUsername('');
      setTransferAmount('');
      setTransferDescription('');
      await loadData();
      setActiveTab('overview');
    } catch (error: any) {
      setTransferError(error.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Calculate statistics
  const totalIncome = transactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpense = transactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Premium Balance Card */}
        {balance && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -ml-32 -mb-32"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-white/80 text-sm font-medium mb-2">Available Balance</div>
                  <div className="text-white text-5xl font-bold tracking-tight">
                    {balance.balance.toFixed(2)}
                    <span className="text-2xl ml-2 font-normal opacity-90">credits</span>
                  </div>
                  <div className="text-white/70 text-sm mt-2">
                    ≈ ${(balance.balance * 0.01).toFixed(4)} USD
                  </div>
                </div>
                
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 border border-white/30">
                  <DollarSign className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Total Received
                  </div>
                  <div className="text-white text-xl font-semibold">
                    {balance.total_deposited.toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                    <TrendingDown className="w-4 h-4" />
                    Total Spent
                  </div>
                  <div className="text-white text-xl font-semibold">
                    {balance.total_consumed.toFixed(4)}
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                    <ArrowRightLeft className="w-4 h-4" />
                    Transactions
                  </div>
                  <div className="text-white text-xl font-semibold">
                    {transactions.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`p-6 rounded-2xl transition-all ${
              activeTab === 'overview'
                ? 'bg-white shadow-lg scale-105'
                : 'bg-white/60 hover:bg-white hover:shadow-md'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeTab === 'overview' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <TrendingUp className={`w-6 h-6 ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-600'}`} />
              </div>
              <span className="font-semibold text-gray-900">Overview</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('transfer')}
            className={`p-6 rounded-2xl transition-all ${
              activeTab === 'transfer'
                ? 'bg-white shadow-lg scale-105'
                : 'bg-white/60 hover:bg-white hover:shadow-md'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeTab === 'transfer' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Send className={`w-6 h-6 ${activeTab === 'transfer' ? 'text-green-600' : 'text-gray-600'}`} />
              </div>
              <span className="font-semibold text-gray-900">Transfer</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('transactions')}
            className={`p-6 rounded-2xl transition-all ${
              activeTab === 'transactions'
                ? 'bg-white shadow-lg scale-105'
                : 'bg-white/60 hover:bg-white hover:shadow-md'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeTab === 'transactions' ? 'bg-purple-100' : 'bg-gray-100'
              }`}>
                <ArrowRightLeft className={`w-6 h-6 ${activeTab === 'transactions' ? 'text-purple-600' : 'text-gray-600'}`} />
              </div>
              <span className="font-semibold text-gray-900">History</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('pricing')}
            className={`p-6 rounded-2xl transition-all ${
              activeTab === 'pricing'
                ? 'bg-white shadow-lg scale-105'
                : 'bg-white/60 hover:bg-white hover:shadow-md'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeTab === 'pricing' ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                <DollarSign className={`w-6 h-6 ${activeTab === 'pricing' ? 'text-orange-600' : 'text-gray-600'}`} />
              </div>
              <span className="font-semibold text-gray-900">Pricing</span>
            </div>
          </button>
        </div>

        {/* Content Panels */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Overview</h2>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-gray-700 font-medium">Income</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    +{totalIncome.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">credits received</div>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border border-red-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="text-gray-700 font-medium">Expenses</span>
                  </div>
                  <div className="text-3xl font-bold text-red-600">
                    -{totalExpense.toFixed(4)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">credits spent</div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Quick Info</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• 1 Credit = $0.01 USD</li>
                  <li>• Credits are used for AI model requests</li>
                  <li>• You can transfer credits to other users</li>
                  <li>• Different models have different pricing tiers</li>
                </ul>
              </div>
            </div>
          )}

          {/* Transfer Tab */}
          {activeTab === 'transfer' && (
            <div className="p-8">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Credits</h2>
                  <p className="text-gray-600">Send credits to another user</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Recipient Username
                    </label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={transferUsername}
                        onChange={(e) => setTransferUsername(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        placeholder="Enter username"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Amount (credits)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {transferAmount && (
                      <div className="mt-2 text-sm text-gray-500">
                        ≈ ${(parseFloat(transferAmount) * 0.01).toFixed(4)} USD
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Note (optional)
                    </label>
                    <input
                      type="text"
                      value={transferDescription}
                      onChange={(e) => setTransferDescription(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      placeholder="Add a note..."
                    />
                  </div>
                  
                  {transferError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-600">{transferError}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleTransfer}
                    disabled={transferLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {transferLoading ? 'Processing...' : 'Send Credits'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h2>
              
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {tx.amount > 0 ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        
                        <div>
                          <div className="font-semibold text-gray-900">
                            {tx.description || tx.type}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(tx.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(4)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Balance: {tx.balance_after.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {transactions.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No transactions yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Model Pricing</h2>
              <p className="text-gray-600 mb-6">1 Credit = $0.01 USD</p>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Model</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Provider</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-700">Tier</th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700">Input / 1K</th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700">Output / 1K</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.map((model) => (
                      <tr key={model.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium text-gray-900">{model.model_name}</td>
                        <td className="py-4 px-4 text-gray-600">{model.provider}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            model.tier === 'tiny' ? 'bg-blue-100 text-blue-700' :
                            model.tier === 'small' ? 'bg-green-100 text-green-700' :
                            model.tier === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {model.tier}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-gray-900">
                          {model.credits_per_1k_input.toFixed(4)}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-gray-900">
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
