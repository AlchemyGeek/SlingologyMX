import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { ELEMENTS, PROPERTIES, jsonObject, numericFields, parseLabNumber, sampleInputSchema, type OilSample } from "@/lib/oilAnalysis";
import type { Database, Json } from "@/integrations/supabase/types";

type Props = { userId: string; aircraftId: string; initial: Partial<OilSample>; onClose: () => void; onSaved: () => void };
const textFields = ["lab_name", "lab_number", "engine_model", "engine_serial", "oil_brand_grade", "fuel_type", "lab_comments", "notes"];
export default function OilAnalysisForm({ userId, aircraftId, initial, onClose, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    [...textFields, ...numericFields, "sample_date", "report_date", "maintenance_log_id"].forEach(key => {
      const value = initial[key as keyof OilSample];
      v[key] = value == null ? "" : `${jsonObject(initial.qualifiers)[key] || ""}${value}`;
    });
    v.reference_profile = initial.reference_profile || "lab";
    v.oil_changed = initial.oil_changed == null ? "unknown" : String(initial.oil_changed);
    return v;
  });
  const [logs, setLogs] = useState<{id: string; entry_title: string}[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [averages, setAverages] = useState(JSON.stringify(initial.universal_averages || {}, null, 2));
  const [ranges, setRanges] = useState(JSON.stringify(initial.lab_ranges || {}, null, 2));
  useEffect(() => {
    supabase.from("maintenance_logs").select("id,entry_title").eq("user_id", userId).eq("aircraft_id", aircraftId).order("date_started", {ascending:false}).then(({data,error}) => {
      if (error) setError(error.message); else setLogs(data || []);
    });
  }, [userId, aircraftId]);
  const set = (key: string, value: string) => setValues(v => ({...v, [key]:value}));
  const input = (key: string, label: string, numeric = false, unit?: string) => (
    <div key={key} className="space-y-1.5 min-w-0">
      <Label htmlFor={`oil-${key}`} className="text-xs">{label}{unit ? ` (${unit})` : ""}</Label>
      <Input id={`oil-${key}`} value={values[key] || ""} onChange={e => set(key,e.target.value)} inputMode={numeric ? "decimal" : undefined} maxLength={numeric ? 24 : 200} />
    </div>
  );
  const date = (key: string, label: string, required = false) => <div className="space-y-1.5"><Label htmlFor={`oil-${key}`}>{label}</Label><DateInput id={`oil-${key}`} required={required} value={values[key] ? new Date(`${values[key]}T00:00:00`) : null} onChange={d => set(key,d ? format(d,"yyyy-MM-dd") : "")} /></div>;
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const text = sampleInputSchema.parse(values);
      const qualifiers: Record<string,string> = {};
      const numbers: Record<string,number|null> = {};
      numericFields.forEach(key => {
        const parsed = parseLabNumber(values[key] || "");
        if (key.endsWith("percent") && parsed.value != null && parsed.value > 100) throw new Error("Percentages must be between 0 and 100.");
        if (["hours_on_oil","hours_on_engine","makeup_oil"].includes(key) && parsed.qualifier) throw new Error("Hours and make-up oil require exact values.");
        numbers[key] = parsed.value;
        if (parsed.qualifier) qualifiers[key] = parsed.qualifier;
      });
      const parseReference = (raw: string, isRange: boolean) => {
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("References must be a JSON object.");
        Object.entries(obj).forEach(([key,value]) => {
          if (!numericFields.includes(key)) throw new Error(`Unknown reference metric: ${key}`);
          if (!isRange && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) throw new Error("Averages must be non-negative numbers.");
          if (isRange) {
            const range = jsonObject(value);
            if (!Object.keys(range).length || Object.keys(range).some(k => !["min","max"].includes(k)) || Object.values(range).some(v => v != null && (typeof v !== "number" || !Number.isFinite(v)))) throw new Error("Ranges require numeric min/max values.");
            if (range.min != null && range.max != null && range.min > range.max) throw new Error("Range minimum cannot exceed maximum.");
          }
        }); return obj as Json;
      };
      const record: Database["public"]["Tables"]["oil_analysis_samples"]["Insert"] = {
        ...text, ...numbers, user_id:userId, aircraft_id:aircraftId,
        report_date:values.report_date || null, maintenance_log_id:values.maintenance_log_id || null,
        oil_changed: values.oil_changed === "unknown" ? null : values.oil_changed === "true",
        reference_profile:values.reference_profile, source:initial.source || "manual",
        qualifiers, universal_averages:parseReference(averages,false), lab_ranges:parseReference(ranges,true),
        extra_results:initial.extra_results || [], extraction_warnings:initial.extraction_warnings || [],
      };
      const result = initial.id
        ? await supabase.from("oil_analysis_samples").update(record).eq("id",initial.id).eq("user_id",userId).eq("aircraft_id",aircraftId)
        : await supabase.from("oil_analysis_samples").insert(record);
      if (result.error) throw new Error(result.error.code === "23505" ? "This laboratory sample is already saved." : result.error.message);
      toast.success("Oil analysis saved"); onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save sample"); }
    finally { setSaving(false); }
  };
  return <Dialog open onOpenChange={open => {if (!open && !saving) onClose();}}><DialogContent className="max-w-4xl max-h-[90svh] overflow-y-auto">
    <DialogHeader><DialogTitle>{initial.id ? "Edit Oil Analysis" : initial.source === "pdf" ? "Review Scanned Oil Analysis" : "New Oil Analysis"}</DialogTitle></DialogHeader>
    <form onSubmit={save} className="space-y-6">
      {initial.source === "pdf" && <p className="text-sm text-muted-foreground">Review the extracted results before saving. The PDF is not retained.</p>}
      {Array.isArray(initial.extraction_warnings) && initial.extraction_warnings.length > 0 && <ul className="text-sm text-destructive list-disc pl-5">{initial.extraction_warnings.map((w,i) => <li key={i}>{String(w)}</li>)}</ul>}
      <section className="space-y-3"><h3 className="font-semibold border-b pb-2">Sample & Engine</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {date("sample_date","Sample Date *",true)}{date("report_date","Report Date")}
        <div className="space-y-1.5"><Label htmlFor="oil-lab_name">Laboratory</Label><Input id="oil-lab_name" list="oil-labs" value={values.lab_name} onChange={e=>set("lab_name",e.target.value)} maxLength={200}/><datalist id="oil-labs">{["Blackstone Laboratories","Aviation Laboratories","ALS Tribology","WearCheck","Bureau Veritas"].map(l=><option key={l} value={l}/>)}</datalist></div>
        {input("lab_number","Lab / Report Number")}{input("engine_model","Engine Model")}{input("engine_serial","Engine Serial / Identifier")}
        {input("hours_on_engine","Engine Hours",true,"hr")}{input("hours_on_oil","Hours on Oil",true,"hr")}{input("makeup_oil","Make-up Oil",true,"qt")}
        {input("oil_brand_grade","Oil Brand & Grade")}{input("fuel_type","Fuel Type / Mix")}
        <div className="space-y-1.5"><Label>Oil Changed</Label><Select value={values.oil_changed} onValueChange={v=>set("oil_changed",v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="unknown">Not specified</SelectItem><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Maintenance Record (optional)</Label><Select value={values.maintenance_log_id || "none"} onValueChange={v=>set("maintenance_log_id",v === "none" ? "" : v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Standalone sample</SelectItem>{logs.map(l=><SelectItem key={l.id} value={l.id}>{l.entry_title}</SelectItem>)}</SelectContent></Select></div>
      </div></section>
      <section className="space-y-3"><h3 className="font-semibold border-b pb-2">Elements · ppm</h3><div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">{ELEMENTS.map(([key,label,symbol])=>input(key,`${label} · ${symbol}`,true))}</div></section>
      <section className="space-y-3"><h3 className="font-semibold border-b pb-2">Physical Properties & Contamination</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{PROPERTIES.map(([key,label,unit])=>input(key,label,true,unit))}</div></section>
      <section className="space-y-3"><h3 className="font-semibold border-b pb-2">Assessment & Report Notes</h3>
        <Label>Reference Profile</Label><Select value={values.reference_profile} onValueChange={v=>set("reference_profile",v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="lab">Laboratory ranges only</SelectItem><SelectItem value="rotax916">Rotax 916 iS · workbook guidance</SelectItem></SelectContent></Select>
        <p className="text-xs text-muted-foreground">Workbook thresholds are watch/action guidance, not published manufacturer limits or an airworthiness determination.</p>
        <Label htmlFor="oil-lab_comments">Laboratory Comments</Label><Textarea id="oil-lab_comments" value={values.lab_comments} onChange={e=>set("lab_comments",e.target.value)} maxLength={20000}/>
        <Label htmlFor="oil-notes">Your Notes</Label><Textarea id="oil-notes" value={values.notes} onChange={e=>set("notes",e.target.value)} maxLength={20000}/>
        <details><summary className="text-sm cursor-pointer">Laboratory averages & ranges</summary><div className="grid sm:grid-cols-2 gap-3 pt-3"><div><Label htmlFor="oil-averages">Fleet averages (ppm / report units)</Label><Textarea id="oil-averages" className="font-mono text-xs" value={averages} onChange={e=>setAverages(e.target.value)} maxLength={20000} placeholder={'{"iron": 22}'}/></div><div><Label htmlFor="oil-ranges">Report ranges</Label><Textarea id="oil-ranges" className="font-mono text-xs" value={ranges} onChange={e=>setRanges(e.target.value)} maxLength={20000} placeholder={'{"cst_viscosity_100c": {"min": 11.9, "max": 18}}'}/></div></div></details>
        {Array.isArray(initial.extra_results) && initial.extra_results.length > 0 && <div className="text-sm"><h4 className="font-medium">Additional Report Results</h4>{initial.extra_results.map((r,i)=><pre className="whitespace-pre-wrap text-xs" key={i}>{JSON.stringify(r)}</pre>)}</div>}
      </section>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button disabled={saving}><span className="sr-only sm:not-sr-only">Save Sample</span>{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}</Button></div>
    </form>
  </DialogContent></Dialog>;
}