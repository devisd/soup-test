#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏠 Запуск Mediasoup для локального тестирования${NC}"

# Получение локального IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -n 1 | awk '{print $2}')
echo -e "${YELLOW}📍 Ваш локальный IP: ${LOCAL_IP}${NC}"

# Создание SSL сертификатов
echo -e "${YELLOW}🔐 Создание SSL сертификатов...${NC}"
mkdir -p backend/ssl

if [ ! -f "backend/ssl/key.pem" ] || [ ! -f "backend/ssl/cert.pem" ]; then
    openssl req -new -x509 -keyout backend/ssl/key.pem -out backend/ssl/cert.pem -days 365 -nodes \
        -subj "/C=RU/ST=Moscow/L=Moscow/O=Mediasoup/OU=Dev/CN=${LOCAL_IP}"
    echo -e "${GREEN}✅ SSL сертификаты созданы для IP: ${LOCAL_IP}${NC}"
else
    echo -e "${GREEN}✅ SSL сертификаты уже существуют${NC}"
fi

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен!${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Установка зависимостей...${NC}"

# Установка зависимостей backend
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Установка зависимостей frontend
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

cd ..

echo -e "${GREEN}🚀 Запуск серверов...${NC}"
echo -e "${YELLOW}Backend запускается на: https://${LOCAL_IP}:3016${NC}"
echo -e "${YELLOW}Frontend запускается на: http://${LOCAL_IP}:5173${NC}"
echo ""

# Запуск backend в фоне
cd backend
nohup npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend запущен (PID: ${BACKEND_PID})${NC}"

# Ожидание запуска backend
sleep 5

# Запуск frontend
cd ../frontend
echo -e "${GREEN}✅ Запуск Frontend...${NC}"
echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}🎉 Сервера запущены!${NC}"
echo -e "${BLUE}===========================================${NC}"
echo -e "${YELLOW}🌐 Для тестирования откройте:${NC}"
echo -e "${GREEN}   • На этом компьютере: http://localhost:5173${NC}"
echo -e "${GREEN}   • На других устройствах: http://${LOCAL_IP}:5173${NC}"
echo ""
echo -e "${YELLOW}📱 Инструкция для тестирования:${NC}"
echo -e "${GREEN}   1. Откройте http://${LOCAL_IP}:5173 на телефоне/планшете${NC}"
echo -e "${GREEN}   2. Используйте одинаковый ID комнаты на всех устройствах${NC}"
echo -e "${GREEN}   3. Используйте разные имена пользователей${NC}"
echo ""
echo -e "${YELLOW}🛑 Для остановки нажмите Ctrl+C${NC}"
echo -e "${BLUE}===========================================${NC}"

# Запуск frontend (блокирующий)
npm run dev

# Остановка backend при выходе
echo -e "${YELLOW}🛑 Остановка backend...${NC}"
kill $BACKEND_PID 2>/dev/null 