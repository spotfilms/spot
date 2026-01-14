require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const nodemailer = require('nodemailer');

// Простая функция для логирования с временем
const log = (message) => {
  const time = new Date().toLocaleTimeString('ru-RU');
  console.log(`[${time}] ${message}`);
};

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- НАСТРОЙКИ ЯНДЕКСА ---
const transporter = nodemailer.createTransport({
  host: 'smtp.yandex.ru',
  port: 465,
  secure: true, // true для 465 порта
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Здесь должен быть ПАРОЛЬ ПРИЛОЖЕНИЯ
  },
});

// Проверка соединения с почтой при запуске
transporter.verify((error, success) => {
  if (error) {
    log(`❌ Ошибка подключения к почте (Yandex): ${error.message}`);
  } else {
    log('✅ Подключение к почте (Yandex) успешно установлено');
  }
});

// Хранилище сессий в памяти
const sessions = {};

// Запуск нового диалога
function startSession(ctx) {
  const id = ctx.chat.id;
  const username = ctx.from.username || ctx.from.first_name || 'Unknown';
  
  log(`Пользователь ${username} (${id}) начал оформление пропуска.`);
  
  sessions[id] = { step: 'await_plate' };
  
  ctx.reply(
    '👋 Давайте оформим пропуск.',
    Markup.removeKeyboard()
  );
  ctx.reply(
    'Отправьте один или несколько номеров авто в формате «Марка x000xx00» русскими буквами\n' +
    'Каждую строку — отдельным номером.\n\n' +
    'Пример:\nТайота A123ГД77\nАуди Ш456ЙЛ783'
  );
}

// /start
bot.start(ctx => startSession(ctx));

// Кнопка «Оформить пропуск»
bot.action('NEW_PASS', ctx => {
  ctx.answerCbQuery();
  startSession(ctx);
});

// Обработка текстовых сообщений
bot.on('text', async ctx => {
  const id = ctx.chat.id;
  const username = ctx.from.username || ctx.from.first_name || 'Unknown';
  const txt = ctx.message.text.trim();
  const session = sessions[id];

  // Логируем входящее сообщение (можно сократить, если сообщения длинные)
  log(`Сообщение от ${username} (${id}): "${txt.replace(/\n/g, ' | ')}"`);

  // Если диалог не начат — показываем кнопку
  if (!session) {
    return ctx.reply(
      'Нажмите кнопку ниже, чтобы оформить пропуск:',
      Markup.inlineKeyboard([
        Markup.button.callback('📝 Оформить пропуск', 'NEW_PASS')
      ])
    );
  }

  // Ждём номер(а) авто
  if (session.step === 'await_plate') {
    const plateRe = /^(\S+)\s+([A-ZА-Я]\d{3}[A-ZА-Я]{2}\d{2,3})$/iu;

    const lines = txt
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const validEntries = [];
    const invalidEntries = [];

    for (const line of lines) {
      const m = line.match(plateRe);
      if (m) {
        const brand = m[1];
        const plate = m[2].toUpperCase();
        validEntries.push(`${brand} ${plate}`);
      } else {
        invalidEntries.push(line);
      }
    }

    log(`Валидация для ${username}: Валидных=${validEntries.length}, Ошибочных=${invalidEntries.length}`);

    if (validEntries.length === 0) {
      log(`⚠️ Пользователь ${username} прислал некорректные данные.`);
      return ctx.reply(
        '❗ Ни одна строка не прошла проверку.\n' +
        'Формат: Марка A123BC77\n\nПример:\nToyota A123BC77'
      );
    }

    const date = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });

    const mailOpts = {
      from: `<${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: 'ООО СПОТ',
      text:
`Прошу оформить пропуск на въезд на ${date} для ООО СПОТ

${validEntries.join('\n')}

Эдуард
89778959600`
    };

    try {
      log(`📤 Отправка письма на ${process.env.EMAIL_TO}...`);
      await transporter.sendMail(mailOpts);
      log(`✅ Письмо успешно отправлено для пользователя ${username}.`);

      let reply = `✅ Отправлено авто: ${validEntries.length}`;
      if (invalidEntries.length > 0) {
        reply += `\n❌ Пропущены строки:\n${invalidEntries.join('\n')}`;
      }
      await ctx.reply(reply);
    } catch (err) {
      log(`🔥 Ошибка отправки письма: ${err.message}`);
      console.error(err); // Полный стек ошибки
      await ctx.reply('❌ Не удалось отправить заявку. Попробуйте позже.');
    }

    // Завершаем сессию и предлагаем кнопку
    delete sessions[id];
    return ctx.reply(
      'Если нужно оформить ещё один пропуск, нажмите кнопку ниже:',
      Markup.inlineKeyboard([
        Markup.button.callback('📝 Оформить пропуск', 'NEW_PASS')
      ])
    );
  }
});

// Запуск бота
bot.launch()
  .then(() => log('🤖 Бот успешно запущен и готов к работе'))
  .catch(err => log(`💀 Не удалось запустить бота: ${err.message}`));

// Обработка корректного завершения процесса (Ctrl+C)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
