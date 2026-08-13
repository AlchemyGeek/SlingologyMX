import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const CounterSchema = z.object({
  hobbs: z.number().nonnegative().optional(),
  tach: z.number().nonnegative().optional(),
  airframe_total_time: z.number().nonnegative().optional(),
  engine_total_time: z.number().nonnegative().optional(),
  prop_total_time: z.number().nonnegative().optional(),
  change_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (v) =>
    v.hobbs !== undefined ||
    v.tach !== undefined ||
    v.airframe_total_time !== undefined ||
    v.engine_total_time !== undefined ||
    v.prop_total_time !== undefined,
  { message: "At least one counter value is required" }
);

type CounterKey = "hobbs" | "tach" | "airframe_total_time" | "engine_total_time" | "prop_total_time";
const COUNTER_KEYS: CounterKey[] = ["hobbs", "tach", "airframe_total_time", "engine_total_time", "prop_total_time"];

const TT_MODE_MAP: Record<string, string> = {
  airframe_total_time: "airframe_tt_mode",
  engine_total_time: "engine_tt_mode",
  prop_total_time: "prop_tt_mode",
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = req.headers.get("X-API-Key")?.trim();
    if (!apiKey) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const keyHash = await sha256(apiKey);
    const { data: keyRow, error: keyError } = await supabase
      .from("aircraft_api_keys")
      .select("id, aircraft_id, revoked_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyError || !keyRow || keyRow.revoked_at) {
      console.error("[counters] API key lookup failed", keyError);
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: aircraft, error: aircraftError } = await supabase
      .from("aircraft")
      .select("id, user_id, airframe_tt_mode, engine_tt_mode, prop_tt_mode")
      .eq("id", keyRow.aircraft_id)
      .single();

    if (aircraftError || !aircraft) {
      console.error("[counters] aircraft lookup failed", aircraftError);
      return json({ error: "Unauthorized" }, 401);
    }

    await supabase
      .from("aircraft_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Malformed JSON" }, 400);
    }

    const parsed = CounterSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[counters] invalid payload", { received: body, errors: parsed.error.flatten() });
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    }
    const payload = parsed.data;

    // Load (or create) the counters row for this aircraft
    let { data: current, error: currentError } = await supabase
      .from("aircraft_counters")
      .select("*")
      .eq("aircraft_id", aircraft.id)
      .maybeSingle();

    if (currentError) {
      console.error("[counters] fetch failed", currentError);
      return json({ error: "Failed to load counters" }, 500);
    }

    if (!current) {
      const { data: created, error: createError } = await supabase
        .from("aircraft_counters")
        .insert({ user_id: aircraft.user_id, aircraft_id: aircraft.id })
        .select("*")
        .single();
      if (createError || !created) {
        console.error("[counters] create failed", createError);
        return json({ error: "Failed to initialize counters" }, 500);
      }
      current = created;
    }

    const existing: Record<CounterKey, number | null> = {
      hobbs: current.hobbs !== null ? Number(current.hobbs) : null,
      tach: current.tach !== null ? Number(current.tach) : null,
      airframe_total_time: current.airframe_total_time !== null ? Number(current.airframe_total_time) : null,
      engine_total_time: current.engine_total_time !== null ? Number(current.engine_total_time) : null,
      prop_total_time: current.prop_total_time !== null ? Number(current.prop_total_time) : null,
    };

    // Reject decreasing values
    for (const key of COUNTER_KEYS) {
      const incoming = payload[key];
      const prev = existing[key];
      if (incoming !== undefined && prev !== null && incoming < prev) {
        return json(
          { error: `Counter ${key} cannot decrease (current ${prev}, received ${incoming})` },
          400
        );
      }
    }

    // Build the update: explicit values first, then derive linked TT counters
    const updates: Partial<Record<CounterKey, number>> = {};
    for (const key of COUNTER_KEYS) {
      if (payload[key] !== undefined) updates[key] = payload[key] as number;
    }

    for (const ttKey of ["airframe_total_time", "engine_total_time", "prop_total_time"] as CounterKey[]) {
      const mode = (aircraft as Record<string, unknown>)[TT_MODE_MAP[ttKey]] as string;
      if (mode !== "hobbs" && mode !== "tach") continue;
      const sourceKey = mode as CounterKey;
      const sourceNew = updates[sourceKey];
      if (sourceNew === undefined) continue;
      const sourcePrev = existing[sourceKey] ?? 0;
      const delta = sourceNew - sourcePrev;
      if (delta === 0) continue;
      const ttPrev = existing[ttKey] ?? 0;
      updates[ttKey] = Number((ttPrev + delta).toFixed(1));
    }

    const { error: updateError } = await supabase
      .from("aircraft_counters")
      .update(updates)
      .eq("id", current.id);

    if (updateError) {
      console.error("[counters] update failed", updateError);
      return json({ error: "Failed to update counters" }, 500);
    }

    const finalValues: Record<CounterKey, number | null> = { ...existing };
    for (const key of COUNTER_KEYS) {
      if (updates[key] !== undefined) finalValues[key] = updates[key] as number;
    }

    const changeDate = payload.change_date
      ? `${payload.change_date}T00:00:00Z`
      : new Date().toISOString();

    const { error: historyError } = await supabase
      .from("aircraft_counter_history")
      .insert({
        user_id: aircraft.user_id,
        aircraft_id: aircraft.id,
        hobbs: finalValues.hobbs,
        tach: finalValues.tach,
        airframe_total_time: finalValues.airframe_total_time,
        engine_total_time: finalValues.engine_total_time,
        prop_total_time: finalValues.prop_total_time,
        source: "Integration",
        change_date: changeDate,
      });

    if (historyError) {
      console.error("[counters] history insert failed", historyError);
      return json({ error: "Counters updated but history logging failed" }, 500);
    }

    console.log("[counters] updated", { aircraft_id: aircraft.id, updates });

    return json({ status: "updated", counters: finalValues }, 200);
  } catch (error) {
    console.error("[counters] unexpected error", error);
    return json({ error: "Internal server error" }, 500);
  }
});
