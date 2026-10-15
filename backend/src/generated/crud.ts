// Generato da cloud-pulumi: non modificare, viene riscritto a ogni generazione.
import { Hono, type Context } from "hono";
import type { ZodType } from "zod";
import type { AppEnv } from "./types";

export type FieldKind = "text" | "integer" | "real" | "boolean" | "datetime" | "json";
export type CrudOperation = "list" | "get" | "create" | "update" | "delete";

export interface TableDef<Insert, Update> {
  table: string;
  /** Nome del binding D1 nell'env del Worker. */
  binding: string;
  /** Colonne definite dall'utente (id, created_at, updated_at sono gestite qui). */
  columns: Record<string, FieldKind>;
  insert: ZodType<Insert>;
  update: ZodType<Update>;
  operations: readonly CrudOperation[];
}

/** Hook opzionali per tabella: i before* possono trasformare i dati o lanciare HTTPException. */
export interface TableHooks<Row, Insert, Update> {
  beforeCreate?: (data: Insert, c: Context<AppEnv>) => Insert | Promise<Insert>;
  afterCreate?: (row: Row, c: Context<AppEnv>) => void | Promise<void>;
  beforeUpdate?: (id: string, data: Update, c: Context<AppEnv>) => Update | Promise<Update>;
  afterUpdate?: (row: Row, c: Context<AppEnv>) => void | Promise<void>;
  beforeDelete?: (id: string, c: Context<AppEnv>) => void | Promise<void>;
  afterDelete?: (id: string, c: Context<AppEnv>) => void | Promise<void>;
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
const MAX_LIMIT = 100;
const qi = (ident: string) => '"' + ident + '"';

function encode(kind: FieldKind, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (kind === "boolean") return value ? 1 : 0;
  if (kind === "json") return JSON.stringify(value);
  return value;
}

function decode<Row>(columns: Record<string, FieldKind>, row: Record<string, unknown>): Row {
  const out: Record<string, unknown> = { ...row };
  for (const [col, kind] of Object.entries(columns)) {
    const v = out[col];
    if (v === null || v === undefined) continue;
    if (kind === "boolean") out[col] = v === 1 || v === true;
    if (kind === "json" && typeof v === "string") out[col] = JSON.parse(v);
  }
  return out as Row;
}

/** Converte un filtro da query string nel valore da confrontare in SQL; undefined se non valido. */
function parseFilter(kind: FieldKind, raw: string): unknown {
  switch (kind) {
    case "integer":
    case "real": {
      const n = Number(raw);
      return raw.trim() !== "" && Number.isFinite(n) ? n : undefined;
    }
    case "boolean":
      return raw === "true" || raw === "1" ? 1 : raw === "false" || raw === "0" ? 0 : undefined;
    case "json":
      return undefined;
    default:
      return raw;
  }
}

function parseIntParam(raw: string | undefined, fallback: number, min: number, max: number): number | undefined {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

const isUniqueViolation = (err: unknown) => err instanceof Error && err.message.includes("UNIQUE constraint failed");

export function crudRoutes<Row, Insert extends object, Update extends object>(
  def: TableDef<Insert, Update>,
  hooks: TableHooks<Row, Insert, Update> = {},
) {
  const r = new Hono<AppEnv>();
  const T = qi(def.table);
  const db = (c: Context<AppEnv>) => (c.env as unknown as Record<string, D1Database>)[def.binding]!;
  const sortable = ["id", "created_at", "updated_at", ...Object.keys(def.columns).filter((k) => def.columns[k] !== "json")];
  const ops = new Set(def.operations);

  /** Colonne note presenti nei dati validati, con i valori già convertiti per SQLite. */
  const entries = (data: object) =>
    Object.entries(data).filter(([k, v]) => k in def.columns && v !== undefined) as [string, unknown][];

  if (ops.has("list")) {
    r.get("/", async (c) => {
      const q = c.req.query();
      const limit = parseIntParam(q.limit, 20, 1, MAX_LIMIT);
      const offset = parseIntParam(q.offset, 0, 0, Number.MAX_SAFE_INTEGER);
      if (limit === undefined || offset === undefined) {
        return c.json({ error: "limit (1-" + MAX_LIMIT + ") e offset (>= 0) devono essere interi" }, 400);
      }
      const orderBy = q.order_by ?? "created_at";
      if (!sortable.includes(orderBy)) return c.json({ error: "order_by non valido", allowed: sortable }, 400);
      if (q.order !== undefined && q.order !== "asc" && q.order !== "desc") {
        return c.json({ error: "order deve essere asc o desc" }, 400);
      }
      const order = q.order === "asc" ? "ASC" : "DESC";

      const where: string[] = [];
      const params: unknown[] = [];
      for (const [col, kind] of Object.entries(def.columns)) {
        const raw = q[col];
        if (raw === undefined) continue;
        const value = parseFilter(kind, raw);
        if (value === undefined) return c.json({ error: "Filtro non valido: " + col }, 400);
        where.push(qi(col) + " = ?");
        params.push(value);
      }
      const whereSql = where.length > 0 ? " WHERE " + where.join(" AND ") : "";

      const d = db(c);
      const [rows, count] = await d.batch([
        d
          .prepare("SELECT * FROM " + T + whereSql + " ORDER BY " + qi(orderBy) + " " + order + ", " + qi("id") + " LIMIT ? OFFSET ?")
          .bind(...params, limit, offset),
        d.prepare("SELECT COUNT(*) AS total FROM " + T + whereSql).bind(...params),
      ]);
      const total = (count!.results[0] as { total: number } | undefined)?.total ?? 0;
      const data = (rows!.results as Record<string, unknown>[]).map((row) => decode<Row>(def.columns, row));
      return c.json({ data, total, limit, offset });
    });
  }

  if (ops.has("get")) {
    r.get("/:id", async (c) => {
      const row = await db(c)
        .prepare("SELECT * FROM " + T + " WHERE " + qi("id") + " = ?")
        .bind(c.req.param("id"))
        .first<Record<string, unknown>>();
      if (!row) return c.json({ error: "Non trovato" }, 404);
      return c.json(decode<Row>(def.columns, row));
    });
  }

  if (ops.has("create")) {
    r.post("/", async (c) => {
      const parsed = def.insert.safeParse(await c.req.json().catch(() => undefined));
      if (!parsed.success) return c.json({ error: "Dati non validi", issues: parsed.error.issues }, 400);
      const data = hooks.beforeCreate ? await hooks.beforeCreate(parsed.data, c) : parsed.data;

      const cols = entries(data);
      const names = [qi("id"), ...cols.map(([k]) => qi(k))];
      const sql =
        "INSERT INTO " + T + " (" + names.join(", ") + ") VALUES (" + names.map(() => "?").join(", ") + ") RETURNING *";
      let row: Record<string, unknown> | null;
      try {
        row = await db(c)
          .prepare(sql)
          .bind(crypto.randomUUID(), ...cols.map(([k, v]) => encode(def.columns[k]!, v)))
          .first();
      } catch (err) {
        if (isUniqueViolation(err)) return c.json({ error: "Valore già presente in un campo univoco" }, 409);
        throw err;
      }
      const created = decode<Row>(def.columns, row!);
      await hooks.afterCreate?.(created, c);
      return c.json(created, 201);
    });
  }

  if (ops.has("update")) {
    r.patch("/:id", async (c) => {
      const id = c.req.param("id");
      const parsed = def.update.safeParse(await c.req.json().catch(() => undefined));
      if (!parsed.success) return c.json({ error: "Dati non validi", issues: parsed.error.issues }, 400);
      const data = hooks.beforeUpdate ? await hooks.beforeUpdate(id, parsed.data, c) : parsed.data;

      const cols = entries(data);
      if (cols.length === 0) return c.json({ error: "Nessun campo da aggiornare" }, 400);
      const set = [...cols.map(([k]) => qi(k) + " = ?"), qi("updated_at") + " = " + NOW];
      const sql = "UPDATE " + T + " SET " + set.join(", ") + " WHERE " + qi("id") + " = ? RETURNING *";
      let row: Record<string, unknown> | null;
      try {
        row = await db(c)
          .prepare(sql)
          .bind(...cols.map(([k, v]) => encode(def.columns[k]!, v)), id)
          .first();
      } catch (err) {
        if (isUniqueViolation(err)) return c.json({ error: "Valore già presente in un campo univoco" }, 409);
        throw err;
      }
      if (!row) return c.json({ error: "Non trovato" }, 404);
      const updated = decode<Row>(def.columns, row);
      await hooks.afterUpdate?.(updated, c);
      return c.json(updated);
    });
  }

  if (ops.has("delete")) {
    r.delete("/:id", async (c) => {
      const id = c.req.param("id");
      await hooks.beforeDelete?.(id, c);
      const row = await db(c)
        .prepare("DELETE FROM " + T + " WHERE " + qi("id") + " = ? RETURNING " + qi("id"))
        .bind(id)
        .first();
      if (!row) return c.json({ error: "Non trovato" }, 404);
      await hooks.afterDelete?.(id, c);
      return c.body(null, 204);
    });
  }

  return r;
}
