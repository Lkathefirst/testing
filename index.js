require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");

// ENV
const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SECRET_KEY = process.env.SECRET_KEY;

if (!TOKEN || !CHANNEL_ID || !SECRET_KEY) {
  console.error("ERROR: BOT_TOKEN, CHANNEL_ID или SECRET_KEY не заданы");
  process.exit(1);
}

const bot = new Telegraf(TOKEN);

// ===== доверенные =====

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

// ===== /start =====

bot.start((ctx) => {
  const parts = ctx.message.text.split(" ");

  if (parts.length > 1 && parts[1] === SECRET_KEY) {
    trusted.add(ctx.from.id);
    saveTrusted();
    return ctx.reply("Доступ выдан. Используй команду /msg.");
  }

  ctx.reply("Нет доступа.");
});

// ===== команда /msg =====

bot.command("msg", async (ctx) => {
  if (!trusted.has(ctx.from.id)) {
    return ctx.reply("Нет доступа.");
  }

  const raw = ctx.message.text.replace("/msg", "").trim();

  if (!raw) {
    return ctx.reply(
      `Формат:\n/msg "keyword" 18.11.2025-20.11.2025`
    );
  }

  // keyword = текст внутри кавычек
  const keywordMatch = raw.match(/"([^"]+)"/);
  const keyword = keywordMatch ? keywordMatch[1] : "keyword not found";

  // сообщение в канал
  const finalMessage = `${raw}\n\n(подробности по кнопке ниже)`;

  // кнопка
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback("Как зарепортить", `report_${keyword}`)
  ]);

  try {
    await ctx.telegram.sendMessage(CHANNEL_ID, finalMessage, keyboard);
    await ctx.reply("Сообщение отправлено.");
  } catch (err) {
    console.error("Ошибка отправки:", err);
    ctx.reply("Ошибка при отправке.");
  }
});

// ===== обработка кнопки =====

bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (!data.startsWith("report_")) return;

  const keyword = data.replace("report_", "").trim();

  const info =
    `чтобы зарепортить:\n\n` +
    `1. перейдите: https://search.google.com/search-console/report-spam?hl=en\n` +
    `2. url: https://kingboost.net\n` +
    `3. выберите "other"\n` +
    `4. keyword: ${keyword}\n` +
    `5. напишите, например: "скачок поисковых запросов с 20 до 500 с 18 по 20 августа 2025 года"\n\n` +
    `добавьте всё, что улучшает жалобу: рост показов, что причин нет, через 1–2 дня откатилось назад и т.д.`

  await ctx.answerCbQuery(info, { show_alert: true });
});

// ===== любые сообщения без /msg =====

bot.on("message", (ctx) => {
  if (!trusted.has(ctx.from.id)) return ctx.reply("Нет доступа.");

  return ctx.reply(
    `сообщения в канал отправляются только через /msg.\n\n` +
    `формат:\n/msg "keyword" 18.11.2025-20.11.2025`
  );
});

// ===== запуск =====

bot.launch();
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
