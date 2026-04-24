const { Telegraf } = require("telegraf");
const OpenAI = require("openai");
const dayjs = require("dayjs");
const { queries, normalizeDate } = require("./db");
const { detectIntent, detectType, matchCategory, parseAmount, parseDate } = require("./nlp");

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const pendingByChat = new Map();

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function textSummary(txn, categoryName) {
  return `Saved ${txn.type === "income" ? "income" : "expense"}: ${formatMoney(txn.amount)} UZS | ${categoryName} | ${txn.txn_date}${txn.note ? ` | "${txn.note}"` : ""}`;
}

async function transcribeVoice(bot, fileId) {
  if (!openai) return null;
  const link = await bot.telegram.getFileLink(fileId);
  const response = await fetch(link.toString());
  const buffer = Buffer.from(await response.arrayBuffer());
  const blob = new Blob([buffer], { type: "audio/ogg" });
  const file = new File([blob], "voice.ogg", { type: "audio/ogg" });
  const tr = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
  });
  return tr.text;
}

function createBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  bot.start((ctx) =>
    ctx.reply(
      "Salom! Send me voice or text to log income/expense.\nExamples:\n- Received 500000 sales today\n- Spent 120000 logistics for fuel\n- report this month"
    )
  );

  bot.on("voice", async (ctx) => {
    try {
      const text = await transcribeVoice(bot, ctx.message.voice.file_id);
      if (!text) {
        await ctx.reply("Voice transcription is disabled. Add OPENAI_API_KEY, or send text.");
        return;
      }
      await ctx.reply(`I heard: "${text}"`);
      await handleText(ctx, text);
    } catch (err) {
      await ctx.reply("Could not transcribe that voice note. Please retry or send text.");
    }
  });

  bot.on("text", async (ctx) => handleText(ctx, ctx.message.text));
  return bot;
}

async function handleText(ctx, text) {
  const chatId = ctx.chat.id;
  const lower = text.toLowerCase().trim();
  const pending = pendingByChat.get(chatId);

  if (pending?.kind === "needCategory") {
    const categories = queries.getCategories.all();
    const category = matchCategory(lower, categories, pending.draft.type);
    if (!category) {
      await ctx.reply("I still need a category. Example: Sales, Logistics, Salary.");
      return;
    }
    const txn = {
      ...pending.draft,
      category_id: category.id,
      txn_date: normalizeDate(pending.draft.txn_date),
      source: "telegram",
      created_by: String(chatId),
      created_at: dayjs().toISOString(),
    };
    queries.insertTxn.run(
      txn.amount,
      txn.type,
      txn.category_id,
      txn.note || null,
      txn.txn_date,
      txn.source,
      txn.created_by,
      txn.created_at
    );
    pendingByChat.delete(chatId);
    await ctx.reply(`Great, done.\n${textSummary(txn, category.name)}`);
    return;
  }

  const intent = detectIntent(lower);
  if (intent === "report" || lower.startsWith("how much")) {
    const now = dayjs();
    const start = lower.includes("week") ? now.startOf("week") : now.startOf("month");
    const txns = queries.listTxns.all(null, null, null, null, start.format("YYYY-MM-DD"), start.format("YYYY-MM-DD"), now.format("YYYY-MM-DD"), now.format("YYYY-MM-DD"), null, null);
    const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    await ctx.reply(`From ${start.format("DD MMM")} to today:\nIncome: ${formatMoney(income)} UZS\nExpense: ${formatMoney(expense)} UZS\nNet: ${formatMoney(income - expense)} UZS`);
    return;
  }

  if (intent === "delete") {
    const id = Number((text.match(/#?(\d+)/) || [])[1]);
    if (!id) {
      await ctx.reply("Tell me transaction ID to delete. Example: delete 17");
      return;
    }
    const txn = queries.getTxn.get(id);
    if (!txn) {
      await ctx.reply("I couldn't find that transaction.");
      return;
    }
    queries.deleteTxn.run(id);
    await ctx.reply(`Deleted transaction #${id}.`);
    return;
  }

  const categories = queries.getCategories.all();
  const amount = parseAmount(text);
  const type = detectType(text);
  const category = matchCategory(text, categories, type || undefined);
  const txnDate = parseDate(text);
  const note = text.length > 20 ? text : null;

  if (!amount || !type) {
    await ctx.reply("I couldn't fully understand. Include amount and type, e.g. 'Spent 120000 logistics today'.");
    return;
  }
  if (!category) {
    pendingByChat.set(chatId, { kind: "needCategory", draft: { amount, type, txn_date: txnDate, note } });
    await ctx.reply(`I got ${formatMoney(amount)} as ${type}. Which category should I use?`);
    return;
  }

  const txn = {
    amount,
    type,
    category_id: category.id,
    note,
    txn_date: normalizeDate(txnDate),
    source: "telegram",
    created_by: String(chatId),
    created_at: dayjs().toISOString(),
  };
  queries.insertTxn.run(
    txn.amount,
    txn.type,
    txn.category_id,
    txn.note || null,
    txn.txn_date,
    txn.source,
    txn.created_by,
    txn.created_at
  );
  await ctx.reply(textSummary(txn, category.name));
}

module.exports = { createBot };
