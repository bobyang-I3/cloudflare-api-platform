import { useState, useEffect } from 'react';
import { usageApi, DailyUsageData, ModelUsageData } from '../api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface UsageChartsProps {
  token: string;
}

const COLORS = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function UsageCharts({ token }: UsageChartsProps) {
  const [dailyData, setDailyData] = useState<DailyUsageData[]>([]);
  const [modelData, setModelData] = useState<ModelUsageData[]>([]);
  const [timeRange, setTimeRange] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [token, timeRange]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const [daily, models] = await Promise.all([
        usageApi.getDailyChart(token, timeRange),
        usageApi.getModelUsageChart(token, 30)
      ]);
      setDailyData(daily);
      setModelData(models);
    } catch (err) {
      console.error('Failed to load chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: '#6b7280'
      }}>
        Loading charts...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Time Range Selector */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontWeight: '600', color: '#1f2937' }}>Time Range:</span>
        {[7, 14, 30].map((days) => (
          <button
            key={days}
            onClick={() => setTimeRange(days)}
            style={{
              padding: '8px 16px',
              background: timeRange === days ? '#667eea' : '#f3f4f6',
              color: timeRange === days ? 'white' : '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {days} Days
          </button>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
        {/* Daily Usage Line Chart */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', color: '#1f2937' }}>Daily Token Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="tokens"
                stroke="#667eea"
                strokeWidth={2}
                name="Total Tokens"
                dot={{ fill: '#667eea' }}
              />
              <Line
                type="monotone"
                dataKey="input_tokens"
                stroke="#10b981"
                strokeWidth={2}
                name="Input Tokens"
                dot={{ fill: '#10b981' }}
              />
              <Line
                type="monotone"
                dataKey="output_tokens"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Output Tokens"
                dot={{ fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Cost Line Chart */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', color: '#1f2937' }}>Daily Credit Consumption</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#ef4444"
                strokeWidth={3}
                name="Credits"
                dot={{ fill: '#ef4444', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Model Usage Bar Chart */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', color: '#1f2937' }}>Model Usage (Top 10)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                interval={0}
                tick={{ fontSize: 10 }}
                tickFormatter={(value: string) => {
                  // Shorten model names: take last part after slash, limit to 15 chars
                  const shortName = value.split('/').pop() || value;
                  return shortName.length > 15 ? shortName.substring(0, 12) + '...' : shortName;
                }}
              />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="tokens" fill="#667eea" name="Tokens" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Usage Pie Chart */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', color: '#1f2937' }}>Model Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={modelData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {modelData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                formatter={(value: string) => {
                  const shortName = value.split('/').pop() || value;
                  return shortName.length > 20 ? shortName.substring(0, 17) + '...' : shortName;
                }}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        marginTop: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Tokens</div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>
            {dailyData.reduce((sum, d) => sum + d.tokens, 0).toLocaleString()}
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Requests</div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>
            {dailyData.reduce((sum, d) => sum + d.requests, 0).toLocaleString()}
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Credits Spent</div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>
            {dailyData.reduce((sum, d) => sum + d.cost, 0).toFixed(2)}
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Avg. Tokens/Day</div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>
            {dailyData.length > 0 
              ? (dailyData.reduce((sum, d) => sum + d.tokens, 0) / dailyData.length).toFixed(0)
              : 0
            }
          </div>
        </div>
      </div>
    </div>
  );
}

