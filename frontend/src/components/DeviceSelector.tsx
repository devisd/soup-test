import React, { useEffect, useState } from 'react';

/**
 * Компонент для выбора аудио- и видео-устройств пользователя.
 * @param props.onAudioChange - callback при выборе микрофона
 * @param props.onVideoChange - callback при выборе камеры
 */
interface DeviceSelectorProps {
    onAudioChange: (deviceId: string) => void;
    onVideoChange: (deviceId: string) => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({ onAudioChange, onVideoChange }) => {
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudio, setSelectedAudio] = useState('');
    const [selectedVideo, setSelectedVideo] = useState('');

    // Загружаем устройства при монтировании
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
            setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
        });
    }, []);

    // Обработка выбора микрофона
    const handleAudioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAudio(e.target.value);
        onAudioChange(e.target.value);
    };

    // Обработка выбора камеры
    const handleVideoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedVideo(e.target.value);
        onVideoChange(e.target.value);
    };

    return (
        <div style={{ margin: '16px 0' }}>
            <label>
                Микрофон:
                <select value={selectedAudio} onChange={handleAudioChange} style={{ marginLeft: 8, marginRight: 16 }}>
                    <option value="">По умолчанию</option>
                    {audioDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>{device.label || device.deviceId}</option>
                    ))}
                </select>
            </label>
            <label>
                Камера:
                <select value={selectedVideo} onChange={handleVideoChange} style={{ marginLeft: 8 }}>
                    <option value="">По умолчанию</option>
                    {videoDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>{device.label || device.deviceId}</option>
                    ))}
                </select>
            </label>
        </div>
    );
}; 