import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAMP_CATEGORY_MAP: Record<string, { category: string; intent: string }> = {
  Fuel: { category: "Fuel", intent: "Operation" },
  Oil: { category: "Oil & Consumables", intent: "Operation" },
  Tires: { category: "Maintenance Parts", intent: "Maintenance" },
  Other: { category: "Other", intent: "Operation" },
};

const IngestSchema = z.object({
  external_id: z.string().min(1).max(255),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().nonnegative(),
  category: z.enum(["Fuel", "Oil", "Tires", "Other"]),
  title: z.string().min(1).max(255).optional(),
  notes: z.string().max(2000).optional(),
});

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.replace("Bearer ", "").trim();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const keyHash = await sha256(apiKey);

    const { data: keyRow, error: keyError } = await supabase
      .from("aircraft_api_keys")
      .select("id, aircraft_id, revoked_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyError || !keyRow || keyRow.revoked_at) {
      console.error("API key lookup failed:", keyError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: aircraft, error: aircraftError } = await supabase
      .from("aircraft")
      .select("id, user_id")
      .eq("id", keyRow.aircraft_id)
      .single();

    if (aircraftError || !aircraft) {
      console.error("Aircraft lookup failed:", aircraftError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_used_at
    await supabase
      .from("aircraft_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Malformed JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = IngestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { external_id, transaction_date, amount, category, title, notes } = parsed.data;
    const mapping = RAMP_CATEGORY_MAP[category];

    // Check for existing transaction by external_id
    const { data: existingTx, error: existingError } = await supabase
      .from("transactions")
      .select("id")
      .eq("aircraft_id", aircraft.id)
      .eq("external_id", external_id)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing transaction:", existingError);
      return new Response(
        JSON.stringify({ error: "Failed to process transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingTx) {
      return new Response(
        JSON.stringify({ id: existingTx.id, status: "existing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const derivedTitle = title || `${mapping.category} — Ramp`;

    const { data: newTx, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: aircraft.user_id,
        aircraft_id: aircraft.id,
        external_id,
        title: derivedTitle,
        transaction_date,
        amount,
        currency: "USD",
        direction: "Debit",
        intent: mapping.intent as any,
        category: mapping.category as any,
        status: "Pending",
        source: "Imported",
        notes: notes || null,
        tags: ["ramp-import"],
        include_in_cash_flow: true,
        include_in_ownership_total: true,
        include_in_cost_per_hour: true,
        allocate_over_time: false,
        attachment_urls: [],
      })
      .select("id")
      .single();

    if (insertError || !newTx) {
      console.error("Error inserting transaction:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ id: newTx.id, status: "created" }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in integration-ingest:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
