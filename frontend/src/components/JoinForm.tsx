import React, { useState } from 'react';

/**
 * Форма входа в комнату с валидацией, обработкой ошибок и индикатором загрузки.
 * @param props.onJoin - callback с roomId и userName при успешной отправке формы
 */
interface JoinFormProps {
    onJoin: (roomId: string, userName: string) => void;
}

export const JoinForm: React.FC<JoinFormProps> = ({ onJoin }) => {
    // Состояния для полей формы
    const [roomId, setRoomId] = useState('123');
    const [userName, setUserName] = useState('user_' + Math.round(Math.random() * 1000));
    // Состояния для ошибок и загрузки
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    /**
     * Проверяет валидность полей формы
     */
    const validate = () => {
        if (!roomId.trim()) return 'Room ID не может быть пустым';
        if (!userName.trim()) return 'Имя пользователя не может быть пустым';
        if (userName.length > 32) return 'Имя пользователя слишком длинное';
        return null;
    };

    /**
     * Обработка отправки формы
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const err = validate();
        if (err) {
            setError(err);
            return;
        }
        setLoading(true);
        try {
            // Здесь можно добавить async-проверку (например, доступность комнаты)
            await new Promise(res => setTimeout(res, 300)); // имитация задержки
            onJoin(roomId, userName);
        } catch (e) {
            setError('Ошибка при входе. Попробуйте ещё раз.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginTop: 40, maxWidth: 400 }}>
            <label>
                Room:
                <input
                    type="text"
                    value={roomId}
                    onChange={e => setRoomId(e.target.value)}
                    style={{ marginLeft: 8, marginRight: 16 }}
                    disabled={loading}
                />
            </label>
            <label>
                User:
                <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    style={{ marginLeft: 8, marginRight: 16 }}
                    disabled={loading}
                />
            </label>
            <button type="submit" disabled={loading}>
                {loading ? 'Вход...' : 'Join'}
            </button>
            {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
        </form>
    );
}; 