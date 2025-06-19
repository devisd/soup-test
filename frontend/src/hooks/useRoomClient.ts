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
    localVideoRef?: React.RefObject<HTMLVideoElement>;
    localScreenRef?: React.RefObject<HTMLVideoElement>;
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
export function useRoomClient({ roomId, userName, localVideoRef, localScreenRef }: RoomClientOptions) {
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
        // Подключаемся к серверу socket.io через nginx proxy, используем только polling
        console.log('🔌 Connecting to Socket.IO server...');
        let socket = io('https://rifelli.ru', {
            path: '/video-api/socket.io/',  // ✅ ИСПРАВЛЕНО: Указываем путь отдельно
            forceNew: true,
            timeout: 20000,
            transports: ['polling'], // Используем только polling для стабильности
            autoConnect: true,
        });
        
        socket.on('connect', () => {
            console.log('✅ Socket connected successfully, ID:', socket.id);
        });
        
        socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected, reason:', reason);
        });
        
        socket.on('connect_error', (error) => {
            console.log('❌ Socket connection error:', error);
        });
        
        socketRef.current = socket;
        return () => {
            // Отключаемся при размонтировании
            console.log('🔌 Disconnecting socket...');
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
        console.log(`🎬 Starting ${type} media...`);
        console.log('📍 Refs available:', { localVideoRef: !!localVideoRef?.current, localScreenRef: !!localScreenRef?.current }); // ✅ Отладочный лог
        
        const producerTransport = producerTransportRef.current;
        if (!producerTransport) {
            console.log('❌ No producer transport available');
            setState(s => ({ ...s, error: 'Producer transport not ready' }));
            return;
        }

        // Проверяем что транспорты готовы
        if (!state.transportsReady) {
            console.log('❌ Transports not ready yet');
            setState(s => ({ ...s, error: 'Transports not ready yet' }));
            return;
        }

        let constraints: MediaStreamConstraints;
        if (type === 'audio') {
            constraints = { audio: deviceId ? { deviceId } : true, video: false };
        } else if (type === 'video') {
            constraints = { audio: false, video: deviceId ? { deviceId } : { width: 640, height: 480 } };
        } else if (type === 'screen') {
            // Для экрана используем getDisplayMedia
            try {
                console.log('🖥️ Requesting screen share...');
                const stream = await (navigator.mediaDevices as any).getDisplayMedia({ 
                    video: true,
                    audio: false 
                });
                const track = stream.getVideoTracks()[0];
                
                console.log('🎬 Screen track obtained, creating producer...');
                const producer = await producerTransport.produce({ track });
                producersRef.current[type] = producer;
                
                // ✅ Устанавливаем stream в локальный screen video элемент
                if (localScreenRef?.current) {
                    localScreenRef.current.srcObject = stream;
                    console.log('📺 Local screen srcObject set:', stream, localScreenRef.current); // ✅ Отладочный лог
                } else {
                    console.log('❌ localScreenRef.current is null'); // ✅ Отладочный лог
                }
                
                // Обработка остановки screen share
                track.addEventListener('ended', () => {
                    console.log('🛑 Screen share ended by user');
                    stopMedia('screen');
                });
                
                setState(s => ({ ...s, screenActive: true, error: undefined }));
                console.log('✅ Screen share started successfully');
                return;
            } catch (err) {
                console.log('❌ Screen share error:', err);
                setState(s => ({ ...s, error: 'Screen share error: ' + (err instanceof Error ? err.message : String(err)) }));
                return;
            }
        } else {
            return;
        }
        
        try {
            console.log(`🎥 Requesting ${type} media with constraints:`, constraints);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const track = type === 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
            
            if (!track) {
                throw new Error(`No ${type} track found`);
            }
            
            console.log(`🎬 ${type} track obtained, creating producer...`);
            const producer = await producerTransport.produce({ track });
            producersRef.current[type] = producer;
            
            // ✅ Устанавливаем stream в локальный video элемент для видео
            if (type === 'video' && localVideoRef?.current) {
                localVideoRef.current.srcObject = stream;
                console.log('📺 Local video srcObject set:', stream, localVideoRef.current); // ✅ Отладочный лог
            } else if (type === 'video') {
                console.log('❌ localVideoRef.current is null'); // ✅ Отладочный лог
            }
            
            setState(s => ({
                ...s,
                audioActive: type === 'audio' ? true : s.audioActive,
                videoActive: type === 'video' ? true : s.videoActive,
                error: undefined
            }));
            
            console.log(`✅ ${type} media started successfully`);
        } catch (err) {
            console.log(`❌ ${type} media error:`, err);
            setState(s => ({ ...s, error: `${type} error: ` + (err instanceof Error ? err.message : String(err)) }));
        }
    }, [state.transportsReady, localVideoRef, localScreenRef]);

    // Остановка публикации медиа
    const stopMedia = useCallback((type: MediaType) => {
        const producer = producersRef.current[type];
        if (producer) {
            console.log(`🛑 Stopping ${type} media, producer_id:`, producer.id);
            
            // ✅ Уведомляем сервер о закрытии producer
            const socket = socketRef.current;
            if (socket) {
                socket.emit('producerClosed', { producer_id: producer.id });
            }
            
            producer.close();
            delete producersRef.current[type];
            
            // ✅ Очищаем video элементы
            if (type === 'video' && localVideoRef?.current) {
                localVideoRef.current.srcObject = null;
            }
            if (type === 'screen' && localScreenRef?.current) {
                localScreenRef.current.srcObject = null;
            }
            
            setState(s => ({
                ...s,
                audioActive: type === 'audio' ? false : s.audioActive,
                videoActive: type === 'video' ? false : s.videoActive,
                screenActive: type === 'screen' ? false : s.screenActive,
            }));
        }
    }, [localVideoRef, localScreenRef]);

    // --- Remote media: подписка на новых продюсеров и consume ---
    useEffect(() => {
        const socket = socketRef.current;
        const device = deviceRef.current;
        const consumerTransport = consumerTransportRef.current;
        if (!socket || !device || !consumerTransport) return;

        // Получить текущих продюсеров после входа
        console.log('🔍 Requesting existing producers...');
        socket.emit('getProducers');

        // ✅ Дополнительный запрос producers через небольшую задержку
        // Это помогает зрителям получить producer'ы которые уже существуют
        const timeoutId = setTimeout(() => {
            console.log('🔍 Requesting producers again (delayed check)...');
            socket.emit('getProducers');
        }, 1000);

        // Подписка на новых продюсеров
        const handleNewProducers = (producers: any[]) => {
            console.log('📺 Received producers:', producers.length);
            producers.forEach(async (producer: any) => {
                // Не подписываться на свои потоки
                if (producer.producer_socket_id === socket.id) return;
                // Уже подписан
                if (consumersRef.current[producer.producer_id]) return;
                
                console.log('🎬 Consuming producer:', producer.producer_id);
                // consume
                socket.emit('consume', {
                    consumerTransportId: consumerTransport.id,
                    producerId: producer.producer_id,
                    rtpCapabilities: device.rtpCapabilities,
                }, async (params: any) => {
                    if (params.error) {
                        console.log('❌ Consume error:', params.error);
                        return;
                    }
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
                    console.log('✅ Consumer created and resumed:', params.producerId);
                });
            });
        };

        // ✅ Обработка закрытия producer у других участников
        const handleProducerClosed = ({ producer_id, peer_id }: { producer_id: string, peer_id: string }) => {
            console.log('🔴 Remote producer closed:', { producer_id, peer_id });
            
            // Закрываем consumer если он существует
            const consumer = consumersRef.current[producer_id];
            if (consumer) {
                console.log('🗑️ Closing consumer:', producer_id);
                consumer.close();
                delete consumersRef.current[producer_id];
            }
            
            // Удаляем stream из remote streams
            setRemoteStreams(prev => {
                const updated = prev.filter(stream => stream.id !== producer_id);
                console.log('📺 Updated remote streams count:', updated.length);
                return updated;
            });
        };

        socket.on('newProducers', handleNewProducers);
        socket.on('producerClosed', handleProducerClosed); // ✅ Добавляем обработчик

        return () => {
            socket.off('newProducers', handleNewProducers);
            socket.off('producerClosed', handleProducerClosed); // ✅ Убираем обработчик
            clearTimeout(timeoutId); // ✅ Очищаем timeout
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