import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Socket as SocketType } from 'socket.io-client';
import type { Device } from 'mediasoup-client';
import * as mediasoupClient from 'mediasoup-client';
type Transport = InstanceType<typeof mediasoupClient.types.Transport>;
type Producer = InstanceType<typeof mediasoupClient.types.Producer>;
type Consumer = InstanceType<typeof mediasoupClient.types.Consumer>;

export type MediaType = 'audio' | 'video' | 'screen';

export interface RoomClientOptions {
    roomId: string;
    userName: string;
}

export interface RoomClientState {
    joined: boolean;
    error?: string;
    deviceReady?: boolean;
    transportsReady?: boolean;
    audioActive?: boolean;
    videoActive?: boolean;
    screenActive?: boolean;
    // TODO: добавить состояния для remote media
}

// Типы для ответов сервера
interface ServerResponse<T = any> {
    error?: string;
    [key: string]: any;
}

interface RemoteStream {
    id: string;
    kind: 'audio' | 'video';
    stream: MediaStream;
}

/**
 * Хук для управления комнатой, медиа и участниками через mediasoup и socket.io.
 * Возвращает состояния, методы управления медиа, список участников и remote media.
 */
export function useRoomClient({ roomId, userName }: RoomClientOptions) {
    const [state, setState] = useState<RoomClientState>({ joined: false });
    const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
    const [participants, setParticipants] = useState<string[]>([]);
    const socketRef = useRef<SocketType | null>(null);
    const deviceRef = useRef<Device | null>(null);
    const producerTransportRef = useRef<Transport | null>(null);
    const consumerTransportRef = useRef<Transport | null>(null);
    const producersRef = useRef<{ [key in MediaType]?: Producer }>({});
    const consumersRef = useRef<{ [id: string]: Consumer }>({});
    const joinedRef = useRef(false);

    // Подключение к socket.io
    useEffect(() => {
        // Подключаемся к серверу socket.io
        const socket = io();
        socketRef.current = socket;
        return () => {
            // Отключаемся при размонтировании
            socket.disconnect();
        };
    }, [roomId, userName]);

    // Создание комнаты и вход
    const joinRoom = useCallback(() => {
        const socket = socketRef.current;
        if (!socket) return;
        if (joinedRef.current) return;
        joinedRef.current = true;

        // 1. Создать комнату (если не существует)
        socket.emit('createRoom', { room_id: roomId }, (response: ServerResponse) => {
            // Неважно, если "already exists"
            // 2. Войти в комнату
            socket.emit('join', { room_id: roomId, name: userName }, async (joinResp: ServerResponse) => {
                if (joinResp.error) {
                    setState(s => ({ ...s, error: joinResp.error }));
                    return;
                }
                setState(s => ({ ...s, joined: true, error: undefined }));
                // 3. Получить rtpCapabilities и создать Device
                try {
                    socket.emit('getRouterRtpCapabilities', {}, async (rtpCapabilities: any) => {
                        try {
                            const device = new mediasoupClient.Device();
                            await device.load({ routerRtpCapabilities: rtpCapabilities });
                            deviceRef.current = device;
                            setState(s => ({ ...s, deviceReady: true }));
                        } catch (err) {
                            setState(s => ({ ...s, error: 'Mediasoup device error: ' + (err instanceof Error ? err.message : String(err)) }));
                        }
                    });
                } catch (err) {
                    setState(s => ({ ...s, error: 'Failed to get RTP Capabilities' }));
                }
            });
        });
    }, [roomId, userName]);

    // Получение и обновление списка участников
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;
        const updateParticipants = () => {
            socket.emit('getMyRoomInfo', {}, (info: any) => {
                try {
                    const peers = info && info.peers ? JSON.parse(info.peers) : [];
                    setParticipants(peers.map(([, peer]: [string, any]) => peer.name));
                } catch {
                    setParticipants([]);
                }
            });
        };
        socket.on('newProducers', updateParticipants);
        socket.on('disconnect', () => setParticipants([]));
        updateParticipants();
        return () => {
            socket.off('newProducers', updateParticipants);
            socket.off('disconnect', () => setParticipants([]));
        };
    }, [state.joined]);

    // Создание WebRTC транспортов после deviceReady
    const startTransports = useCallback(() => {
        const socket = socketRef.current;
        const device = deviceRef.current;
        if (!socket || !device) return;

        // Producer Transport
        socket.emit('createWebRtcTransport', { forceTcp: false, rtpCapabilities: device.rtpCapabilities }, (data: any) => {
            if (data.error) {
                setState(s => ({ ...s, error: 'Producer transport error: ' + data.error }));
                return;
            }
            const producerTransport = device.createSendTransport(data);
            producerTransportRef.current = producerTransport;

            producerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                socket.emit('connectTransport', { dtlsParameters, transport_id: data.id }, (response: any) => {
                    if (response && response.error) errback(response.error);
                    else callback();
                });
            });

            producerTransport.on('connectionstatechange', (state) => {
                if (state === 'failed') {
                    producerTransport.close();
                }
            });

            // Consumer Transport
            socket.emit('createWebRtcTransport', { forceTcp: false }, (data2: any) => {
                if (data2.error) {
                    setState(s => ({ ...s, error: 'Consumer transport error: ' + data2.error }));
                    return;
                }
                const consumerTransport = device.createRecvTransport(data2);
                consumerTransportRef.current = consumerTransport;

                consumerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                    socket.emit('connectTransport', { dtlsParameters, transport_id: data2.id }, (response: any) => {
                        if (response && response.error) errback(response.error);
                        else callback();
                    });
                });

                consumerTransport.on('connectionstatechange', (state) => {
                    if (state === 'failed') {
                        consumerTransport.close();
                    }
                });

                setState(s => ({ ...s, transportsReady: true }));
            });
        });
    }, []);

    // Автоматически запускать создание транспортов после deviceReady
    useEffect(() => {
        if (state.joined && state.deviceReady && !state.transportsReady) {
            startTransports();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.joined, state.deviceReady]);

    // Публикация медиа
    const startMedia = useCallback(async (type: MediaType, deviceId?: string) => {
        const producerTransport = producerTransportRef.current;
        if (!producerTransport) return;
        let constraints: MediaStreamConstraints;
        if (type === 'audio') {
            constraints = { audio: deviceId ? { deviceId } : true, video: false };
        } else if (type === 'video') {
            constraints = { audio: false, video: deviceId ? { deviceId } : true };
        } else if (type === 'screen') {
            // Для экрана используем getDisplayMedia
            try {
                const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
                const track = stream.getVideoTracks()[0];
                const producer = await producerTransport.produce({ track });
                producersRef.current[type] = producer;
                setState(s => ({ ...s, screenActive: true }));
                return;
            } catch (err) {
                setState(s => ({ ...s, error: 'Screen share error: ' + (err instanceof Error ? err.message : String(err)) }));
                return;
            }
        } else {
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const track = type === 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
            const producer = await producerTransport.produce({ track });
            producersRef.current[type] = producer;
            setState(s => ({
                ...s,
                audioActive: type === 'audio' ? true : s.audioActive,
                videoActive: type === 'video' ? true : s.videoActive,
            }));
        } catch (err) {
            setState(s => ({ ...s, error: 'Media error: ' + (err instanceof Error ? err.message : String(err)) }));
        }
    }, []);

    // Остановка публикации медиа
    const stopMedia = useCallback((type: MediaType) => {
        const producer = producersRef.current[type];
        if (producer) {
            producer.close();
            delete producersRef.current[type];
            setState(s => ({
                ...s,
                audioActive: type === 'audio' ? false : s.audioActive,
                videoActive: type === 'video' ? false : s.videoActive,
                screenActive: type === 'screen' ? false : s.screenActive,
            }));
        }
    }, []);

    // --- Remote media: подписка на новых продюсеров и consume ---
    useEffect(() => {
        const socket = socketRef.current;
        const device = deviceRef.current;
        const consumerTransport = consumerTransportRef.current;
        if (!socket || !device || !consumerTransport) return;

        // Получить текущих продюсеров после входа
        socket.emit('getProducers');

        // Подписка на новых продюсеров
        const handleNewProducers = (producers: any[]) => {
            producers.forEach(async (producer: any) => {
                // Не подписываться на свои потоки
                if (producer.producer_socket_id === socket.id) return;
                // Уже подписан
                if (consumersRef.current[producer.producer_id]) return;
                // consume
                socket.emit('consume', {
                    consumerTransportId: consumerTransport.id,
                    producerId: producer.producer_id,
                    rtpCapabilities: device.rtpCapabilities,
                }, async (params: any) => {
                    if (params.error) return;
                    const consumer: Consumer = await consumerTransport.consume({
                        id: params.id,
                        producerId: params.producerId,
                        kind: params.kind,
                        rtpParameters: params.rtpParameters,
                    });
                    consumersRef.current[params.producerId] = consumer;
                    const stream = new MediaStream([consumer.track]);
                    setRemoteStreams(prev => ([...prev, { id: params.producerId, kind: params.kind, stream }]));
                    consumer.resume();
                });
            });
        };
        socket.on('newProducers', handleNewProducers);
        return () => {
            socket.off('newProducers', handleNewProducers);
        };
    }, [state.transportsReady]);

    return {
        state,
        joinRoom,
        startMedia,
        stopMedia,
        device: deviceRef.current,
        socket: socketRef.current,
        producerTransport: producerTransportRef.current,
        consumerTransport: consumerTransportRef.current,
        remoteStreams,
        participants,
    };
} 