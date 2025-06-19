# 🚀 Инструкция по деплою Mediasoup на сервер

## 📋 Предварительные требования

### На сервере должно быть установлено:
- **Ubuntu 20.04+** (или другой Linux дистрибутив)
- **Docker** версии 20.10+
- **Docker Compose** версии 1.29+
- **Git** для клонирования репозитория
- **Openssl** для создания SSL сертификатов

## 🔧 Подготовка сервера

### 1. Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Установка Docker
```bash
# Удаление старых версий
sudo apt-get remove docker docker-engine docker.io containerd runc

# Установка зависимостей
sudo apt-get install apt-transport-https ca-certificates curl gnupg lsb-release

# Добавление официального GPG ключа Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавление репозитория Docker
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Установка Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4. Настройка firewall (UFW)
```bash
# Установка UFW (если не установлен)
sudo apt install ufw

# Разрешение SSH
sudo ufw allow ssh

# Разрешение HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Разрешение портов для Mediasoup
sudo ufw allow 3016/tcp
sudo ufw allow 10000:10100/udp

# Включение firewall
sudo ufw enable
```

## 📦 Деплой проекта

### 1. Клонирование репозитория
```bash
git clone <ВАШ_РЕПОЗИТОРИЙ_URL>
cd soup-test
```

### 2. Автоматический деплой (рекомендуется)
```bash
./deploy.sh
```

### 3. Ручной деплой (альтернативный способ)
```bash
# Создание SSL сертификатов
mkdir -p backend/ssl
openssl req -new -x509 -keyout backend/ssl/key.pem -out backend/ssl/cert.pem -days 365 -nodes \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=Mediasoup/OU=Dev/CN=$(curl -s ifconfig.me)"

# Запуск проекта
docker-compose up --build -d

# Проверка статуса
docker-compose ps
```

## 🌐 Настройка домена и SSL (для production)

### 1. Настройка DNS
Добавьте A-запись в настройках домена:
```
Type: A
Name: @
Value: IP_АДРЕС_ВАШЕГО_СЕРВЕРА
```

### 2. Получение Let's Encrypt сертификата
```bash
# Установка Certbot
sudo apt install certbot

# Остановка контейнеров
docker-compose down

# Получение сертификата
sudo certbot certonly --standalone -d ваш-домен.com

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/ваш-домен.com/privkey.pem backend/ssl/key.pem
sudo cp /etc/letsencrypt/live/ваш-домен.com/fullchain.pem backend/ssl/cert.pem
sudo chown $USER:$USER backend/ssl/*.pem

# Перезапуск контейнеров
docker-compose up -d
```

## 🧪 Тестирование

### 1. Локальное тестирование
После успешного деплоя:
- Откройте `http://IP_СЕРВЕРА` в браузере
- Создайте комнату с любым названием
- Введите имя пользователя
- Нажмите "Присоединиться"

### 2. Многопользовательское тестирование
1. Откройте **несколько вкладок** или используйте **разные браузеры**
2. В каждой вкладке:
   - Используйте **одинаковый ID комнаты**
   - Используйте **разные имена пользователей**
   - Присоединитесь к комнате
3. Тестируйте функции:
   - ✅ Видео передача между участниками
   - ✅ Аудио передача
   - ✅ Демонстрация экрана
   - ✅ Отключение/включение камеры
   - ✅ Отключение/включение микрофона

### 3. Тестирование с разных устройств
- Используйте **смартфоны** и **планшеты**
- Подключайтесь по **локальной сети**: `http://IP_СЕРВЕРА`
- Тестируйте **качество связи** и **задержку**

## 📊 Мониторинг и логи

### Просмотр логов
```bash
# Все логи
docker-compose logs -f

# Логи только backend
docker-compose logs -f backend

# Логи только frontend
docker-compose logs -f frontend

# Последние 100 строк логов
docker-compose logs --tail=100
```

### Проверка ресурсов
```bash
# Использование ресурсов контейнерами
docker stats

# Статус контейнеров
docker-compose ps
```

## 🔧 Управление проектом

### Перезапуск сервисов
```bash
# Перезапуск всех сервисов
docker-compose restart

# Перезапуск только backend
docker-compose restart backend

# Перезапуск только frontend
docker-compose restart frontend
```

### Обновление проекта
```bash
# Остановка контейнеров
docker-compose down

# Обновление кода
git pull

# Пересборка и запуск
docker-compose up --build -d
```

### Полная очистка
```bash
# Остановка и удаление контейнеров
docker-compose down --volumes --remove-orphans

# Удаление неиспользуемых образов
docker system prune -a
```

## 🐛 Решение проблем

### Проблема: Контейнеры не запускаются
```bash
# Проверка логов
docker-compose logs

# Проверка портов
sudo netstat -tulpn | grep -E ':(80|3016|10000)'

# Освобождение портов при необходимости
sudo lsof -ti:80 | xargs sudo kill -9
```

### Проблема: WebRTC не работает
1. Проверьте открытые порты в firewall
2. Убедитесь, что используется HTTPS (для production)
3. Проверьте настройки NAT на роутере

### Проблема: SSL сертификаты
```bash
# Пересоздание самоподписанных сертификатов
rm -f backend/ssl/*.pem
openssl req -new -x509 -keyout backend/ssl/key.pem -out backend/ssl/cert.pem -days 365 -nodes \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=Mediasoup/OU=Dev/CN=$(curl -s ifconfig.me)"
docker-compose restart backend
```

### Backend не запускается
```bash
# Проверка логов
docker-compose -f docker-compose.prod.yml logs backend

# Если ошибка компиляции mediasoup - пересоберите с очисткой кеша
docker-compose -f docker-compose.prod.yml build --no-cache backend
docker-compose -f docker-compose.prod.yml up -d backend

# Проверка использования ресурсов (mediasoup требует много памяти)
docker stats
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs -f`
2. Убедитесь в доступности портов
3. Проверьте настройки firewall
4. Убедитесь в корректности SSL сертификатов 

## Безопасная интеграция с существующим бэкендом

⚠️ **ВАЖНО**: Новая конфигурация nginx НЕ затронет ваш существующий бэкенд! 

Mediasoup работает по отдельным путям:
- 🌐 **Frontend**: `https://rifelli.ru/video/`
- 🔌 **Socket.IO**: `https://rifelli.ru/video-api/socket.io/`
- 📡 **API**: `https://rifelli.ru/video-api/`

Ваш существующий бэкенд остается нетронутым на корневом домене.

## Быстрый деплой

1. **Запустите автоматический скрипт деплоя:**
   ```bash
   ./deploy-server.sh
   ```

2. **Обновите nginx конфигурацию:**
   ```bash
   sudo cp nginx-mediasoup.conf /etc/nginx/conf.d/mediasoup.conf
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Добавьте настройки вашего бэкенда в nginx-mediasoup.conf:**
   ```nginx
   # Пример для вашего существующего API
   location /api/ {
       proxy_pass http://localhost:YOUR_BACKEND_PORT;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   
   # Пример для статических файлов
   location / {
       root /var/www/your-app;
       try_files $uri $uri/ /index.html;
   }
   ```

4. **Перезагрузите nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

## Архитектура

```
🌐 https://rifelli.ru/
├── /                    → Ваш существующий бэкенд
├── /api/               → Ваш существующий API
├── /privacy/           → Существующая privacy страница
├── /video/             → Mediasoup видеоконференции
└── /video-api/         → Mediasoup API и Socket.IO
```

## Локальное тестирование

```bash
./local-test.sh
```

Приложение будет доступно по адресу: `http://YOUR_LOCAL_IP:5173`

## Архитектура решения

### Backend (Node.js + mediasoup)
- **Порт**: 3016 (HTTPS)
- **WebRTC порты**: 10000-10100 (UDP)
- **Технологии**: Express, Socket.IO, mediasoup
- **SSL**: Let's Encrypt сертификаты

### Frontend (React + TypeScript)
- **Порт**: 8080 (внутри контейнера 80)
- **Технологии**: React 18, TypeScript, Vite, mediasoup-client
- **Сборка**: Multi-stage Docker с nginx

### Nginx Proxy
- **Frontend**: `/video/` → `http://localhost:8080`
- **Socket.IO**: `/video-api/socket.io/` → `https://localhost:3016`
- **API**: `/video-api/` → `https://localhost:3016`

## Функции

✅ **Видеоконференции**
- Аудио/видео связь
- Демонстрация экрана
- Множественные участники
- Адаптивный интерфейс

✅ **Технические особенности**
- WebRTC через mediasoup
- Real-time коммуникация через Socket.IO
- TypeScript для type safety
- Docker контейнеризация
- SSL/HTTPS поддержка

## Управление

### Запуск
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Остановка
```bash
docker-compose -f docker-compose.prod.yml down
```

### Логи
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Рестарт
```bash
docker-compose -f docker-compose.prod.yml restart
```

## Мониторинг

### Проверка статуса
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Мониторинг ресурсов
```bash
docker stats
```

### Проверка портов
```bash
netstat -tlnp | grep -E "80|3016|10000"
```

## Безопасность

- ✅ HTTPS везде
- ✅ Let's Encrypt сертификаты
- ✅ Изолированная Docker сеть
- ✅ Минимальные права доступа
- ✅ Разделение на отдельные пути

## Устранение проблем

### Backend не запускается
```bash
docker-compose -f docker-compose.prod.yml logs backend
```

### Frontend недоступен
```bash
docker-compose -f docker-compose.prod.yml logs frontend
curl -I http://localhost:8080
```

### WebRTC не работает
1. Проверьте UDP порты 10000-10100
2. Убедитесь, что SSL сертификаты валидны
3. Проверьте firewall настройки

### Socket.IO проблемы
```bash
curl -k https://localhost:3016/socket.io/
```

## Производительность

### Оптимизация mediasoup
- Настройка `numWorkers` по количеству CPU
- Оптимизация `rtcMinPort`/`rtcMaxPort` диапазона
- Настройка битрейта `maxIncomingBitrate`

### Мониторинг нагрузки
```bash
# CPU и память
htop
# Сетевая активность
iftop
# Docker статистика
docker stats
```

---

🎉 **Готово!** Ваш существующий бэкенд работает как прежде, а видеоконференции доступны по адресу `https://rifelli.ru/video/` 