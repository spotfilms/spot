# Базовый образ с Node.js 20 (Alpine для компактного размера)
FROM node:20-alpine

# Рабочая директория внутри контейнера
WORKDIR /usr/src/app

# Копируем манифесты и устанавливаем зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем весь исходный код
COPY . .

# Команда запуска бота
CMD ["node", "index.js"]
