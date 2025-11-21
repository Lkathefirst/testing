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
    return ctx.reply("Доступ выдан. Можешь отправлять сообщения командой /msg.");
  }

  ctx.reply("Нет доступа.");
});

// ======== единственный способ отправить сообщение: /msg ========

bot.command("msg", async (ctx) => {
  if (!trusted.has(ctx.from.id)) {
    return ctx.reply("Нет доступа.");
  }

  const text = ctx.message.text.replace("/msg", "").trim();

  if (!text) {
    return ctx.reply("Нельзя отправить пустое сообщение.\nПример:\n/msg <wow boost> August 18–20");
  }

  try {
    await ctx.telegram.sendMessage(CHANNEL_ID, text);
    await ctx.reply("Сообщение отправлено в канал.");
  } catch (err) {
    console.error("Ошибка отправки:", err);
    ctx.reply("Ошибка при отправке в канал. Сообщи админу.");
  }
});

// ======== запрещаем любые другие сообщения ========

bot.on("message", (ctx) => {
  if (trusted.has(ctx.from.id)) {
    return ctx.reply("Чтобы отправить в канал, используй:\n/msg <текст>");
  }
});

// ======== запуск ========

bot.launch().then(() => {
  console.log("Бот запущен.");
}).catch((e) => {
  console.error("Ошибка запуска:", e);
});

// корректное завершение на Render
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
