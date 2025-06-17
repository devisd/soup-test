#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Запуск деплоя проекта Mediasoup...${NC}"

# Проверка наличия docker и docker-compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не установлен! Установите Docker и повторите попытку.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose не установлен! Установите Docker Compose и повторите попытку.${NC}"
    exit 1
fi

# Создание SSL сертификатов для разработки (самоподписанные)
echo -e "${YELLOW}🔐 Создание SSL сертификатов...${NC}"
mkdir -p backend/ssl

if [ ! -f "backend/ssl/key.pem" ] || [ ! -f "backend/ssl/cert.pem" ]; then
    openssl req -new -x509 -keyout backend/ssl/key.pem -out backend/ssl/cert.pem -days 365 -nodes \
        -subj "/C=RU/ST=Moscow/L=Moscow/O=Mediasoup/OU=Dev/CN=localhost"
    echo -e "${GREEN}✅ SSL сертификаты созданы${NC}"
else
    echo -e "${GREEN}✅ SSL сертификаты уже существуют${NC}"
fi

# Остановка и удаление старых контейнеров
echo -e "${YELLOW}🛑 Остановка старых контейнеров...${NC}"
docker-compose down --remove-orphans

# Сборка и запуск контейнеров
echo -e "${YELLOW}🏗️ Сборка и запуск контейнеров...${NC}"
docker-compose up --build -d

# Проверка статуса контейнеров
echo -e "${YELLOW}🔍 Проверка статуса контейнеров...${NC}"
sleep 10
docker-compose ps

# Вывод логов для диагностики
echo -e "${YELLOW}📋 Логи backend:${NC}"
docker-compose logs backend --tail=20

echo -e "${YELLOW}📋 Логи frontend:${NC}"
docker-compose logs frontend --tail=20

# Получение IP адреса сервера
SERVER_IP=$(curl -s ifconfig.me || curl -s ipecho.net/plain || echo "localhost")

echo -e "${GREEN}🎉 Деплой завершен!${NC}"
echo -e "${GREEN}🌐 Фронтенд доступен по адресу: http://${SERVER_IP}${NC}"
echo -e "${GREEN}🔧 Backend API доступен по адресу: https://${SERVER_IP}:3016${NC}"
echo -e "${YELLOW}📝 Для тестирования откройте несколько вкладок с фронтендом${NC}"
echo -e "${YELLOW}🔍 Логи: docker-compose logs -f${NC}"
echo -e "${YELLOW}🛑 Остановка: docker-compose down${NC}" 