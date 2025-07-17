const API_URL = 'http://10.10.52.28:3001';

export interface AuthResponse {
    success: boolean;
    username?: string;
    elo?: number;
    isAdmin?: boolean;
    error?: string;
}

export async function register(username: string, password: string): Promise<AuthResponse> {
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('username', username);
            return data;
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
}

export async function login(username: string, password: string): Promise<AuthResponse> {
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('username', username);
            localStorage.setItem('elo', data.elo.toString());
            if (data.isAdmin) {
                localStorage.setItem('isAdmin', 'true');
            }
            return data;
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
}

export function logout() {
    localStorage.removeItem('username');
    localStorage.removeItem('elo');
    localStorage.removeItem('isAdmin');
}

export function getCurrentUser(): { username: string | null; elo: number; isAdmin: boolean } {
    const username = localStorage.getItem('username');
    const elo = parseInt(localStorage.getItem('elo') || '1200');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    return { username, elo, isAdmin };
}