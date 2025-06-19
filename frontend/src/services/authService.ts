interface UserInfo {
    is_admin: boolean;
    role: string;
    name?: string;
}

interface AuthResponse {
    success: boolean;
    user?: UserInfo;
    error?: string;
}

/**
 * Получить JWT токен из localStorage
 */
function getAuthToken(): string | null {
    // Берем токен только из localStorage с ключом jwt_token
    const token = localStorage.getItem('jwt_token');
    return token;
}

/**
 * Проверить права пользователя через API
 */
export async function checkUserAuth(): Promise<AuthResponse> {
    const token = getAuthToken();
    
    if (!token) {
        return {
            success: false,
            error: 'No authentication token found'
        };
    }

    try {
        const response = await fetch('https://rifelli.ru/api/v1/users/check-admin', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                return {
                    success: false,
                    error: 'Unauthorized - please login'
                };
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const userData: UserInfo = await response.json();
        
        return {
            success: true,
            user: userData
        };
    } catch (error) {
        console.error('Auth check failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed'
        };
    }
}

/**
 * Перенаправить на страницу входа
 */
export function redirectToLogin() {
    // Сохраняем текущий URL для возврата после входа
    localStorage.setItem('redirect_after_login', window.location.pathname);
    window.location.href = 'https://rifelli.ru/login';
} 