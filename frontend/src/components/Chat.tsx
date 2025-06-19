import React, { useState, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

interface ChatMessage {
    id: string;
    userName: string;
    message: string;
    timestamp: Date;
}

interface ChatProps {
    socket: Socket | null;
    userName: string;
    roomId: string;
}

export const Chat: React.FC<ChatProps> = ({ socket, userName, roomId }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Автоскролл к последнему сообщению
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Слушаем входящие сообщения
    useEffect(() => {
        if (!socket) return;

        const handleChatMessage = (data: { userName: string; message: string; timestamp: string }) => {
            const chatMessage: ChatMessage = {
                id: Date.now().toString() + Math.random(),
                userName: data.userName,
                message: data.message,
                timestamp: new Date(data.timestamp),
            };
            setMessages(prev => [...prev, chatMessage]);
        };

        socket.on('chatMessage', handleChatMessage);

        return () => {
            socket.off('chatMessage', handleChatMessage);
        };
    }, [socket]);

    // Отправка сообщения
    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!socket || !newMessage.trim()) return;

        const messageData = {
            roomId,
            userName,
            message: newMessage.trim(),
            timestamp: new Date().toISOString(),
        };

        socket.emit('sendChatMessage', messageData);
        setNewMessage('');
    };

    // Форматирование времени
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: 8, 
            padding: 16, 
            marginTop: 32,
            maxWidth: 400,
            height: 400,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Чат</h4>
            
            {/* Область сообщений */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                marginBottom: 16,
                padding: 8,
                backgroundColor: '#f9f9f9',
                borderRadius: 4,
                border: '1px solid #eee'
            }}>
                {messages.length === 0 ? (
                    <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                        Пока нет сообщений
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} style={{ 
                            marginBottom: 12,
                            padding: 8,
                            backgroundColor: msg.userName === userName ? '#e3f2fd' : '#fff',
                            borderRadius: 4,
                            border: '1px solid #e0e0e0'
                        }}>
                            <div style={{ 
                                fontSize: '12px', 
                                color: '#666', 
                                marginBottom: 4,
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <strong>{msg.userName}</strong>
                                <span>{formatTime(msg.timestamp)}</span>
                            </div>
                            <div style={{ fontSize: '14px' }}>
                                {msg.message}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Форма отправки */}
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Введите сообщение..."
                    style={{
                        flex: 1,
                        padding: 8,
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        fontSize: '14px'
                    }}
                    maxLength={500}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: newMessage.trim() ? '#2196f3' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '14px'
                    }}
                >
                    Отправить
                </button>
            </form>
        </div>
    );
}; 