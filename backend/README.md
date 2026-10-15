# worker-test

> Generato da cloud-pulumi: questo file viene riscritto a ogni generazione.

Backend su Cloudflare Workers + D1, con API CRUD generate dallo schema definito nella dashboard.

## Endpoint

```
GET    /health
GET    /user            lista (limit, offset, order_by, order, filtri per colonna)
GET    /user/:id        dettaglio
POST   /user            creazione
PATCH  /user/:id        modifica parziale
DELETE /user/:id        eliminazione
```

Le liste rispondono con `{ data, total, limit, offset }`. Errori: `{ error, issues? }` con status 400/401/404/409/500.

## Autenticazione

Nessuna: le API sono pubbliche.

## Struttura

- `src/generated/`: codice generato, **non modificare** (viene riscritto).
- `src/custom/hooks.ts`: hook per tabella (beforeCreate, afterUpdate, ...). Codice tuo.
- `src/custom/routes.ts`: route aggiuntive. Codice tuo.
- `migrations/`: migrations SQL, applicate dalla CI prima del deploy.
- `client/worker-test.ts` (dalla radice del repo): client tipizzato per il frontend.

## Sviluppo locale

```bash
npm install
npx wrangler d1 migrations apply test-pulumi --local
npm run dev
```

## Deploy

Automatico al merge su `main` (GitHub Actions): migrations D1 + `wrangler deploy`.
Serve il secret di repository `CLOUDFLARE_API_TOKEN`.
