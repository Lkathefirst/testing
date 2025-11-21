require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs");

// переменные окружения
const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SECRET_KEY = process.env.SECRET_KEY;

if (!TOKEN || !CHANNEL_ID || !SECRET_KEY) {
  console.error("ERROR: BOT_TOKEN, CHANNEL_ID или SECRET_KEY не заданы");
  process.exit(1);
}

const bot = new Telegraf(TOKEN);

// ======== доверенные пользователи ========

let trusted = new Set();

function loadTrusted() {
  try {
    const data = fs.readFileSync("trusted.json", "utf8");
    trusted = new Set(JSON.parse(data));
  } catch (e) {
    trusted = new Set();
  }
}

function saveTrusted() {
  fs.writeFileSync("trusted.json", JSON.stringify([...trusted], null, 2));
}

loadTrusted();

// ======== /start с секретным параметром ========

bot.start((ctx) => {
  const parts = ctx.message.text.split(" ");

  if (parts.length > 1 && parts[1] === SECRET_KEY) {
    trusted.add(ctx.from.id);
    saveTrusted();
    return ctx.reply("Доступ выдан. Используй команду /msg для отправки сообщений.");
  }

  ctx.reply("Нет доступа.");
});


// ======== команда /msg — единственный способ отправить сообщение в канал ========

bot.command("msg", async (ctx) => {
  if (!trusted.has(ctx.from.id)) {
    return ctx.reply("Нет доступа.");
  }

  const raw = ctx.message.text.replace("/msg", "").trim();

  if (!raw) {
    return ctx.reply(
      `Нельзя отправить пустое сообщение.\n\nПример:\n/msg "wow boost" 18.11.2025-20.11.2025`
    );
  }

  // ищем keyword в кавычках
  const keywordMatch = raw.match(/"([^"]+)"/);
  const keyword = keywordMatch ? keywordMatch[1] : "keyword not found";

  // итоговое сообщение для канала
  const fullMessage =
    `${raw}\n\n` +
    `новый спам-репорт.\n\n` +
    `чтобы зарепортить:\n` +
    `1. переходим по ссылке https://search.google.com/search-console/report-spam?hl=en\n` +
    `2. url: https://kingboost.net\n` +
    `3. выбираем "other"\n` +
    `4. в появившемся окне пишем keyword: ${keyword}\n` +
    `5. добавляем сообщеине в произвольной форме, например: "скачок поисковых запросов с 20 до 500 с 18 по 20 августа 2025 года"\n\n` +
    `добавляйте всё что можете в запрос что может улучшить его содержание: насколько выросли показы, что причин для роста не было, через 1–2 дня кол-во запросов вернулось на свое место, и т.д.`;

  try {
    await ctx.telegram.sendMessage(CHANNEL_ID, fullMessage);
    await ctx.reply("Сообщение отправлено в канал.");
  } catch (err) {
    console.error("Ошибка отправки:", err);
    ctx.reply("Ошибка при отправке в канал. Сообщи админу.");
  }
});


// ======== любые сообщения без /msg ========

bot.on("message", (ctx) => {
  if (!trusted.has(ctx.from.id)) return ctx.reply("Нет доступа.");

  return ctx.reply(
    `сообщения в канал отправляются только через /msg.\n\n` +
    `ваше сообщение должно быть формата:\n` +
    `/msg "keyword" "date"\n\n` +
    `пример:\n/msg "wow boost" 18.11.2025-20.11.2025`
  );
});


// ======== запуск ========

bot.launch().then(() => {
  console.log("Бот запущен.");
}).catch((e) => {
  console.error("Ошибка запуска:", e);
});

// корректное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
