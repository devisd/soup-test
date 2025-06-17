# Этап сборки
FROM node:18-alpine as build

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build

# Этап production
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=build /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 