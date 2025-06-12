import React from 'react';

/**
 * Компонент для отображения локальных медиа-потоков (видео, экран).
 * @param props.videoActive - активна ли камера
 * @param props.screenActive - активен ли шаринг экрана
 * @param props.localVideoRef - ref на video-элемент камеры
 * @param props.localScreenRef - ref на video-элемент экрана
 */
interface LocalMediaProps {
    videoActive: boolean;
    screenActive: boolean;
    localVideoRef: React.RefObject<HTMLVideoElement>;
    localScreenRef: React.RefObject<HTMLVideoElement>;
}

export const LocalMedia: React.FC<LocalMediaProps> = ({
    videoActive,
    screenActive,
    localVideoRef,
    localScreenRef,
}) => {
    return (
        <div style={{ marginTop: 32 }}>
            <h4>Local Media</h4>
            {videoActive && (
                <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 320, marginRight: 16 }} />
            )}
            {screenActive && (
                <video ref={localScreenRef} autoPlay playsInline muted style={{ width: 320 }} />
            )}
        </div>
    );
}; 