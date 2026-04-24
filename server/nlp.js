const dayjs = require("dayjs");

function parseAmount(text) {
  const m = text.match(/(\d[\d\s,.]*)/);
  if (!m) return null;
  const cleaned = m[1].replace(/\s/g, "").replace(/,/g, ".");
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseDate(text) {
  const lowered = text.toLowerCase();
  if (lowered.includes("today") || lowered.includes("bugun")) return dayjs().format("YYYY-MM-DD");
  if (lowered.includes("yesterday") || lowered.includes("kecha")) {
    return dayjs().subtract(1, "day").format("YYYY-MM-DD");
  }
  const direct = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  const human = text.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
  if (!human) return dayjs().format("YYYY-MM-DD");
  const y = human[3] ? String(human[3]).padStart(4, "20") : String(dayjs().year());
  return dayjs(`${y}-${human[2].padStart(2, "0")}-${human[1].padStart(2, "0")}`).format(
    "YYYY-MM-DD"
  );
}

function detectType(text) {
  const t = text.toLowerCase();
  if (/(income|received|sale|earned|kirim|tushum|tushdi)/.test(t)) return "income";
  if (/(expense|spent|paid|cost|chiqim|to'lov|to‘lov|sarf)/.test(t)) return "expense";
  return null;
}

function detectIntent(text) {
  const t = text.toLowerCase();
  if (/(delete|remove|o'chir|o‘chir)/.test(t)) return "delete";
  if (/(edit|update|fix|correct|tuzat|yangila)/.test(t)) return "update";
  if (/(report|how much|qancha|summary|hisobot|analytics)/.test(t)) return "report";
  if (/(add|log|received|spent|income|expense|kirim|chiqim|tushum)/.test(t)) return "log";
  return "question";
}

function matchCategory(text, categories, type) {
  const t = text.toLowerCase();
  const typed = type ? categories.filter((c) => c.type === type) : categories;
  return typed.find((c) => t.includes(c.name.toLowerCase())) || null;
}

module.exports = { parseAmount, parseDate, detectType, detectIntent, matchCategory };
