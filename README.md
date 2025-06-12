# Видеоконференции на Mediasoup (React + TypeScript)

## Описание

Модуль для видеоконференций на базе [mediasoup](https://mediasoup.org/) и [socket.io], реализованный на React 18 + TypeScript. Поддерживает публикацию и приём аудио, видео, экрана, выбор устройств, отображение участников и потоков в реальном времени. Подходит для интеграции в современные проекты.

---

## Структура проекта

- `backend/` — серверная часть (Node.js, Express, Mediasoup, Socket.IO)
- `frontend/` — клиентская часть (React, TypeScript, Vite, компоненты)
  - `src/components/` — UI-компоненты (Room, JoinForm, DeviceSelector, MediaControls и др.)
  - `src/hooks/` — хуки (useRoomClient)
  - `src/utils/` — утилиты (работа с устройствами)

---

## Быстрый старт

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend (разработка)
```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173 (или порт, который покажет Vite).

---

## Использование и интеграция

- Используйте компонент `Room` в своём приложении, передавая ему roomId, userName и обработчик выхода.
- Для экрана входа используйте компонент `JoinForm`.
- Вся логика работы с медиа, участниками и потоками инкапсулирована в хуке `useRoomClient`.
- Для расширения (чат, запись, кастомный UI) — добавляйте новые компоненты и расширяйте хук.

### Пример интеграции
```tsx
import { Room } from './components/Room';
import { JoinForm } from './components/JoinForm';

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');

  return !joined ? (
    <JoinForm onJoin={(room, user) => { setRoomId(room); setUserName(user); setJoined(true); }} />
  ) : (
    <Room roomId={roomId} userName={userName} onExit={() => setJoined(false)} />
  );
};
```

---

## Деплой
- Для продакшена фронтенд можно собрать (`npm run build`) и деплоить как статику (на CDN, nginx и т.д.).
- Бэкенд запускается как отдельный сервис (например, через Docker).

---

## Настройки
- В файле `backend/src/config.js` можно изменить порты, IP-адреса и пути к SSL-сертификатам.
- Для работы по HTTPS используйте свои сертификаты в папке `backend/ssl/`.

---

## Примечания
- Для работы WebRTC и Mediasoup на сервере должны быть открыты порты, указанные в конфиге (по умолчанию 3016 и диапазон UDP 10000-10100).
- Рекомендуется запускать сервер на Linux. Для Windows используйте WSL.
- Для production обязательно используйте HTTPS.
- Все компоненты и хуки снабжены подробными комментариями и легко расширяются.

---

## Лицензия

Проект распространяется под лицензией Apache 2.0 (см. файл LICENSE).
