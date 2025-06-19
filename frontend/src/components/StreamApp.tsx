import React, { useState, useEffect } from 'react';
import { checkUserAuth, redirectToLogin } from '../services/authService';
import { AdminStream } from './AdminStream';
import { ViewerStream } from './ViewerStream';

type AppState = 'loading' | 'admin' | 'viewer' | 'error';

interface UserInfo {
    is_admin: boolean;
    role: string;
    name?: string;
}

export const StreamApp: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('loading');
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [error, setError] = useState<string>('');

    // Проверка аутентификации при загрузке
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const authResult = await checkUserAuth();
                
                if (authResult.success && authResult.user) {
                    setUserInfo(authResult.user);
                    setAppState(authResult.user.is_admin ? 'admin' : 'viewer');
                } else {
                    setError(authResult.error || 'Authentication failed');
                    setAppState('error');
                }
            } catch (err) {
                console.error('Auth check error:', err);
                setError('Failed to check authentication');
                setAppState('error');
            }
        };

        checkAuth();
    }, []);

    // Обработка выхода
    const handleExit = () => {
        // Очищаем состояние
        setUserInfo(null);
        setAppState('loading');
        
        // Перенаправляем на главную страницу сайта
        window.location.href = 'https://rifelli.ru/';
    };

    // Повторная попытка аутентификации
    const handleRetry = () => {
        setAppState('loading');
        setError('');
        window.location.reload();
    };

    // Экран загрузки
    if (appState === 'loading') {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                backgroundColor: '#f5f5f5'
            }}>
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: '24px', marginBottom: 16 }}>🔄</div>
                    <div style={{ fontSize: '18px', marginBottom: 8 }}>Проверка доступа...</div>
                    <div style={{ color: '#666' }}>Подождите, идет аутентификация</div>
                </div>
            </div>
        );
    }

    // Экран ошибки
    if (appState === 'error') {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                backgroundColor: '#f5f5f5'
            }}>
                <div style={{ 
                    textAlign: 'center', 
                    padding: 40,
                    backgroundColor: 'white',
                    borderRadius: 8,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    maxWidth: 400
                }}>
                    <div style={{ fontSize: '48px', marginBottom: 16 }}>🚫</div>
                    <h2 style={{ color: '#d32f2f', marginBottom: 16 }}>Ошибка доступа</h2>
                    <p style={{ color: '#666', marginBottom: 24 }}>
                        {error.includes('Unauthorized') || error.includes('token') 
                            ? 'Необходимо войти в систему для доступа к стриму'
                            : `Ошибка: ${error}`
                        }
                    </p>
                    
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                        <button
                            onClick={() => redirectToLogin()}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            Войти в систему
                        </button>
                        
                        <button
                            onClick={handleRetry}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#4caf50',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            Попробовать снова
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Админская панель
    if (appState === 'admin' && userInfo) {
        return (
            <AdminStream 
                userName={userInfo.name || 'Администратор'} 
                onExit={handleExit}
            />
        );
    }

    // Просмотр стрима
    if (appState === 'viewer' && userInfo) {
        return (
            <ViewerStream 
                userName={userInfo.name || 'Зритель'} 
                onExit={handleExit}
            />
        );
    }

    // Fallback
    return (
        <div style={{ padding: 20, textAlign: 'center' }}>
            <div>Неизвестная ошибка приложения</div>
            <button onClick={handleRetry} style={{ marginTop: 16, padding: '8px 16px' }}>
                Перезагрузить
            </button>
        </div>
    );
}; 