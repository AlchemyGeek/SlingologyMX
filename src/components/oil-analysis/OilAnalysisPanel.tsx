import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { FlaskConical, Plus, ScanLine, Loader2, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { comparisonHistory, evaluateOil, METRICS, rate, reading, type OilSample } from "@/lib/oilAnalysis";
import OilAnalysisForm from "./OilAnalysisForm";
import OilAnalysisTrends from "./OilAnalysisTrends";
import { scanOilPdf } from "@/lib/scanOilPdf";

export default function OilAnalysisPanel({userId,aircraftId}: {userId:string;aircraftId:string}) {
  const [samples,setSamples] = useState<OilSample[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [form,setForm] = useState<Partial<OilSample>|null>(null);
  const [selected,setSelected] = useState<OilSample|null>(null);
  const [deleting,setDeleting] = useState<OilSample|null>(null);
  const [search,setSearch] = useState("");
  const [scanning,setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController|null>(null);
  const fetchSamples = async () => {
    if (!aircraftId) {setSamples([]);setLoading(false);return;}
    const {data,error} = await supabase.from("oil_analysis_samples").select("*").eq("user_id",userId).eq("aircraft_id",aircraftId).order("sample_date",{ascending:false});
    if (error) setError(error.message); else {setSamples(data || []);setError("");}
    setLoading(false);
  };
  useEffect(()=>{setSamples([]);setForm(null);setSelected(null);setLoading(true);abortRef.current?.abort();void fetchSamples(); return ()=>abortRef.current?.abort();},[userId,aircraftId]);
  const {deleteWithUndo} = useUndoDelete({tableName:"oil_analysis_samples",onAfterDelete:()=>{setSelected(null);void fetchSamples();},onAfterRestore:fetchSamples});
  const health = (s:OilSample) => {const history=comparisonHistory(samples,s);return evaluateOil(s,history[0],history[1]);};
  const badge = (s:OilSample) => {const status=health(s).status;return <Badge variant={status === "Action Required" ? "destructive" : status === "Normal" ? "secondary" : "outline"}>{status}</Badge>;};
  const scan = async (file?:File) => {
    if (!file) return; setError("");setScanning(true); const abort=new AbortController();abortRef.current=abort;
    try {const extracted = await scanOilPdf(file,aircraftId,abort.signal);setForm({...extracted,source:"pdf"});}
    catch(e) {if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "PDF extraction failed");}
    finally {setScanning(false);if(inputRef.current)inputRef.current.value="";}
  };
  const shown=samples.filter(s=>`${s.lab_name} ${s.lab_number} ${s.engine_model} ${s.engine_serial} ${s.sample_date}`.toLowerCase().includes(search.toLowerCase()));
  const latest=samples[0];
  return <div className="space-y-5">
    <div className="flex justify-between items-center gap-3"><div className="flex items-center gap-3"><FlaskConical className="w-6 h-6 text-primary"/><div><h2 className="text-xl font-semibold">Oil Analysis</h2><p className="text-xs text-muted-foreground">{latest?.engine_model || "Engine oil samples"}{latest?.engine_serial ? ` · S/N ${latest.engine_serial}` : ""}</p></div></div><div className="flex gap-2 shrink-0">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" aria-label="Oil analysis PDF" onChange={e=>void scan(e.target.files?.[0])}/>
      {scanning ? <Button variant="outline" onClick={()=>abortRef.current?.abort()} aria-label="Stop scan"><X className="w-4 h-4"/></Button> : <Button variant="outline" onClick={()=>inputRef.current?.click()} disabled={!aircraftId} aria-label="Scan Lab PDF" title="Scan Lab PDF"><ScanLine className="w-4 h-4"/><span className="hidden sm:inline ml-2">Scan Lab PDF</span></Button>}
      <Button onClick={()=>setForm({})} disabled={!aircraftId || scanning} aria-label="New Oil Sample" title="New Oil Sample"><Plus className="w-4 h-4"/></Button>
    </div></div>
    {scanning && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin"/>Reading laboratory results…</p>}
    {error && <div role="alert" className="text-sm text-destructive border border-destructive rounded p-3">{error}</div>}
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 border-y py-4">
      <div><p className="text-xs text-muted-foreground">Samples</p><p className="text-xl font-mono">{samples.length}</p></div>
      <div><p className="text-xs text-muted-foreground">Latest Sample</p><p className="text-sm mt-1">{latest?.sample_date || "—"}</p></div>
      <div><p className="text-xs text-muted-foreground">Tach at Latest Sample</p><p className="text-xl font-mono">{latest?.hours_on_engine ?? "—"}<span className="text-xs ml-1">hr</span></p></div>
      <div><p className="text-xs text-muted-foreground">Latest Oil Interval</p><p className="text-xl font-mono">{latest?.hours_on_oil ?? "—"}<span className="text-xs ml-1">hr</span></p></div>
      <div><p className="text-xs text-muted-foreground mb-1">Assessment</p>{latest ? badge(latest) : "—"}</div>
    </div>
    <Tabs defaultValue="samples"><TabsList><TabsTrigger value="samples">Samples</TabsTrigger><TabsTrigger value="trends">Trends & Health</TabsTrigger></TabsList>
      <TabsContent value="samples" className="space-y-3"><div className="relative max-w-sm"><Search className="absolute w-4 h-4 left-3 top-3 text-muted-foreground"/><Input aria-label="Search oil samples" placeholder="Search samples" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
        {loading ? <p>Loading samples…</p> : shown.length === 0 ? <div className="py-12 text-center text-muted-foreground"><FlaskConical className="h-10 w-10 mx-auto mb-3"/><p>{samples.length ? "No matching samples" : "No oil analysis samples"}</p></div> : <>
          <div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground">{["Sample","Laboratory","Engine hr","Oil hr","Fe / Cu / Al","Status",""] .map((l,i)=><th className="py-3 pr-3 font-medium" key={i}>{l}</th>)}</tr></thead><tbody>{shown.map(s=><tr key={s.id} className="border-b"><td className="py-3"><Button variant="link" className="px-0" onClick={()=>setSelected(s)}>{s.sample_date}</Button></td><td className="pr-3">{s.lab_name || "—"}<p className="text-xs text-muted-foreground">{s.lab_number}</p></td><td>{s.hours_on_engine ?? "—"}</td><td>{s.hours_on_oil ?? "—"}</td><td className="font-mono text-xs">{reading(s,"iron")} / {reading(s,"copper")} / {reading(s,"aluminum")}</td><td>{badge(s)}</td><td><div className="flex"><Button variant="ghost" size="icon" aria-label={`Edit sample ${s.sample_date}`} title="Edit sample" onClick={()=>setForm(s)}><Pencil className="w-4 h-4"/></Button><Button variant="ghost" size="icon" aria-label={`Delete sample ${s.sample_date}`} title="Delete sample" onClick={()=>setDeleting(s)}><Trash2 className="w-4 h-4"/></Button></div></td></tr>)}</tbody></table></div>
          <div className="md:hidden space-y-3">{shown.map(s=><article className="border rounded-lg p-3" key={s.id}><div className="flex justify-between items-center gap-2"><Button variant="link" className="px-0" onClick={()=>setSelected(s)}>{s.sample_date}</Button>{badge(s)}</div><p className="text-sm">{s.lab_name} · {s.lab_number}</p><div className="flex justify-between items-center"><p className="text-xs text-muted-foreground">{s.hours_on_engine ?? "—"} engine hr · {s.hours_on_oil ?? "—"} oil hr</p><div className="flex"><Button variant="ghost" size="icon" aria-label="Edit sample" onClick={()=>setForm(s)}><Pencil className="w-4 h-4"/></Button><Button variant="ghost" size="icon" aria-label="Delete sample" onClick={()=>setDeleting(s)}><Trash2 className="w-4 h-4"/></Button></div></div></article>)}</div>
        </>}
      </TabsContent>
      <TabsContent value="trends" className="space-y-5"><OilAnalysisTrends samples={samples}/>{latest && <section className="border-t pt-4"><h3 className="font-semibold mb-2">Latest Health Review · {latest.sample_date}</h3>{badge(latest)}<ul className="list-disc pl-5 text-sm mt-3 space-y-2">{health(latest).issues.map((i,n)=><li key={n}>{i.message}</li>)}</ul>{health(latest).status === "Normal" && <p className="text-sm mt-2">No flags in the measured values covered by the selected reference profile.</p>}{health(latest).status === "Not assessed" && <p className="text-sm mt-2">No applicable laboratory ranges or engine reference profile have been provided.</p>}<p className="text-xs text-muted-foreground mt-3">These are review flags, not a diagnosis. Follow the laboratory's advice and consult your mechanic.</p></section>}</TabsContent>
    </Tabs>
    {form && <OilAnalysisForm key={form.id || "new"} userId={userId} aircraftId={aircraftId} initial={form} onClose={()=>setForm(null)} onSaved={()=>{setForm(null);setSelected(null);void fetchSamples();}}/>}
    {selected && <Dialog open onOpenChange={o=>{if(!o)setSelected(null);}}><DialogContent className="max-w-3xl max-h-[85svh] overflow-y-auto"><DialogHeader><DialogTitle>Oil Analysis · {selected.sample_date}</DialogTitle></DialogHeader><div className="flex items-center justify-between gap-2"><p>{selected.lab_name} · {selected.lab_number}</p>{badge(selected)}<Button variant="outline" size="icon" aria-label="Edit selected sample" onClick={()=>{setForm(selected);setSelected(null);}}><Pencil className="w-4 h-4"/></Button></div><p className="text-sm">{selected.engine_model} · S/N {selected.engine_serial || "—"} · {selected.hours_on_engine ?? "—"} engine hr · {selected.hours_on_oil ?? "—"} oil hr</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{METRICS.map(([key,label,unit])=><div className="border-b pb-2" key={key}><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono text-sm">{reading(selected,key)} <span className="text-xs">{ELEMENT_UNIT(key,unit)}</span></p>{["iron","copper","lead","aluminum"].includes(key) && <p className="text-xs text-muted-foreground">{rate(selected,key)?.toFixed(3) ?? "—"} ppm/oil hr</p>}</div>)}</div><h3 className="font-medium">Laboratory Comments</h3><p className="text-sm whitespace-pre-wrap">{selected.lab_comments || "—"}</p><h3 className="font-medium">Your Notes</h3><p className="text-sm whitespace-pre-wrap">{selected.notes || "—"}</p><ul className="text-sm list-disc pl-5">{health(selected).issues.map((i,n)=><li key={n}>{i.message}</li>)}</ul></DialogContent></Dialog>}
    <AlertDialog open={!!deleting} onOpenChange={o=>{if(!o)setDeleting(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Oil Analysis?</AlertDialogTitle><AlertDialogDescription>Remove the sample from {deleting?.sample_date}? You can undo this for 20 seconds.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>{if(deleting)void deleteWithUndo(deleting.id,deleting);setDeleting(null);}}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
function ELEMENT_UNIT(key:string,unit:string) {return METRICS.findIndex(m=>m[0]===key)<20 ? "ppm" : unit;}