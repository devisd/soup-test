#!/bin/bash

echo "🔄 Пересборка frontend..."
cd frontend && npm run build

echo "🚀 Перезапуск backend..."
cd .. && pm2 restart mediasoup-backend

echo "✅ Готово! Проверьте https://rifelli.ru/video/"
echo "🎥 Теперь локальное видео должно отображаться в секции 'Local Media'"
echo "📊 Следите за логами в консоли браузера" 