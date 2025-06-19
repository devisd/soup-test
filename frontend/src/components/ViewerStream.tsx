import React, { useEffect, useState } from 'react';
import { RemoteMedia } from './RemoteMedia';
import { Chat } from './Chat';
import { useRoomClient } from '../hooks/useRoomClient';

interface ViewerStreamProps {
    userName: string;
    onExit: () => void;
}

const STREAM_ROOM_ID = 'main-stream'; // ✅ Единственная комната для стрима

export const ViewerStream: React.FC<ViewerStreamProps> = ({ userName, onExit }) => {
    const [streamActive, setStreamActive] = useState(false);

    // Хук для работы с комнатой (только для просмотра)
    const {
        state,
        joinRoom,
        socket,
        remoteStreams,
        participants,
    } = useRoomClient({ 
        roomId: STREAM_ROOM_ID, 
        userName: `👤 ${userName}` // Префикс для зрителя
    });

    // Автоматический вход в комнату при монтировании
    useEffect(() => {
        if (!state.joined) {
            console.log('🚀 Viewer joining stream room');
            joinRoom();
        }
    }, [state.joined, joinRoom]);

    // Слушаем события стрима
    useEffect(() => {
        if (!socket) return;

        const handleStreamStarted = () => {
            console.log('📺 Stream started');
            setStreamActive(true);
        };

        const handleStreamStopped = () => {
            console.log('📺 Stream stopped');
            setStreamActive(false);
        };

        socket.on('streamStarted', handleStreamStarted);
        socket.on('streamStopped', handleStreamStopped);

        return () => {
            socket.off('streamStarted', handleStreamStarted);
            socket.off('streamStopped', handleStreamStopped);
        };
    }, [socket]);

    // Определяем есть ли активный стрим по наличию remote streams
    useEffect(() => {
        const hasVideoStream = remoteStreams.some(stream => stream.kind === 'video');
        setStreamActive(hasVideoStream);
    }, [remoteStreams]);

    // Индикаторы загрузки
    const isLoading = !state.deviceReady || !state.transportsReady;

    // Найти админа в списке участников
    const adminName = participants.find(p => p.startsWith('👑'))?.replace('👑 ', '');

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1>📺 Просмотр стрима</h1>
                <button 
                    onClick={onExit}
                    style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#f44336', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 4,
                        cursor: 'pointer'
                    }}
                >
                    Выйти
                </button>
            </div>
            
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
                <strong>Зритель:</strong> {userName}
                {adminName && (
                    <span style={{ marginLeft: 16, color: '#666' }}>
                        Стример: {adminName}
                    </span>
                )}
            </div>

            {/* Статус подключения */}
            <div style={{ fontSize: '12px', color: '#666', marginBottom: 16 }}>
                Участников: {participants.length} | Подключение: {state.joined ? '✅' : '⏳'}
            </div>

            {isLoading && (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', marginBottom: 16 }}>Подключение к стриму...</div>
                    <div style={{ color: '#666' }}>Ожидание соединения с сервером</div>
                </div>
            )}

            {!isLoading && (
                <>
                    {!streamActive ? (
                        <div style={{ 
                            padding: 40, 
                            textAlign: 'center', 
                            backgroundColor: '#fff3e0', 
                            borderRadius: 8,
                            border: '2px solid #ff9800',
                            marginBottom: 32
                        }}>
                            <div style={{ fontSize: '24px', marginBottom: 16 }}>⏳</div>
                            <h3 style={{ color: '#e65100', marginBottom: 8 }}>Стрим еще не запущен</h3>
                            <p style={{ color: '#bf360c' }}>
                                Администратор пока не начал трансляцию. 
                                <br />Ожидайте начала стрима или воспользуйтесь чатом.
                            </p>
                        </div>
                    ) : (
                        <div style={{ 
                            padding: 16, 
                            backgroundColor: '#e8f5e8', 
                            borderRadius: 8,
                            border: '2px solid #4caf50',
                            marginBottom: 32
                        }}>
                            <div style={{ fontSize: '18px', color: '#2e7d32', fontWeight: 'bold' }}>
                                🔴 Стрим активен
                            </div>
                        </div>
                    )}

                    {/* Основная область с видео и чатом */}
                    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            {streamActive ? (
                                <div>
                                    <h3>📺 Прямая трансляция</h3>
                                    <RemoteMedia remoteStreams={remoteStreams} />
                                </div>
                            ) : (
                                <div style={{ 
                                    minHeight: 300, 
                                    backgroundColor: '#f5f5f5', 
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px dashed #ccc'
                                }}>
                                    <div style={{ textAlign: 'center', color: '#666' }}>
                                        <div style={{ fontSize: '48px', marginBottom: 16 }}>📺</div>
                                        <div>Видео появится здесь когда стрим начнется</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <Chat 
                            socket={socket} 
                            userName={`👤 ${userName}`} 
                            roomId={STREAM_ROOM_ID} 
                        />
                    </div>
                </>
            )}

            {state.error && (
                <div style={{ color: 'red', marginTop: 16, padding: 12, backgroundColor: '#ffebee', borderRadius: 4 }}>
                    Ошибка подключения: {state.error}
                </div>
            )}
        </div>
    );
}; 