# Mediasoup React + TypeScript Room

## Описание

Это модуль для видеоконференций на базе [mediasoup](https://mediasoup.org/) и [socket.io], реализованный на React 18 + TypeScript. Поддерживает публикацию и приём аудио, видео, экрана, выбор устройств, отображение участников и потоков в реальном времени.

---

## Архитектура и структура

- **src/components/** — UI-компоненты:
  - `Room.tsx` — основной компонент комнаты
  - `DeviceSelector.tsx` — выбор микрофона и камеры
  - `ParticipantsList.tsx` — список участников
  - `MediaControls.tsx` — кнопки управления медиа
  - `LocalMedia.tsx` — отображение локальных потоков
  - `RemoteMedia.tsx` — отображение удалённых потоков
- **src/hooks/**
  - `useRoomClient.ts` — основной хук для работы с комнатой, медиа, участниками
- **src/utils/**
  - `mediaDevices.ts` — утилиты для работы с устройствами
- **src/App.tsx** — корневой компонент, экран входа и переключение между комнатой и формой

---

## Основные возможности

- Вход в комнату по ID и имени
- Выбор микрофона и камеры
- Публикация/остановка аудио, видео, экрана
- Отображение локальных и удалённых потоков
- Список участников в реальном времени
- Индикаторы загрузки, обработка ошибок
- Выход из комнаты с полной очисткой состояний

---

## Интеграция в другой React+TypeScript проект

### 1. Установка зависимостей

```
npm install react react-dom socket.io-client mediasoup-client
npm install --save-dev typescript @types/react @types/react-dom
```

### 2. Копирование файлов

- Скопируйте папки `components`, `hooks`, `utils` в ваш `src/`.
- Добавьте/обновите `App.tsx` или интегрируйте компонент `Room` в нужное место вашего приложения.

### 3. Использование компонента Room

```tsx
import { Room } from './components/Room';

function MyApp() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('123');
  const [userName, setUserName] = useState('user_1');

  return joined ? (
    <Room roomId={roomId} userName={userName} onExit={() => setJoined(false)} />
  ) : (
    <form onSubmit={() => setJoined(true)}>
      {/* ... поля для roomId и userName ... */}
      <button type="submit">Join</button>
    </form>
  );
}
```

### 4. Настройка backend

- Backend должен быть совместим с socket.io и mediasoup (пример — папка `backend/` из этого репозитория).
- Проверьте CORS, если фронтенд и бэкенд на разных доменах/портах.

### 5. Особенности и best practices

- Для production используйте HTTPS (иначе WebRTC не будет работать в большинстве браузеров).
- Для корректной работы устройств пользователь должен дать разрешение на доступ к микрофону/камере.
- Для масштабирования используйте отдельные rooms и worker'ы mediasoup.
- Все компоненты и хуки типизированы и легко расширяются под ваши задачи.

---

## Документация компонентов и хуков

- Все компоненты снабжены JSDoc-комментариями.
- Хук `useRoomClient` инкапсулирует всю логику работы с socket.io и mediasoup.
- Для расширения функционала (например, чат, запись, кастомные UI) — добавляйте новые компоненты и расширяйте хук.