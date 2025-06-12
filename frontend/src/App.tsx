import React, { useState } from 'react';
import { Room } from './components/Room';
import { JoinForm } from './components/JoinForm';

/**
 * Корневой компонент приложения. Управляет экраном входа и состоянием комнаты.
 */
const App: React.FC = () => {
    // Состояния для входа и комнаты
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');
    const [joined, setJoined] = useState(false);

    // Обработчик входа из JoinForm
    const handleJoin = (room: string, user: string) => {
        setRoomId(room);
        setUserName(user);
        setJoined(true);
    };

    // Обработчик выхода из комнаты
    const handleExit = () => {
        setJoined(false);
    };

    return (
        <div className="container">
            {!joined ? (
                <JoinForm onJoin={handleJoin} />
            ) : (
                <Room roomId={roomId} userName={userName} onExit={handleExit} />
            )}
        </div>
    );
};

export default App;
