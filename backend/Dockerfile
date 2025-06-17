FROM node:18-alpine

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Копирование исходного кода и SSL папки
COPY src/ ./src/
COPY ssl/ ./ssl/

# Создание папки ssl если она пустая
RUN mkdir -p ssl

# Открытие портов
EXPOSE 3016
EXPOSE 10000-10100/udp

# Запуск приложения
CMD ["npm", "start"]