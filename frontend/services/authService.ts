import { User, AuthResponse, Branch } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';;

class AuthService {
  private token: string | null = null;
  private user: User | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    // Load from localStorage on initialization
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    const expiry = localStorage.getItem('tokenExpiry');
    
    if (token && userStr && expiry) {
      // Check if token is expired
      if (Date.now() < parseInt(expiry)) {
        this.token = token;
        this.tokenExpiry = parseInt(expiry);
        try {
          this.user = JSON.parse(userStr);
          if (import.meta.env.DEV) {
            const timeLeft = parseInt(expiry) - Date.now();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            console.log(`🔐 Auth: Session restored. Expires in ${hours}h ${minutes}m`);
          }
        } catch (e) {
          console.warn('🔐 Auth: Invalid user data in localStorage, logging out');
          this.logout();
        }
      } else {
        // Token expired, clear everything
        if (import.meta.env.DEV) {
          console.warn('🔐 Auth: Token expired, logging out');
        }
        this.logout();
      }
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const authData: AuthResponse = await response.json();
    this.setAuthData(authData);
    return authData;
  }

  async signup(email: string, password: string, role: 'Admin' | 'Student' = 'Student', accessibilityNeeds: string[] = [], branch?: Branch): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, role, accessibilityNeeds, branch }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMsg = error.errors?.[0]?.msg || error.error;
      throw new Error(errorMsg || 'Signup failed');
    }

    const authData: AuthResponse = await response.json();
    this.setAuthData(authData);
    return authData;
  }

  logout(): void {
    this.token = null;
    this.user = null;
    this.tokenExpiry = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
  }

  private setAuthData(authData: AuthResponse): void {
    this.token = authData.token;
    this.user = authData.user;
    // JWT expires in 24h, store expiry time (subtract 5 min buffer)
    this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000) - (5 * 60 * 1000);
    
    localStorage.setItem('authToken', authData.token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    localStorage.setItem('tokenExpiry', this.tokenExpiry.toString());
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    // Check if token exists and is not expired
    if (!this.token || !this.user || !this.tokenExpiry) {
      return false;
    }
    
    if (Date.now() >= this.tokenExpiry) {
      // Token expired, logout
      this.logout();
      return false;
    }
    
    return true;
  }

  isAdmin(): boolean {
    return this.user?.role === 'Admin';
  }

  // Helper method to get auth headers
  getAuthHeaders(): { Authorization?: string } {
    // Check token validity before returning headers
    if (this.isAuthenticated()) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }

  // Method to handle auth errors from API
  handleAuthError(): void {
    if (import.meta.env.DEV) {
      console.warn('🔐 Auth: Authentication error detected, redirecting to login');
    }
    this.logout();
    // Redirect to login page
    window.location.href = '/login';
  }

  // Get time until token expiry in milliseconds
  getTimeUntilExpiry(): number | null {
    if (!this.tokenExpiry) return null;
    return this.tokenExpiry - Date.now();
  }

  // Check if token will expire soon (within 30 minutes)
  isExpiringSoon(): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry();
    if (!timeUntilExpiry) return false;
    const thirtyMinutes = 30 * 60 * 1000;
    return timeUntilExpiry > 0 && timeUntilExpiry < thirtyMinutes;
  }
}

export const authService = new AuthService();
