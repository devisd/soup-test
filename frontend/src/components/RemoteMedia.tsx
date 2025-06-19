import React, { useEffect, useRef, useState } from 'react';

/**
 * Компонент для отображения удалённых медиа-потоков (видео, аудио).
 * @param props.remoteStreams - массив удалённых потоков
 */
interface RemoteStream {
    id: string;
    kind: 'audio' | 'video';
    stream: MediaStream;
}

interface RemoteMediaProps {
    remoteStreams: RemoteStream[];
}

export const RemoteMedia: React.FC<RemoteMediaProps> = ({ remoteStreams }) => {
    // refs для видео/аудио-элементов
    const remoteVideoRefs = useRef<{ [id: string]: HTMLVideoElement | null }>({});
    const remoteAudioRefs = useRef<{ [id: string]: HTMLAudioElement | null }>({});
    
    // ✅ Состояние для отслеживания видео которые нужно запустить вручную
    const [videosNeedingPlay, setVideosNeedingPlay] = useState<Set<string>>(new Set());

    // ✅ Отладочные логи
    useEffect(() => {
        console.log('📺 RemoteMedia: streams updated', {
            total: remoteStreams.length,
            video: remoteStreams.filter(s => s.kind === 'video').length,
            audio: remoteStreams.filter(s => s.kind === 'audio').length,
            streams: remoteStreams.map(s => ({ id: s.id, kind: s.kind, tracks: s.stream.getTracks().length }))
        });
    }, [remoteStreams]);

    // Обновление srcObject для remote video/audio
    useEffect(() => {
        remoteStreams.forEach((remote) => {
            if (remote.kind === 'video' && remoteVideoRefs.current[remote.id]) {
                console.log('🎥 Setting video srcObject for:', remote.id, remote.stream);
                
                // ✅ Проверяем треки в stream
                const videoTracks = remote.stream.getVideoTracks();
                console.log('🎬 Video tracks in stream:', {
                    count: videoTracks.length,
                    tracks: videoTracks.map(track => ({
                        id: track.id,
                        kind: track.kind,
                        enabled: track.enabled,
                        readyState: track.readyState,
                        settings: track.getSettings()
                    }))
                });
                
                remoteVideoRefs.current[remote.id]!.srcObject = remote.stream;
                
                // ✅ Проверяем состояние video элемента
                const videoEl = remoteVideoRefs.current[remote.id]!;
                videoEl.onloadedmetadata = () => {
                    console.log('📺 Video metadata loaded:', remote.id, {
                        videoWidth: videoEl.videoWidth,
                        videoHeight: videoEl.videoHeight,
                        duration: videoEl.duration
                    });
                    
                    // ✅ Принудительно запускаем видео
                    videoEl.play().then(() => {
                        console.log('▶️ Video play() successful:', remote.id);
                    }).catch((error) => {
                        console.log('❌ Video play() failed:', remote.id, error);
                        // ✅ Добавляем в список видео для ручного запуска
                        setVideosNeedingPlay(prev => new Set(prev).add(remote.id));
                    });
                };
                
                videoEl.onplay = () => {
                    console.log('▶️ Video started playing:', remote.id);
                };
                
                videoEl.onerror = (error) => {
                    console.log('❌ Video error:', remote.id, error);
                };
            }
            if (remote.kind === 'audio' && remoteAudioRefs.current[remote.id]) {
                console.log('🔊 Setting audio srcObject for:', remote.id, remote.stream);
                remoteAudioRefs.current[remote.id]!.srcObject = remote.stream;
            }
        });
    }, [remoteStreams]);

    // ✅ Функция для ручного запуска видео
    const playVideo = (streamId: string) => {
        const videoEl = remoteVideoRefs.current[streamId];
        if (videoEl) {
            videoEl.play().then(() => {
                console.log('▶️ Manual video play successful:', streamId);
                setVideosNeedingPlay(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(streamId);
                    return newSet;
                });
            }).catch((error) => {
                console.log('❌ Manual video play failed:', streamId, error);
            });
        }
    };

    if (remoteStreams.length === 0) {
        return (
            <div style={{ marginTop: 32 }}>
                <h4>Remote Media</h4>
                <div style={{ color: '#666', padding: 20 }}>Нет удалённых потоков</div>
            </div>
        );
    }

    return (
        <div style={{ marginTop: 32 }}>
            <h4>Remote Media ({remoteStreams.length} потоков)</h4>
            {remoteStreams.map(remote =>
                remote.kind === 'video' ? (
                    <div key={remote.id} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                            Video stream: {remote.id.substring(0, 8)}...
                        </div>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <video
                                ref={el => (remoteVideoRefs.current[remote.id] = el)}
                                autoPlay
                                playsInline
                                muted
                                style={{ width: 320, marginRight: 16, border: '2px solid #2196f3' }}
                            />
                            {/* ✅ Кнопка Play если нужно ручное воспроизведение */}
                            {videosNeedingPlay.has(remote.id) && (
                                <button
                                    onClick={() => playVideo(remote.id)}
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: 60,
                                        height: 60,
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ▶️
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div key={remote.id} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                            Audio stream: {remote.id.substring(0, 8)}...
                        </div>
                        <audio
                            ref={el => (remoteAudioRefs.current[remote.id] = el)}
                            autoPlay
                            controls
                            style={{ marginRight: 16 }}
                        />
                    </div>
                )
            )}
        </div>
    );
}; 