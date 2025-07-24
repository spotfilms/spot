# Указываем базовый образ
FROM node:20-alpine

# Рабочая директория внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем все файлы проекта, включая папку prisma
COPY . .

# Открываем порт, на котором будет работать приложение
EXPOSE 4000


# Команда запуска бота
CMD ["node", "index.js"]
