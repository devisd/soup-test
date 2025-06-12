/**
 * Получить список аудио- и видео-устройств.
 */
export async function getMediaDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
        audio: devices.filter(d => d.kind === 'audioinput'),
        video: devices.filter(d => d.kind === 'videoinput'),
    };
}

/**
 * Подписаться на изменения устройств (например, при подключении/отключении).
 * @param callback - функция, вызываемая при изменении устройств
 */
export function subscribeToDeviceChange(callback: () => void) {
    navigator.mediaDevices.addEventListener('devicechange', callback);
    return () => {
        navigator.mediaDevices.removeEventListener('devicechange', callback);
    };
} 