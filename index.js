require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const nodemailer    = require('nodemailer');

const bot = new Telegraf(process.env.BOT_TOKEN);

// SMTP‑транспорт для Gmail
const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Хранилище сессий в памяти
const sessions = {};

// Функция для старта новой сессии
function startSession(ctx) {
  const id = ctx.chat.id;
  sessions[id] = { step: 'await_plate' };
  ctx.reply(
    '👋 Давайте оформим пропуск.',
    Markup.removeKeyboard()
  );
  ctx.reply(
    'Шаг 1️⃣: отправьте номер авто в формате «Марка x000xx00»\n' +
    'Пример: Toyota A123BC77'
  );
}

// Обработчик команды /start
bot.start(ctx => {
  startSession(ctx);
});

// Обработчик нажатия на кнопку «Оформить пропуск»
bot.action('NEW_PASS', ctx => {
  ctx.answerCbQuery();        // убираем «часики»
  startSession(ctx);          // заново запускаем диалог
});

// Обработка любых текстовых сообщений
bot.on('text', async ctx => {
  const id  = ctx.chat.id;
  const txt = ctx.message.text.trim();
  const session = sessions[id];

  // Если сессии нет — приглашаем нажать на кнопку
  if (!session) {
    return ctx.reply(
      'Нажмите кнопку ниже, чтобы оформить пропуск:',
      Markup.inlineKeyboard([
        Markup.button.callback('📝 Оформить пропуск', 'NEW_PASS')
      ])
    );
  }

  // Шаг 1: ждём номер авто
  if (session.step === 'await_plate') {
    const plateRe = /^(\S+)\s+([A-ZА-Я]\d{3}[A-ZА-Я]{2}\d{2})$/iu;
    const m = txt.match(plateRe);
    if (!m) {
      return ctx.reply(
        '❗ Неверный формат номера.\n' +
        'Отправьте «Марка x000xx00»\n' +
        'Пример: Toyota A123BC77'
      );
    }
    session.brand = m[1];
    session.plate = m[2].toUpperCase();
    session.step  = 'await_date';
    return ctx.reply(
      'Отлично! ✅\n' +
      'Шаг 2️⃣: теперь введите дату пропуска в формате DD.MM.YY\n' +
      'Пример: 22.07.25'
    );
  }

  // Шаг 2: ждём дату
  if (session.step === 'await_date') {
    const dateRe = /^(\d{2}\.\d{2}\.\d{2})$/;
    const m = txt.match(dateRe);
    if (!m) {
      return ctx.reply(
        '❗ Неверный формат даты.\n' +
        'Отправьте в виде DD.MM.YY\n' +
        'Пример: 22.07.25'
      );
    }
    session.date = m[1];

    // Собираем и отправляем письмо
    const mailOpts = {
      from:    `<${process.env.EMAIL_USER}>`,
      to:      `<${process.env.EMAIL_TO}>`,
      subject: 'ООО СПОТ',
      text:
`Прошу оформить пропуск на въезд на ${session.date} для ООО СПОТ

${session.brand} ${session.plate}

Эдуард
89778959600`
    };

    try {
      await transporter.sendMail(mailOpts);
      await ctx.reply('✅ Заявка отправлена успешно!');
    } catch (err) {
      console.error('Ошибка отправки письма:', err);
      await ctx.reply('❌ Не удалось отправить заявку. Попробуйте позже.');
    }

    // Удаляем сессию и предлагаем кнопку для новой заявки
    delete sessions[id];
    return ctx.reply(
      'Если нужно оформить ещё один пропуск, нажмите кнопку ниже:',
      Markup.inlineKeyboard([
        Markup.button.callback('📝 Оформить пропуск', 'NEW_PASS')
      ])
    );
  }
});

bot.launch()
   .then(() => console.log('Бот запущен'))
   .catch(err => console.error('Не удалось запустить бота:', err));

// require('dotenv').config();

// const { Telegraf } = require('telegraf');
// const nodemailer    = require('nodemailer');

// const bot = new Telegraf(process.env.BOT_TOKEN);

// // SMTP‑транспорт для mail.ru / bk.ru
// const transporter = nodemailer.createTransport({
//   host:   'smtp.gmail.com',
//   port:   465,
//   secure: true,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // В памяти храним состояние каждого чата
// const sessions = {};

// // Обработчик команды /start
// bot.start(ctx => {
//   const id = ctx.chat.id;
//   sessions[id] = { step: 'await_plate' };
//   ctx.reply('Здравствуйте! 👋\nДавайте оформим пропуск.');
//   ctx.reply('Шаг 1️⃣: отправьте номер авто в формате «Марка x000xx00»\nПример: Toyota A123BC77');
// });

// // Обработка любых текстовых сообщений
// bot.on('text', async ctx => {
//   const id  = ctx.chat.id;
//   const txt = ctx.message.text.trim();
//   const session = sessions[id];

//   // Если пользователь не начал /start
//   if (!session) {
//     return ctx.reply('Чтобы начать, введите команду /start');
//   }

//   // Шаг 1: ждём номер авто
//   if (session.step === 'await_plate') {
//     const plateRe = /^(\S+)\s+([A-ZА-Я]\d{3}[A-ZА-Я]{2}\d{2})$/iu;
//     const m = txt.match(plateRe);
//     if (!m) {
//       return ctx.reply('Неверный формат номера.\nОтправьте «Марка x000xx00»\nПример: Toyota A123BC77');
//     }
//     session.brand = m[1];
//     session.plate = m[2].toUpperCase();
//     session.step  = 'await_date';
//     return ctx.reply(
//       'Отлично! ✅\n' +
//       'Шаг 2️⃣: теперь введите дату пропуска в формате DD.MM.YY\n' +
//       'Пример: 22.07.25'
//     );
//   }

//   // Шаг 2: ждём дату
//   if (session.step === 'await_date') {
//     const dateRe = /^(\d{2}\.\d{2}\.\d{2})$/;
//     const m = txt.match(dateRe);
//     if (!m) {
//       return ctx.reply('Неверный формат даты.\nОтправьте в виде DD.MM.YY\nПример: 22.07.25');
//     }
//     session.date = m[1];

//     // Всё есть — собираем и отправляем письмо
//     const mailOpts = {
//       from:    `<${process.env.EMAIL_USER}>`,
//       to:      'semyonvb@gmail.com',
//       subject: 'ООО СПОТ',
//       text:
// `Прошу оформить пропуск на въезд на ${session.date} для ООО СПОТ

// ${session.brand} ${session.plate}

// Эдуард
// 89778959600`
//     };

//     try {
//       await transporter.sendMail(mailOpts);
//       await ctx.reply('✅ Заявка отправлена успешно!');
//     } catch (err) {
//       console.error('Ошибка отправки письма:', err);
//       await ctx.reply('❌ Не удалось отправить заявку. Попробуйте позже.');
//     }

//     // Очищаем сессию
//     delete sessions[id];
//     return;
//   }
// });

// bot.launch()
//    .then(() => console.log('Бот запущен'))
//    .catch(err => console.error('Не удалось запустить бота:', err));


// require('dotenv').config();

// const { Telegraf } = require('telegraf');
// const nodemailer    = require('nodemailer');

// const bot = new Telegraf(process.env.BOT_TOKEN);

// // SMTP‑транспорт для mail.ru / bk.ru
// const transporter = nodemailer.createTransport({
//   host:   'smtp.mail.ru',
//   port:   465,
//   secure: true,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// bot.on('text', async (ctx) => {
//   const txt = ctx.message.text.trim();
//   // Ждём: Дата DD.MM.YY + пробел + Марка + пробел + номер x000xx00
//   const re = /^(\d{2}\.\d{2}\.\d{2})\s+(\S+)\s+([A-ZА-Я]\d{3}[A-ZА-Я]{2}\d{2})$/iu;
//   const m  = txt.match(re);

//   if (!m) {
//     return ctx.reply(
//       '❗ Неверный формат.\n' +
//       'Отправьте: Дата DD.MM.YY и «Марка x000xx00» через пробел\n' +
//       'Пример: 22.07.25 Toyota A123BC77'
//     );
//   }

//   const [ , date, brand, plateRaw ] = m;
//   const plate = plateRaw.toUpperCase();

//   const mailOpts = {
//     from:    `"ООО СПОТ" <${process.env.EMAIL_USER}>`,
//     to:      'semyonvb@gmail.com',
//     subject: 'Запрос на пропуск',
//     text:
// `Прошу оформить пропуск на въезд на ${date} для ООО СПОТ

// ${brand} ${plate}

// Эдуард
// 89778959600`
//   };

//   try {
//     await transporter.sendMail(mailOpts);
//     await ctx.reply('✅ Заявка отправлена на pass@gintsvetmet.ru');
//   } catch (err) {
//     console.error('Ошибка отправки письма:', err);
//     await ctx.reply('❌ Ошибка при отправке письма');
//   }
// });

// bot.launch()
//    .then(() => console.log('Бот запущен'))
//    .catch(err => console.error('Не удалось запустить бота:', err));
