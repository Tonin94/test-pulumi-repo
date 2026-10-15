// Generato da cloud-pulumi: non modificare, viene riscritto a ogni generazione.
// Client per il servizio "worker-test".

export interface User {
  id: string;
  name: string | null;
  surname: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  name?: string | null;
  surname?: string | null;
  email?: string | null;
}

export type UserUpdate = Partial<UserInsert>;

export interface UserFilters {
  name?: string;
  surname?: string;
  email?: string;
}

export interface ListParams<F> {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
  filters?: F;
}

export interface ListResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

export interface ClientOptions {
  /** URL del Worker, es. https://worker-test.<subdominio>.workers.dev */
  baseUrl: string;
  fetch?: typeof fetch;
}

interface Resource<T, I, U, F> {
  list(params?: ListParams<F>): Promise<ListResult<T>>;
  get(id: string): Promise<T>;
  create(data: I): Promise<T>;
  update(id: string, data: U): Promise<T>;
  delete(id: string): Promise<void>;
}

export function createClient(options: ClientOptions) {
  const base = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));

  async function request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    const token = undefined;
    if (token) headers.authorization = "Bearer " + token;
    const qs = query && Object.keys(query).length > 0 ? "?" + new URLSearchParams(query).toString() : "";
    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await doFetch(base + path + qs, init);
    if (res.status === 204) return undefined as T;
    const data: unknown = await res.json().catch(() => undefined);
    if (!res.ok) {
      const message = (data as { error?: string } | undefined)?.error ?? res.statusText;
      throw new ApiError(res.status, message, data);
    }
    return data as T;
  }

  function toQuery<F>(params: ListParams<F>): Record<string, string> {
    const q: Record<string, string> = {};
    if (params.limit !== undefined) q.limit = String(params.limit);
    if (params.offset !== undefined) q.offset = String(params.offset);
    if (params.orderBy !== undefined) q.order_by = params.orderBy;
    if (params.order !== undefined) q.order = params.order;
    for (const [k, v] of Object.entries(params.filters ?? {})) {
      if (v !== undefined && v !== null) q[k] = String(v);
    }
    return q;
  }

  const resource =
    <T, I, U, F>() =>
    <K extends keyof Resource<T, I, U, F>>(path: string, operations: readonly K[]): Pick<Resource<T, I, U, F>, K> => {
      const item = (id: string) => path + "/" + encodeURIComponent(id);
      const all: Resource<T, I, U, F> = {
        list: (params = {}) => request("GET", path, undefined, toQuery(params)),
        get: (id) => request("GET", item(id)),
        create: (data) => request("POST", path, data),
        update: (id, data) => request("PATCH", item(id), data),
        delete: (id) => request("DELETE", item(id)),
      };
      return Object.fromEntries(operations.map((op) => [op, all[op]])) as Pick<Resource<T, I, U, F>, K>;
    };

  return {
    user: resource<User, UserInsert, UserUpdate, UserFilters>()("/user", ["list","get","create","update","delete"]),
  };
}
