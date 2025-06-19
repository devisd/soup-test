# 🚀 Быстрое исправление Socket.IO проблем

## 🔍 Проблема
Socket.IO не может подключиться к backend из-за периодических падений mediasoup worker.

## 🎯 Быстрое решение

### 1. На сервере выполните:
```bash
chmod +x fix-worker-crash.sh
./fix-worker-crash.sh
```

### 2. В браузере:
- Очистите кэш: `Ctrl+Shift+R` (или `Cmd+Shift+R` на Mac)
- Перезагрузите страницу `https://rifelli.ru/video/`

### 3. Проверьте результат:
- Откройте консоль браузера (F12)
- Должно появиться: `✅ Socket connected successfully, ID: [socket-id]`

## 🔧 Что делает скрипт:
1. Останавливает все процессы PM2
2. Убивает зависшие mediasoup workers
3. Устанавливает net-tools для диагностики
4. Увеличивает системные лимиты
5. Перезапускает backend с улучшенным логированием
6. Тестирует Socket.IO подключение

## 📋 Мониторинг:
```bash
# Статус процессов
pm2 status

# Логи backend
pm2 logs mediasoup-backend

# Проверка портов
netstat -tlnp | grep :3016
```

## 🆘 Если не помогло:
```bash
# Полная диагностика
./debug-socket.sh

# Тест Socket.IO отдельно
# Откройте https://rifelli.ru/test-socket.html
``` 