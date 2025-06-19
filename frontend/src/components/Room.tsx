import React, { useRef, useState, useEffect } from 'react';
import { DeviceSelector } from './DeviceSelector';
import { ParticipantsList } from './ParticipantsList';
import { MediaControls } from './MediaControls';
import { LocalMedia } from './LocalMedia';
import { RemoteMedia } from './RemoteMedia';
import { Chat } from './Chat';
import { useRoomClient, MediaType } from '../hooks/useRoomClient';

/**
 * Основной компонент комнаты. Управляет всеми медиа, участниками, устройствами и выходом.
 * @param props.roomId - id комнаты
 * @param props.userName - имя пользователя
 * @param props.onExit - callback при выходе из комнаты
 */
interface RoomProps {
    roomId: string;
    userName: string;
    onExit: () => void;
}

export const Room: React.FC<RoomProps> = ({ roomId, userName, onExit }) => {
    // Состояния выбранных устройств
    const [audioDeviceId, setAudioDeviceId] = useState<string>('');
    const [videoDeviceId, setVideoDeviceId] = useState<string>('');

    // refs для локальных видео
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localScreenRef = useRef<HTMLVideoElement>(null);

    // Хук для работы с комнатой
    const {
        state,
        joinRoom,
        startMedia,
        stopMedia,
        remoteStreams,
        participants,
        socket,
    } = useRoomClient({ roomId, userName, localVideoRef, localScreenRef });

    // Автоматический вход в комнату при монтировании
    useEffect(() => {
        if (!state.joined) {
            console.log('🚀 Joining room:', roomId, 'as user:', userName);
            joinRoom();
        }
    }, [roomId, userName]);

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

    // Выход из комнаты: остановить все медиа и вызвать onExit
    const handleExit = () => {
        stopMedia('audio');
        stopMedia('video');
        stopMedia('screen');
        onExit();
    };

    return (
        <div style={{ marginTop: 40 }}>
            <h2>Room: {roomId}</h2>
            <h3>User: {userName}</h3>
            <button onClick={handleExit} style={{ marginBottom: 16 }}>Выйти</button>
            
            {/* Отладочная информация */}
            <div style={{ fontSize: '12px', color: '#666', marginBottom: 16 }}>
                Status: joined={String(state.joined)} | deviceReady={String(state.deviceReady)} | transportsReady={String(state.transportsReady)}
            </div>
            
            <DeviceSelector onAudioChange={setAudioDeviceId} onVideoChange={setVideoDeviceId} />
            <ParticipantsList participants={participants} />
            {isLoading && <div>Загрузка медиа...</div>}
            <MediaControls
                audioActive={!!state.audioActive}
                videoActive={!!state.videoActive}
                screenActive={!!state.screenActive}
                onAudio={() => state.audioActive ? stopMedia('audio') : handleStartMedia('audio')}
                onVideo={() => state.videoActive ? stopMedia('video') : handleStartMedia('video')}
                onScreen={() => state.screenActive ? stopMedia('screen') : handleStartMedia('screen')}
                disabled={!state.transportsReady}
            />
            
            {/* Основная область с медиа и чатом */}
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <LocalMedia
                        videoActive={!!state.videoActive}
                        screenActive={!!state.screenActive}
                        localVideoRef={localVideoRef}
                        localScreenRef={localScreenRef}
                    />
                    <RemoteMedia remoteStreams={remoteStreams} />
                </div>
                
                <Chat 
                    socket={socket} 
                    userName={userName} 
                    roomId={roomId} 
                />
            </div>
            
            {state.error && (
                <div style={{ color: 'red', marginTop: 16 }}>{state.error}</div>
            )}
        </div>
    );
}; 