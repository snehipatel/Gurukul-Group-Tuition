import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type GateSession = { unlocked?: boolean };

async function session() {
  const { useSession } = await import("@tanstack/react-start/server");
  return useSession<GateSession>({
    password: process.env["SESSION_SECRET"] || "gurukul-group-tuition-session-secret-key-min-32-chars-long",
    name: "gurukul-owner",
    maxAge: 60 * 60 * 24 * 180,
    cookie: { httpOnly: true, secure: process.env["NODE_ENV"] === "production", sameSite: "lax", path: "/" },
  });
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function hashPin(pin: string, salt: string) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 120_000, hash: "SHA-256" }, material, 256);
  return Array.from(new Uint8Array(bits), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function requireUnlocked() {
  const s = await session();
  if (!s.data.unlocked) throw new Error("LOCKED");
}

export const getLockStatus = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data } = await db.from("app_secrets").select("key").eq("key", "pin").maybeSingle();
  const s = await session();
  return { hasPin: !!data, unlocked: !!s.data.unlocked && !!data };
});

const pinSchema = z.object({ pin: z.string().regex(/^\d{4,8}$/) });

export const unlockApp = createServerFn({ method: "POST" })
  .inputValidator((d) => pinSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db.from("app_secrets").select("value").eq("key", "pin").maybeSingle();
    const { data: attemptRow } = await db.from("app_secrets").select("value").eq("key", "pin_attempts").maybeSingle();
    const { data: untilRow } = await db.from("app_secrets").select("value").eq("key", "pin_locked_until").maybeSingle();
    if (Number(untilRow?.value ?? 0) > Date.now()) return { ok: false as const, locked: true as const };
    if (!row) {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const salt = Array.from(saltBytes, (value) => value.toString(16).padStart(2, "0")).join("");
      const h = await hashPin(data.pin, salt);
      const { error } = await db.from("app_secrets").insert({ key: "pin", value: `${salt}:${h}` });
      if (error) return { ok: false as const, locked: false as const };
    } else {
      const [salt, stored] = row.value.split(":");
      if (!salt || !stored || stored.length !== 64) return { ok: false as const, locked: false as const };
      const h = await hashPin(data.pin, salt);
      let diff = 0;
      for (let i = 0; i < stored.length; i++) diff |= h.charCodeAt(i) ^ stored.charCodeAt(i);
      if (diff !== 0) {
        const attempts = Number(attemptRow?.value ?? 0) + 1;
        await db.from("app_secrets").upsert({ key: "pin_attempts", value: String(attempts) });
        if (attempts >= 5) {
          await db.from("app_secrets").upsert({ key: "pin_locked_until", value: String(Date.now() + 60_000) });
          await db.from("app_secrets").upsert({ key: "pin_attempts", value: "0" });
          return { ok: false as const, locked: true as const };
        }
        return { ok: false as const, locked: false as const };
      }
      await db.from("app_secrets").upsert({ key: "pin_attempts", value: "0" });
    }
    const s = await session();
    await s.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockApp = createServerFn({ method: "POST" }).handler(async () => {
  const s = await session();
  await s.clear();
  return { ok: true };
});

export const loadAll = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const db = await admin();
  const rows: { collection: string; id: string; data: unknown }[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db.from("app_records").select("collection, id, data").range(start, start + 999);
    if (error) throw new Error("Could not load data");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const legacy = rows.find((row) => row.collection === "state" && row.id === "app");
  if (legacy && typeof legacy.data === "object" && legacy.data !== null) return { parts: JSON.stringify(legacy.data) };
  const state: Record<string, unknown> = {};
  const arrayNames = ["students", "faculty", "batches", "timetable", "attendance", "payments", "tests", "marks", "expenses", "feePlans", "salaries"];
  for (const name of arrayNames) state[name] = [];
  for (const row of rows) {
    if (arrayNames.includes(row.collection)) (state[row.collection] as unknown[]).push(row.data);
    else if (row.collection === "_meta") state[row.id] = row.data;
  }
  for (const name of arrayNames) (state[name] as { id: string }[]).sort((a, b) => (a.id || "").localeCompare(b.id || ""));
  return { parts: rows.length ? JSON.stringify(state) : null };
});

export const saveParts = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ parts: z.string().max(5_000_000) }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    let state: unknown;
    try {
      state = JSON.parse(data.parts);
    } catch {
      throw new Error("The saved information could not be read");
    }
    if (typeof state !== "object" || state === null || Array.isArray(state)) throw new Error("Invalid saved information");
    const record = state as Record<string, unknown>;
    const listKeys = ["students", "faculty", "batches", "timetable", "attendance", "payments", "tests", "marks", "expenses", "feePlans", "salaries"];
    const rows: { collection: string; id: string; data: unknown; updated_at: string }[] = [];
    for (const collection of listKeys) {
      const items = record[collection] ?? [];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (typeof item !== "object" || item === null) throw new Error("Invalid saved information");
        const itemRecord = item as Record<string, unknown>;
        const id = collection === "attendance" ? `${String(itemRecord["date"])}_${String(itemRecord["batchId"])}` : itemRecord["id"];
        if (typeof id !== "string" || id.length < 1 || id.length > 200) throw new Error("Invalid saved information");
        rows.push({ collection, id, data: item, updated_at: new Date().toISOString() });
      }
    }
    for (const key of ["settings", "facultyAttendance", "nextReceipt"]) {
      if (!(key in record)) throw new Error("Invalid saved information");
      rows.push({ collection: "_meta", id: key, data: record[key], updated_at: new Date().toISOString() });
    }
    const db = await admin();
    const { error } = await db.from("app_records").upsert({ collection: "state", id: "app", data: record as unknown as import("@/integrations/supabase/types").Json, updated_at: new Date().toISOString() });
    if (error) throw new Error("Could not save");
    return { ok: true };
  });

export const changePin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ pin: pinSchema.shape.pin }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const db = await admin();
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const salt = Array.from(saltBytes, (value) => value.toString(16).padStart(2, "0")).join("");
    const value = `${salt}:${await hashPin(data.pin, salt)}`;
    const { error } = await db.from("app_secrets").upsert({ key: "pin", value });
    if (error) throw new Error("Could not update PIN");
    return { ok: true };
  });
