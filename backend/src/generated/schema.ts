// Generato da cloud-pulumi: non modificare, viene riscritto a ogni generazione.
import { z } from "zod";
import type { FieldKind } from "./crud";

// --- user ---

export interface User {
  id: string;
  name: string | null;
  surname: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export const UserInsert = z.strictObject({
  name: z.string().nullable().optional(),
  surname: z.string().nullable().optional(),
  email: z.email().nullable().optional(),
});
export type UserInsert = z.infer<typeof UserInsert>;

export const UserUpdate = UserInsert.partial();
export type UserUpdate = z.infer<typeof UserUpdate>;

export const UserColumns = {
  name: "text",
  surname: "text",
  email: "text",
} as const satisfies Record<string, FieldKind>;
