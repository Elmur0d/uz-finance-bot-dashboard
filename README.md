# UzBiz Finance Bot + Dashboard

Production-style MVP for SMB finance control in Uzbekistan:
- Telegram bot (voice + text) for transaction logging and finance queries
- Multi-page dashboard (Overview, Transactions, Analytics, Categories)
- SQLite backend with real-time sync between bot and web
- Onboarding-friendly empty states and guided quick-add
- Extra feature: cashflow alert + runway estimation

## Run

1. Copy `.env.example` to `.env`
2. Fill `TELEGRAM_BOT_TOKEN` and optional `OPENAI_API_KEY`
3. Install dependencies:
   - `npm install`
4. Dev mode:
   - `npm run dev`
5. Production-like:
   - `npm run build`
   - `npm start`

Web app: `http://localhost:5173` in dev, API on `http://localhost:4000`.

## Bot examples

- `Received 500000 sales today`
- `Spent 120000 logistics for fuel`
- `How much did we earn this week?`
- `delete 12`

If category is missing, the bot asks a follow-up question and only saves after clarification.
