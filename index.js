// require('dotenv').config();

// const { Telegraf, Markup } = require('telegraf');
// const nodemailer    = require('nodemailer');

// const bot = new Telegraf(process.env.BOT_TOKEN);

// // SMTP‑транспорт для Gmail
// const transporter = nodemailer.createTransport({
//   host:   'smtp.gmail.com',
//   port:   465,
//   secure: true,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Хранилище сессий в памяти
// const sessions = {};

// // Запуск нового диалога
// function startSession(ctx) {
//   const id = ctx.chat.id;
//   sessions[id] = { step: 'await_plate' };
//   ctx.reply(
//     '👋 Давайте оформим пропуск.',
//     Markup.removeKeyboard()
//   );
//   ctx.reply(
//     'Отправьте номер авто в формате «Марка x000xx00»\n' +
//     'Пример: Toyota A123BC77'
//   );
// }

// // /start
// bot.start(ctx => startSession(ctx));

// // Кнопка «Оформить пропуск»
// bot.action('NEW_PASS', ctx => {
//   ctx.answerCbQuery();
//   startSession(ctx);
// });

// // Обработка текстовых сообщений
// bot.on('text', async ctx => {
//   const id      = ctx.chat.id;
//   const txt     = ctx.message.text.trim();
//   const session = sessions[id];

//   // Если диалог не начат — показываем кнопку
//   if (!session) {
//     return ctx.reply(
//       'Нажмите кнопку ниже, чтобы оформить пропуск:',
//       Markup.inlineKeyboard([
//         Markup.button.callback('📝 Оформить пропуск', 'NEW_PASS')
//       ])
//     );
//   }

//   // Ждём номер авто
//   if (session.step === 'await_plate') {
//     // Поддерживает регион из 2 или 3 цифр
//     const plateRe = /^(\S+)\s+([A-ZА-Я]\d{3}[A-ZА-Я]{2}\d{2,3})$/iu;
//     const m       = txt.match(plateRe);
//     if (!m) {
//       return ctx.reply(
//         '❗ Неверный формат номера.\n' +
//         'Отправьте «Марка x000xx00» или «Марка x000xx000»\n' +
//         'Пример: Toyota A123BC77 или Toyota A123BC077'
//       );
//     }

//     const brand = m[1];
//     const plate = m[2].toUpperCase();

//     // Подставляем сегодняшнюю дату
//     const date = new Date().toLocaleDateString('ru-RU', {
//       day:   '2-digit',
//       month: '2-digit',
//       year:  '2-digit'
//     });

//     // Подготовка письма
//     const mailOpts = {
//       from:    `<${process.env.EMAIL_USER}>`,
//       to:      process.env.EMAIL_TO,
//       subject: 'ООО СПОТ',
//       text:
// `Прошу оформить пропуск на въезд на ${date} для ООО СПОТ

// ${brand} ${plate}

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

//     // Завершаем сессию и предлагаем новую кнопку
//     delete sessions[id];
//     return ctx.reply(
//       'Если нужно оформить ещё один пропуск, нажмите кнопку ниже:',
//       Markup.inlineKeyboard([
//         Markup.button.callback('📝 Оформить пропуск', 'NEW_PASS')
//       ])
//     );
//   }
// });

// // Запуск бота
// bot.launch()
//    .then(() => console.log('Бот запущен'))
//    .catch(err => console.error('Не удалось запустить бота:', err));

require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const nodemailer = require('nodemailer');

const bot = new Telegraf(process.env.BOT_TOKEN);

// SMTP‑транспорт для Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Хранилище сессий в памяти
const sessions = {};

// Запуск нового диалога
function startSession(ctx) {
  const id = ctx.chat.id;
  sessions[id] = { step: 'await_plate' };
  ctx.reply(
    '👋 Давайте оформим пропуск.',
    Markup.removeKeyboard()
  );
  ctx.reply(
    'Отправьте один или несколько номеров авто в формате «Марка x000xx00»\n' +
    'Каждую строку — отдельным номером.\n\n' +
    'Пример:\nToyota A123BC77\nHyundai B456DE78'
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
  const txt = ctx.message.text.trim();
  const session = sessions[id];

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

    if (validEntries.length === 0) {
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
      await transporter.sendMail(mailOpts);

      let reply = `✅ Отправлено авто: ${validEntries.length}`;
      if (invalidEntries.length > 0) {
        reply += `\n❌ Пропущены строки:\n${invalidEntries.join('\n')}`;
      }
      await ctx.reply(reply);
    } catch (err) {
      console.error('Ошибка отправки письма:', err);
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
  .then(() => console.log('Бот запущен'))
  .catch(err => console.error('Не удалось запустить бота:', err));
