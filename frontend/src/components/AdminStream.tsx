import React, { useRef, useState, useEffect } from 'react';
import { DeviceSelector } from './DeviceSelector';
import { MediaControls } from './MediaControls';
import { LocalMedia } from './LocalMedia';
import { Chat } from './Chat';
import { useRoomClient, MediaType } from '../hooks/useRoomClient';

interface AdminStreamProps {
    userName: string;
    onExit: () => void;
}

const STREAM_ROOM_ID = 'main-stream'; // ✅ Единственная комната для стрима

export const AdminStream: React.FC<AdminStreamProps> = ({ userName, onExit }) => {
    const [audioDeviceId, setAudioDeviceId] = useState<string>('');
    const [videoDeviceId, setVideoDeviceId] = useState<string>('');
    const [streamStarted, setStreamStarted] = useState(false);

    // refs для локальных видео
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localScreenRef = useRef<HTMLVideoElement>(null);

    // Хук для работы с комнатой
    const {
        state,
        joinRoom,
        startMedia,
        stopMedia,
        socket,
    } = useRoomClient({ 
        roomId: STREAM_ROOM_ID, 
        userName: `👑 ${userName}`, // Префикс для админа
        localVideoRef, 
        localScreenRef 
    });

    // Автоматический вход в комнату при монтировании
    useEffect(() => {
        if (!state.joined) {
            console.log('🚀 Admin joining stream room');
            joinRoom();
        }
    }, [state.joined, joinRoom]);

    // Индикаторы загрузки
    const isLoading = !state.deviceReady || !state.transportsReady;

    // Управление медиа с учётом выбранных устройств
    const handleStartMedia = async (type: MediaType) => {
        if (type === 'audio') {
            await startMedia('audio', audioDeviceId);
        } else if (type === 'video') {
            await startMedia('video', videoDeviceId);
        } else {
            await startMedia(type);
        }
    };

    // Начать стрим
    const startStream = async () => {
        if (streamStarted) return;
        
        try {
            // Включаем видео и аудио
            await handleStartMedia('video');
            await handleStartMedia('audio');
            setStreamStarted(true);
            
            // Уведомляем backend о начале стрима
            if (socket) {
                socket.emit('streamStarted', { roomId: STREAM_ROOM_ID });
            }
        } catch (error) {
            console.error('Failed to start stream:', error);
        }
    };

    // Остановить стрим
    const stopStream = () => {
        stopMedia('audio');
        stopMedia('video');
        stopMedia('screen');
        setStreamStarted(false);
        
        // Уведомляем backend об остановке стрима
        if (socket) {
            socket.emit('streamStopped', { roomId: STREAM_ROOM_ID });
        }
    };

    // Выход из админки
    const handleExit = () => {
        if (streamStarted) {
            stopStream();
        }
        onExit();
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1>🎥 Админская панель стрима</h1>
                <button 
                    onClick={handleExit}
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
            
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#e8f5e8', borderRadius: 4 }}>
                <strong>Администратор:</strong> {userName}
            </div>

            {/* Статус подключения */}
            <div style={{ fontSize: '12px', color: '#666', marginBottom: 16 }}>
                Status: joined={String(state.joined)} | deviceReady={String(state.deviceReady)} | transportsReady={String(state.transportsReady)}
            </div>

            {isLoading && (
                <div style={{ padding: 20, textAlign: 'center' }}>
                    Подключение к серверу стрима...
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Управление стримом */}
                    <div style={{ marginBottom: 32, padding: 16, border: '2px solid #2196f3', borderRadius: 8 }}>
                        <h3>🎬 Управление стримом</h3>
                        
                        {!streamStarted ? (
                            <div>
                                <p>Выберите устройства и нажмите "Начать стрим"</p>
                                <DeviceSelector onAudioChange={setAudioDeviceId} onVideoChange={setVideoDeviceId} />
                                <button
                                    onClick={startStream}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#4caf50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        marginTop: 16
                                    }}
                                >
                                    🚀 Начать стрим
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: 16 }}>
                                    ✅ Стрим активен
                                </div>
                                
                                <MediaControls
                                    audioActive={!!state.audioActive}
                                    videoActive={!!state.videoActive}
                                    screenActive={!!state.screenActive}
                                    onAudio={() => state.audioActive ? stopMedia('audio') : handleStartMedia('audio')}
                                    onVideo={() => state.videoActive ? stopMedia('video') : handleStartMedia('video')}
                                    onScreen={() => state.screenActive ? stopMedia('screen') : handleStartMedia('screen')}
                                    disabled={false}
                                />
                                
                                <button
                                    onClick={stopStream}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        marginTop: 16
                                    }}
                                >
                                    ⏹️ Остановить стрим
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Основная область с превью и чатом */}
                    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <h4>Превью стрима</h4>
                            <LocalMedia
                                videoActive={!!state.videoActive}
                                screenActive={!!state.screenActive}
                                localVideoRef={localVideoRef}
                                localScreenRef={localScreenRef}
                            />
                        </div>
                        
                        <Chat 
                            socket={socket} 
                            userName={`👑 ${userName}`} 
                            roomId={STREAM_ROOM_ID} 
                        />
                    </div>
                </>
            )}

            {state.error && (
                <div style={{ color: 'red', marginTop: 16, padding: 12, backgroundColor: '#ffebee', borderRadius: 4 }}>
                    Ошибка: {state.error}
                </div>
            )}
        </div>
    );
}; 