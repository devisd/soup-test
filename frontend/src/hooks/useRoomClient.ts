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
        // Подключаемся к серверу socket.io через proxy
        let socket = io({
            forceNew: true,
            timeout: 20000,
        });
        
        socket.on('connect', () => {
            console.log('✅ Socket connected successfully, ID:', socket.id);
        });
        
        socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected, reason:', reason);
        });
        
        socket.on('connect_error', (error) => {
            console.log('❌ Socket connection error:', error);
            // Если подключение через proxy не работает, пробуем прямое подключение
            socket.disconnect();
            socket = io('https://192.168.1.123:3016', {
                forceNew: true,
                timeout: 20000,
                rejectUnauthorized: false, // Игнорировать самоподписанные сертификаты
            });
            
            socket.on('connect', () => {
                console.log('✅ Direct socket connected successfully, ID:', socket.id);
            });
            
            socket.on('disconnect', (reason) => {
                console.log('❌ Direct socket disconnected, reason:', reason);
            });
            
            socketRef.current = socket;
        });
        
        socketRef.current = socket;
        return () => {
            // Отключаемся при размонтировании
            socket.disconnect();
        };
    }, [roomId, userName]);

    // Создание комнаты и вход
    const joinRoom = useCallback(() => {
        const socket = socketRef.current;
        if (!socket) {
            console.log('❌ No socket available');
            return;
        }
        if (joinedRef.current) {
            console.log('⚠️ Already joined');
            return;
        }
        
        console.log('🔄 Socket connected:', socket.connected);
        joinedRef.current = true;

        console.log('📞 Creating room:', roomId);
        // 1. Создать комнату (если не существует)
        socket.emit('createRoom', { room_id: roomId }, (response: ServerResponse) => {
            console.log('🏠 Create room response:', response);
            
            // 2. Войти в комнату
            console.log('🚪 Joining room:', roomId, 'as user:', userName);
            socket.emit('join', { room_id: roomId, name: userName }, async (joinResp: ServerResponse) => {
                console.log('✅ Join response:', joinResp);
                
                if (joinResp.error) {
                    console.log('❌ Join error:', joinResp.error);
                    setState(s => ({ ...s, error: joinResp.error }));
                    return;
                }
                setState(s => ({ ...s, joined: true, error: undefined }));
                
                // 3. Получить rtpCapabilities и создать Device
                console.log('🔧 Getting RTP capabilities...');
                try {
                    socket.emit('getRouterRtpCapabilities', {}, async (rtpCapabilities: any) => {
                        console.log('📡 RTP Capabilities received:', rtpCapabilities);
                        
                        try {
                            console.log('🎛️ Creating mediasoup device...');
                            const device = new mediasoupClient.Device();
                            await device.load({ routerRtpCapabilities: rtpCapabilities });
                            deviceRef.current = device;
                            console.log('✅ Device created successfully');
                            setState(s => ({ ...s, deviceReady: true }));
                        } catch (err) {
                            console.log('❌ Mediasoup device error:', err);
                            setState(s => ({ ...s, error: 'Mediasoup device error: ' + (err instanceof Error ? err.message : String(err)) }));
                        }
                    });
                } catch (err) {
                    console.log('❌ Failed to get RTP Capabilities:', err);
                    setState(s => ({ ...s, error: 'Failed to get RTP Capabilities' }));
                }
            });
        });
    }, [roomId, userName, state.joined]);

    // Сбрасываем joinedRef при смене комнаты/пользователя
    useEffect(() => {
        joinedRef.current = false;
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
        if (!socket || !device) {
            console.log('❌ No socket or device for transports');
            return;
        }

        console.log('🚛 Creating producer transport...');
        // Producer Transport
        socket.emit('createWebRtcTransport', { forceTcp: false, rtpCapabilities: device.rtpCapabilities }, (data: any) => {
            console.log('📤 Producer transport response:', data);
            
            if (data.error) {
                console.log('❌ Producer transport error:', data.error);
                setState(s => ({ ...s, error: 'Producer transport error: ' + data.error }));
                return;
            }
            const producerTransport = device.createSendTransport(data);
            producerTransportRef.current = producerTransport;
            console.log('✅ Producer transport created');

            producerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                console.log('🔗 Producer transport connecting...');
                socket.emit('connectTransport', { dtlsParameters, transport_id: data.id }, (response: any) => {
                    if (response && response.error) {
                        console.log('❌ Producer transport connect error:', response.error);
                        errback(response.error);
                    } else {
                        console.log('✅ Producer transport connected');
                        callback();
                    }
                });
            });

            producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                console.log('🎤 Producing media:', kind);
                try {
                    socket.emit('produce', {
                        producerTransportId: producerTransport.id,
                        kind,
                        rtpParameters,
                    }, (response: any) => {
                        if (response && response.error) {
                            console.log('❌ Produce error:', response.error);
                            errback(response.error);
                        } else {
                            console.log('✅ Produce success, producer_id:', response.producer_id);
                            callback({ id: response.producer_id });
                        }
                    });
                } catch (err) {
                    console.log('❌ Produce exception:', err);
                    errback(err);
                }
            });

            producerTransport.on('connectionstatechange', (state) => {
                console.log('📤 Producer transport state:', state);
                if (state === 'failed') {
                    producerTransport.close();
                }
            });

            console.log('🚛 Creating consumer transport...');
            // Consumer Transport
            socket.emit('createWebRtcTransport', { forceTcp: false }, (data2: any) => {
                console.log('📥 Consumer transport response:', data2);
                
                if (data2.error) {
                    console.log('❌ Consumer transport error:', data2.error);
                    setState(s => ({ ...s, error: 'Consumer transport error: ' + data2.error }));
                    return;
                }
                const consumerTransport = device.createRecvTransport(data2);
                consumerTransportRef.current = consumerTransport;
                console.log('✅ Consumer transport created');

                consumerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                    console.log('🔗 Consumer transport connecting...');
                    socket.emit('connectTransport', { dtlsParameters, transport_id: data2.id }, (response: any) => {
                        if (response && response.error) {
                            console.log('❌ Consumer transport connect error:', response.error);
                            errback(response.error);
                        } else {
                            console.log('✅ Consumer transport connected');
                            callback();
                        }
                    });
                });

                consumerTransport.on('connectionstatechange', (state) => {
                    console.log('📥 Consumer transport state:', state);
                    if (state === 'failed') {
                        consumerTransport.close();
                    }
                });

                console.log('🎉 All transports ready!');
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