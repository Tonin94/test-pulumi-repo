// Route aggiuntive scritte a mano (protette dalla stessa autenticazione delle API generate).
// Creato da cloud-pulumi una sola volta: è codice tuo, non viene mai sovrascritto.
import { Hono } from "hono";
import type { AppEnv } from "../generated/types";

export const customRoutes = new Hono<AppEnv>();

// customRoutes.get("/stats", async (c) => c.json({ ok: true }));
