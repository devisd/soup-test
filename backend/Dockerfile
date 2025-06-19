# Мульти-стейдж сборка для mediasoup
# Стадия 1: Сборка зависимостей
FROM node:18 as builder

WORKDIR /app

# Установка системных зависимостей для компиляции mediasoup
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Создание символической ссылки python -> python3
RUN ln -s /usr/bin/python3 /usr/bin/python

# Копирование package files
COPY package*.json ./

# Установка всех зависимостей (включая dev для сборки)
RUN npm ci

# Стадия 2: Production образ
FROM node:18-slim

WORKDIR /app

# Установка только runtime зависимостей
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Копирование собранных node_modules из builder стадии
COPY --from=builder /app/node_modules ./node_modules

# Копирование package.json для npm start
COPY package*.json ./

# Копирование исходного кода и SSL папки
COPY src/ ./src/
COPY ssl/ ./ssl/

# Создание папки ssl если она пустая
RUN mkdir -p ssl

# Создание пользователя для безопасности
RUN groupadd -r mediasoup && useradd -r -g mediasoup mediasoup
RUN chown -R mediasoup:mediasoup /app
USER mediasoup

# Открытие портов
EXPOSE 3016
EXPOSE 10000-10100/udp

# Запуск приложения
CMD ["npm", "start"]