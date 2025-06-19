import React from 'react';
import { StreamApp } from './components/StreamApp';

/**
 * Корневой компонент приложения. Управляет экраном входа и состоянием комнаты.
 */
function App() {
    return (
        <div className="App">
            <StreamApp />
        </div>
    );
}

export default App;
