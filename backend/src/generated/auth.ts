// Generato da cloud-pulumi: non modificare, viene riscritto a ogni generazione.
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./types";

/** Autenticazione disattivata: le API sono pubbliche. */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (_c, next) => {
  await next();
};
