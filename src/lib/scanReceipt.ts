import { supabase } from "@/integrations/supabase/client";

export interface ScannedReceipt {
  vendor: string | null; title: string | null; date: string | null; date_started: string | null;
  currency: string | null; total: number | null; tax: number | null;
  parts_cost: number | null; labor_cost: number | null; other_cost: number | null;
  fuel_gallons: number | null; invoice_number: string | null; tach: number | null; hobbs: number | null;
  transaction_category: string | null; transaction_intent: string | null;
  maintenance_category: string | null; maintenance_subcategory: string | null;
  performed_by_type: string | null; performed_by_name: string | null;
  line_items: { description: string; amount: number | null }[]; warnings: string[];
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Downscale photos so phone pictures stay small; returns base64 JPEG. */
async function imageToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = ""; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

/** Transient scan: the file is sent for reading only and never stored. */
export async function scanReceipt(file: File, aircraftId: string, kind: "transaction" | "maintenance", signal: AbortSignal): Promise<ScannedReceipt> {
  if (file.size === 0 || file.size > 20 * 1024 * 1024) throw new Error("Choose a non-empty file smaller than 20 MB.");
  let base64: string, mediaType: string;
  if (file.type === "application/pdf") {
    if (file.size > 10 * 1024 * 1024) throw new Error("Choose a PDF smaller than 10 MB.");
    base64 = await fileToBase64(file); mediaType = "application/pdf";
  } else if (file.type.startsWith("image/")) {
    try { ({ base64, mediaType } = await imageToBase64(file)); }
    catch { if (!IMAGE_TYPES.includes(file.type)) throw new Error("This photo format can't be read. Use JPEG or PNG."); base64 = await fileToBase64(file); mediaType = file.type; }
  } else throw new Error("Choose a PDF or a photo of the receipt.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in before scanning a receipt.");
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-receipt`, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ aircraft_id: aircraftId, kind, filename: file.name || "receipt", media_type: mediaType, base64 }),
  });
  if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.message || `Scan failed (${response.status})`); }
  if (!response.body) throw new Error("No response received.");
  const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = ""; let out: ScannedReceipt | undefined;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let i; while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i); buffer = buffer.slice(i + 1); if (!line.trim()) continue;
      const ev = JSON.parse(line);
      if (ev.type === "error") throw new Error(ev.message);
      if (ev.type === "result") out = ev.receipt;
    }
  }
  if (!out) throw new Error("The receipt did not produce readable results.");
  return out;
}

/** Builds a notes block from details not mapped to form fields. */
export function receiptNotes(r: ScannedReceipt): string {
  const lines: string[] = [];
  if (r.vendor) lines.push(`Vendor: ${r.vendor}`);
  if (r.invoice_number) lines.push(`Invoice #: ${r.invoice_number}`);
  if (r.fuel_gallons != null) lines.push(`Fuel: ${r.fuel_gallons} gal`);
  if (r.tax != null) lines.push(`Tax: ${r.tax.toFixed(2)}`);
  for (const li of r.line_items) lines.push(`- ${li.description}${li.amount != null ? `: ${li.amount.toFixed(2)}` : ""}`);
  return lines.join("\n");
}
