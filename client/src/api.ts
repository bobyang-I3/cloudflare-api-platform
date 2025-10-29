/**
 * API service layer
 */

// Use full URL for production to bypass proxy issues
const API_BASE = import.meta.env.VITE_API_BASE || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? `http://${window.location.hostname}:8000/api`
    : '/api');

interface ApiError {
  detail: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// ============= Auth API =============

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  api_key: string;
  is_active: boolean;
  is_admin?: boolean;
  role?: string;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export const authApi = {
  register: async (data: RegisterData): Promise<User> => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<User>(response);
  },

  login: async (data: LoginData): Promise<Token> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Token>(response);
  },

  getMe: async (token: string): Promise<User> => {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<User>(response);
  },

  refreshApiKey: async (token: string): Promise<User> => {
    const response = await fetch(`${API_BASE}/auth/refresh-api-key`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<User>(response);
  },
};

// ============= AI API =============

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  image?: string; // Optional base64 image data for vision models
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  model: string;
  response: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  task: string;
  description?: string;
  capabilities?: string[];
  status: string;
}

export const aiApi = {
  getModels: async (): Promise<Model[]> => {
    const response = await fetch(`${API_BASE}/ai/models`);
    return handleResponse<Model[]>(response);
  },

  chat: async (apiKey: string, request: ChatRequest): Promise<ChatResponse> => {
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(request),
    });
    return handleResponse<ChatResponse>(response);
  },

  // Streaming chat API
  chatStream: async (
    apiKey: string, 
    request: ChatRequest,
    onChunk: (text: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: string) => void
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              // Backend returns "token" field for each chunk
              if (parsed.token) {
                fullText += parsed.token;
                onChunk(parsed.token);
              }
              // Also handle "done" event with full response
              if (parsed.done && parsed.tokens?.response) {
                fullText = parsed.tokens.response;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      onComplete(fullText);
    } catch (error: any) {
      onError(error.message || 'Stream failed');
    }
  },
};

// ============= Usage API =============

export interface UsageLog {
  id: string;
  timestamp: string;
  model_name: string;
  task_type: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  response_time_ms: number;
  has_image: boolean;
  has_audio: boolean;
}

export interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  by_model: Record<string, { requests: number; tokens: number }>;
  by_task: Record<string, { requests: number; tokens: number }>;
}

export interface DailyUsageData {
  date: string;
  requests: number;
  tokens: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
}

export interface ModelUsageData {
  name: string;
  requests: number;
  tokens: number;
  value: number;
}

export const usageApi = {
  getStats: async (token: string, days: number = 30): Promise<UsageStats> => {
    const response = await fetch(`${API_BASE}/usage/stats?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<UsageStats>(response);
  },

  getLogs: async (token: string, limit: number = 50, offset: number = 0): Promise<UsageLog[]> => {
    const response = await fetch(`${API_BASE}/usage/logs?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<UsageLog[]>(response);
  },

  getDailyChart: async (token: string, days: number = 7): Promise<DailyUsageData[]> => {
    const response = await fetch(`${API_BASE}/usage/charts/daily?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<DailyUsageData[]>(response);
  },

  getModelUsageChart: async (token: string, days: number = 30): Promise<ModelUsageData[]> => {
    const response = await fetch(`${API_BASE}/usage/charts/model-usage?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<ModelUsageData[]>(response);
  },
};

// ============= Admin API =============

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  api_key: string;
  is_active: boolean;
  is_admin: boolean;
  role: string;
  created_at: string;
}

export interface UserLimitInfo {
  user_id: string;
  max_requests_per_day: number;
  max_tokens_per_day: number;
  max_tokens_per_month: number;
  is_limited: boolean;
}

export interface UserWithLimit {
  user: UserInfo;
  limit: UserLimitInfo | null;
  total_requests: number;
  total_tokens: number;
  requests_today: number;
  tokens_today: number;
}

export interface PlatformStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_requests: number;
  total_tokens: number;
  requests_today: number;
  tokens_today: number;
  top_models: Array<{ model: string; requests: number; tokens: number }>;
}

export interface UpdateUserLimitRequest {
  max_requests_per_day: number;
  max_tokens_per_day: number;
  max_tokens_per_month: number;
  is_limited: boolean;
}

// ============= Credit API =============

export interface CreditBalance {
  user_id: string;
  balance: number;
  total_deposited: number;
  total_consumed: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: string; // 'deposit' | 'consumption' | 'refund' | 'bonus' | 'admin_adjustment'
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface ModelPricing {
  id: string;
  model_id: string;
  model_name: string;
  provider: string;
  tier: string; // 'tiny' | 'small' | 'medium' | 'large'
  credits_per_1k_input: number;
  credits_per_1k_output: number;
  vision_surcharge: number;
  is_active: boolean;
}

export interface CreditDepositRequest {
  user_id: string;
  amount: number;
  description?: string;
}

export interface CreditTransferRequest {
  to_username: string;
  amount: number;
  description?: string;
}

export const creditApi = {
  getBalance: async (token: string): Promise<CreditBalance> => {
    const response = await fetch(`${API_BASE}/credits/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<CreditBalance>(response);
  },

  getTransactions: async (token: string, limit: number = 50, offset: number = 0): Promise<CreditTransaction[]> => {
    const response = await fetch(`${API_BASE}/credits/transactions?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<CreditTransaction[]>(response);
  },

  getPricing: async (): Promise<ModelPricing[]> => {
    const response = await fetch(`${API_BASE}/credits/pricing`);
    return handleResponse<ModelPricing[]>(response);
  },

  deposit: async (token: string, data: CreditDepositRequest): Promise<CreditTransaction> => {
    const response = await fetch(`${API_BASE}/credits/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CreditTransaction>(response);
  },

  transfer: async (token: string, data: CreditTransferRequest): Promise<CreditTransaction[]> => {
    const response = await fetch(`${API_BASE}/credits/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CreditTransaction[]>(response);
  },
};

// Combined API object for convenience
export const api = {
  // Admin endpoints
  getUsers: async (): Promise<UserWithLimit[]> => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<UserWithLimit[]>(response);
  },

  getPlatformStats: async (): Promise<PlatformStats> => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<PlatformStats>(response);
  },

  updateUserLimit: async (userId: string, limitData: UpdateUserLimitRequest): Promise<any> => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/admin/user/${userId}/limit`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(limitData),
    });
    return handleResponse<any>(response);
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<any> => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/admin/user/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_active: isActive }),
    });
    return handleResponse<any>(response);
  },

  deleteUser: async (userId: string): Promise<any> => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/admin/user/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<any>(response);
  },
};

