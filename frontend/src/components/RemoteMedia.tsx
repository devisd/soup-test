import React, { useEffect, useRef } from 'react';

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

    // Обновление srcObject для remote video/audio
    useEffect(() => {
        remoteStreams.forEach((remote) => {
            if (remote.kind === 'video' && remoteVideoRefs.current[remote.id]) {
                remoteVideoRefs.current[remote.id]!.srcObject = remote.stream;
            }
            if (remote.kind === 'audio' && remoteAudioRefs.current[remote.id]) {
                remoteAudioRefs.current[remote.id]!.srcObject = remote.stream;
            }
        });
    }, [remoteStreams]);

    return (
        <div style={{ marginTop: 32 }}>
            <h4>Remote Media</h4>
            {remoteStreams.map(remote =>
                remote.kind === 'video' ? (
                    <video
                        key={remote.id}
                        ref={el => (remoteVideoRefs.current[remote.id] = el)}
                        autoPlay
                        playsInline
                        style={{ width: 320, marginRight: 16 }}
                    />
                ) : (
                    <audio
                        key={remote.id}
                        ref={el => (remoteAudioRefs.current[remote.id] = el)}
                        autoPlay
                        controls
                        style={{ marginRight: 16 }}
                    />
                )
            )}
        </div>
    );
}; 