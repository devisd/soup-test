import React from 'react';

/**
 * Компонент для отображения списка участников комнаты.
 * @param props.participants - массив имён участников
 */
interface ParticipantsListProps {
    participants: string[];
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ participants }) => {
    return (
        <div style={{ margin: '16px 0' }}>
            <h4>Участники ({participants.length}):</h4>
            <ul>
                {participants.map((name, idx) => (
                    <li key={idx}>{name}</li>
                ))}
            </ul>
        </div>
    );
}; 