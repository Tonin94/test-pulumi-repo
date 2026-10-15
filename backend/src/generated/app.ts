// Generato da cloud-pulumi: non modificare, viene riscritto a ogni generazione.
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { authMiddleware } from "./auth";
import { crudRoutes, type TableHooks } from "./crud";
import * as s from "./schema";
import type { AppEnv } from "./types";

export interface Hooks {
  user?: TableHooks<s.User, s.UserInsert, s.UserUpdate>;
}

export interface AppOptions {
  hooks?: Hooks;
}

/** App Hono con le API CRUD generate. Le route aggiunte dopo sono anch'esse protette dall'autenticazione. */
export function createApp(options: AppOptions = {}) {
  const hooks = options.hooks ?? {};
  const app = new Hono<AppEnv>();

  // Prima dell'autenticazione: usato per i controlli di salute.
  app.get("/health", (c) => c.json({ ok: true }));
  app.use("*", authMiddleware);

  app.route(
    "/user",
    crudRoutes(
      {
        table: "user",
        binding: "DB",
        columns: s.UserColumns,
        insert: s.UserInsert,
        update: s.UserUpdate,
        operations: ["list","get","create","update","delete"],
      },
      hooks.user,
    ),
  );

  app.notFound((c) => c.json({ error: "Non trovato" }, 404));
  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message || "Errore" }, err.status);
    console.error(err);
    return c.json({ error: "Errore interno" }, 500);
  });
  return app;
}
