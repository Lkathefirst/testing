require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID; // пример: "-1001234567890"
const SECRET_KEY = process.env.SECRET_KEY; // пример: "secret123"

if (!TOKEN || !CHANNEL_ID || !SECRET_KEY) {
  console.error("ERROR: One of BOT_TOKEN, CHANNEL_ID, SECRET_KEY is not set");
  process.exit(1);
}

const bot = new Telegraf(TOKEN);

// ======== хранение доверенных пользователей ========

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

// ======== /start с секретным ключом ========

bot.start((ctx) => {
  const parts = ctx.message.text.split(" ");

  if (parts.length > 1 && parts[1] === SECRET_KEY) {
    trusted.add(ctx.from.id);
    saveTrusted();
    return ctx.reply("Доступ выдан. Можешь отправлять сообщения.");
  }

  ctx.reply("У тебя нет доступа.");
});

// ======== команда /msg ========

bot.command("msg", async (ctx) => {
  if (!trusted.has(ctx.from.id)) {
    return ctx.reply("Нет доступа.");
  }

  const text = ctx.message.text.replace("/msg", "").trim();

  if (!text) {
    return ctx.reply("Нужно указать текст. Пример:\n/msg <wow boost> August 18–20");
  }

  try {
    await ctx.telegram.sendMessage(CHANNEL_ID, text);
    await ctx.reply("Сообщение отправлено.");
  } catch (e) {
    console.error("Ошибка отправки:", e);
    ctx.reply("Ошибка при отправке в канал.");
  }
});

// ======== команда /msg для публикаций ========

bot.command("msg", async (ctx) => {
  if (!trusted.has(ctx.from.id)) {
    return ctx.reply("Нет доступа.");
  }

  const text = ctx.message.text.replace("/msg", "").trim();

  if (!text) {
    return ctx.reply("Нужно указать текст. Пример:\n/msg <wow boost> August 18–20");
  }

  try {
    await ctx.telegram.sendMessage(CHANNEL_ID, text);
    await ctx.reply("Сообщение отправлено.");
  } catch (e) {
    console.error("Ошибка отправки:", e);
    ctx.reply("Ошибка при отправке в канал.");
  }
});


// ======== обработка текстовых сообщений ========

bot.on("text", async (ctx) => {
  if (!trusted.has(ctx.from.id)) {
    return ctx.reply("Нет доступа.");
  }

  const text = ctx.message.text;

  try {
    await ctx.telegram.sendMessage(CHANNEL_ID, text);
    await ctx.reply("Отправил в канал.");
  } catch (e) {
    console.error("Ошибка при отправке в канал:", e);
    await ctx.reply("Ошибка при отправке в канал. Сообщи админу.");
  }
});

// ======== запуск бота ========

bot.launch().then(() => {
  console.log("Бот запущен.");
}).catch((e) => {
  console.error("Ошибка при запуске бота:", e);
});

// Остановка по сигналам (чтобы Render корректно перезапускал)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
