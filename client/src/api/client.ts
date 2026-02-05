export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiClient {
  public baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = this.baseUrl.startsWith('/')
      ? `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    const initData = this.getInitData();
    
    const isFormData = options.body instanceof FormData;

    const headers: HeadersInit = {
      ...(initData && { 'X-Telegram-Init-Data': initData }),
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private getInitData(): string {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return window.Telegram.WebApp.initData;
    }
    return '';
  }

  async authTelegram(initData: string) {
    return this.request<{
      success: boolean;
      user: {
        id: number;
        telegram_id: string;
        username?: string;
        participation: boolean;
        balance: number;
      };
    }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    });
  }

  async getMe() {
    return this.request<{
      id: number;
      telegram_id: string;
      username?: string;
      display_name?: string;
      participation: boolean;
      balance: number;
      created_at: string;
    }>('/users/me');
  }

  async updateDisplayName(displayName: string | null) {
    return this.request<{
      id: number;
      display_name: string | null;
    }>('/users/me/display-name', {
      method: 'PUT',
      body: JSON.stringify({ display_name: displayName }),
    });
  }

  async participate() {
    return this.request<{
      success: boolean;
      participation: boolean;
    }>('/users/participate', {
      method: 'POST',
    });
  }

  async checkSubscription() {
    return this.request<{
      isSubscribed: boolean;
      channelId: string;
    }>('/users/check-subscription');
  }

  async getGroups() {
    return this.request<Array<{
      id: number;
      name: string;
      created_at: string;
      teams?: Array<{ id: number; name: string; is_active: boolean }>;
    }>>('/groups');
  }

  async getGroup(id: number) {
    return this.request<{
      id: number;
      name: string;
      teams: Array<{ id: number; name: string }>;
      matches: Array<any>;
    }>(`/groups/${id}`);
  }

  async getMatches(groupId: number) {
    return this.request<Array<{
      id: number;
      team1: { id: number; name: string; logo_url?: string | null };
      team2: { id: number; name: string; logo_url?: string | null };
      start_time: string;
      result: 'P1' | 'P2' | null;
      coefficients: { p1: number; p2: number };
    }>>(`/groups/${groupId}/matches`);
  }

  async createBet(data: {
    match_id: number;
    side: 'P1' | 'P2';
    amount: number;
  }) {
    return this.request<{
      id: number;
      match_id: number;
      side: 'P1' | 'P2';
      amount: number;
      coefficient: number;
      status: 'pending' | 'win' | 'lose';
    }>('/bets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHistory(page: number = 1, limit: number = 10) {
    return this.request<{
      bets: Array<{
        id: number;
        match: {
          id: number;
          team1: string;
          team2: string;
        };
        side: 'P1' | 'P2';
        amount: number;
        coefficient: number;
        status: 'pending' | 'win' | 'lose' | 'refunded';
        created_at: string;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/users/me/history?page=${page}&limit=${limit}`);
  }

  async getRanking() {
    return this.request<{
      users: Array<{
        rank: number;
        id: number;
        username: string;
        balance: number;
        prizeImage: string | null;
        isCurrentUser?: boolean;
      }>;
      my: {
        rank: number;
        id: number;
        username: string;
        balance: number;
        prizeImage: string | null;
        isCurrentUser?: boolean;
      } | null;
    }>('/users/ranking');
  }

  async getPrizes() {
    return this.request<Array<{
      id: number;
      position: number;
      image_url: string;
      created_at: string;
    }>>('/admin/prizes');
  }

  async createPrize(data: { position: number; image_url: string }) {
    return this.request<{
      id: number;
      position: number;
      image_url: string;
      created_at: string;
    }>('/admin/prizes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePrize(id: number, data: { position?: number; image_url?: string }) {
    return this.request<{
      id: number;
      position: number;
      image_url: string;
      created_at: string;
    }>(`/admin/prizes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePrize(id: number) {
    return this.request<{ success: boolean }>(`/admin/prizes/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadPrizeImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.request<{
      imageData: string;
    }>('/admin/prizes/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getRankingSettings() {
    return this.request<{
      rankingLimit: number;
    }>('/admin/prizes/settings');
  }

  async updateRankingSettings(rankingLimit: number) {
    return this.request<{
      rankingLimit: number;
    }>('/admin/prizes/settings', {
      method: 'PUT',
      body: JSON.stringify({ rankingLimit }),
    });
  }

  async getMatchesHistory(page: number = 1, limit: number = 10) {
    return this.request<{
      matches: Array<{
        id: number;
        team1: { id: number; name: string };
        team2: { id: number; name: string };
        start_time: string;
        result: 'P1' | 'P2' | null;
        refund_processed?: boolean;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/matches/history?page=${page}&limit=${limit}`);
  }

  async getAdminUsers(page: number = 1, limit: number = 20, search: string = '') {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) {
      params.append('search', search);
    }
    return this.request<{
      users: Array<{
        id: number;
        telegram_id: string;
        username?: string;
        display_name?: string;
        balance: number;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/admin/users?${params.toString()}`);
  }

  async getAdminArchiveMatches(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) {
      params.append('search', search);
    }
    return this.request<{
      matches: Array<{
        id: number;
        team1: { id: number; name: string };
        team2: { id: number; name: string };
        start_time: string;
        result: 'P1' | 'P2' | null;
        refund_processed: boolean;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/admin/matches/archive?${params.toString()}`);
  }

  async refundMatch(matchId: number) {
    return this.request<{
      refundedBets: number;
      refundedStakeTotal: number;
    }>(`/admin/matches/${matchId}/refund`, {
      method: 'POST',
    });
  }

  async resetUserDisplayName(userId: number) {
    return this.request<{ success: boolean }>(`/admin/users/${userId}/display-name`, {
      method: 'DELETE',
    });
  }

  async checkIsAdmin() {
    return this.request<{ isAdmin: boolean }>('/users/me/is-admin');
  }

  async generateBonusCodes(data: {
    count: number;
    value: number;
    codeLength: number;
    maxUses: number | null;
  }) {
    return this.request<Array<{
      id: number;
      code: string;
      value: number;
      max_uses: number | null;
      used_count: number;
      created_at: string;
    }>>('/admin/bonus-codes/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBonusCodes(page: number = 1, limit: number = 50) {
    return this.request<{
      codes: Array<{
        id: number;
        code: string;
        value: number;
        max_uses: number | null;
        used_count: number;
        created_at: string;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/admin/bonus-codes?page=${page}&limit=${limit}`);
  }

  async getBonusCodeStatistics(codeId: number) {
    return this.request<{
      code: {
        id: number;
        code: string;
        value: number;
        max_uses: number | null;
        used_count: number;
        created_at: string;
      };
      usages: Array<{
        id: number;
        user_id: number;
        user_telegram_id: string;
        user_username?: string;
        user_display_name?: string;
        used_at: string;
      }>;
      total: number;
    }>(`/admin/bonus-codes/${codeId}/statistics`);
  }

  async deleteBonusCode(codeId: number) {
    return this.request<{ success: boolean }>(`/admin/bonus-codes/${codeId}`, {
      method: 'DELETE',
    });
  }

  async redeemBonusCode(code: string) {
    return this.request<{
      success: boolean;
      value: number;
    }>('/bonus-codes/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async checkDailyBonus() {
    return this.request<{ canClaim: boolean }>('/users/me/daily-bonus/check');
  }

  async claimDailyBonus() {
    return this.request<{
      success: boolean;
      value: number;
    }>('/users/me/daily-bonus/claim', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();

