StockPilot Intelligence Safety Update

COPY SERVER FILES into stockpilot-api using the same relative paths under server/src/.
COPY CLIENT FILES into locasa/client using the same relative paths under client/src/.

Backend .env:
  Add a long random server-side secret:
  INTELLIGENCE_REFRESH_KEY=<generated-secret>

Generate one on macOS/Linux:
  openssl rand -hex 32

The monthly cron runs directly and does NOT need the header key.
Manual FMP refreshes are now blocked unless you send:
  x-intelligence-key: <INTELLIGENCE_REFRESH_KEY>

Manual rollback (NO FMP calls):
  npx tsx src/scripts/rollbackIntelligence.ts --yes

Or restore a specific completed readable run:
  npx tsx src/scripts/rollbackIntelligence.ts --yes --to RUN_ID

Do not run /api/stocks/intelligence/refresh just to apply this patch.