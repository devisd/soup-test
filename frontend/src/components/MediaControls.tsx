import React from 'react';

/**
 * Компонент для управления медиа (аудио, видео, экран).
 * @param props.audioActive - активен ли микрофон
 * @param props.videoActive - активна ли камера
 * @param props.screenActive - активен ли шаринг экрана
 * @param props.onAudio - колбэк для старта/остановки аудио
 * @param props.onVideo - колбэк для старта/остановки видео
 * @param props.onScreen - колбэк для старта/остановки экрана
 * @param props.disabled - отключить все кнопки
 */
interface MediaControlsProps {
    audioActive: boolean;
    videoActive: boolean;
    screenActive: boolean;
    onAudio: () => void;
    onVideo: () => void;
    onScreen: () => void;
    disabled?: boolean;
}

export const MediaControls: React.FC<MediaControlsProps> = ({
    audioActive,
    videoActive,
    screenActive,
    onAudio,
    onVideo,
    onScreen,
    disabled,
}) => {
    return (
        <div style={{ margin: '24px 0' }}>
            <button onClick={onAudio} disabled={disabled} style={{ marginRight: 8 }}>
                {audioActive ? 'Stop Audio' : 'Start Audio'}
            </button>
            <button onClick={onVideo} disabled={disabled} style={{ marginRight: 8 }}>
                {videoActive ? 'Stop Video' : 'Start Video'}
            </button>
            <button onClick={onScreen} disabled={disabled}>
                {screenActive ? 'Stop Screen' : 'Start Screen'}
            </button>
        </div>
    );
}; 