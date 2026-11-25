import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { METRICS, buildMetricSeries, type Metric, type MetricSeries, type OilSample } from "@/lib/oilAnalysis";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Basis = "raw" | "rate"; type Axis = "date" | "engine";
const unitOf = (i: number, unit: string) => i < 20 ? "ppm" : unit;

function MetricTile({label, unit, series, basis, onOpen}: {label:string; unit:string; series:MetricSeries; basis:Basis; onOpen:()=>void}) {
  const empty = series.numbers.length === 0;
  return <button type="button" onClick={onOpen} aria-label={`Open ${label} trend`}
    className={cn("text-left rounded-lg border bg-card p-3 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors min-w-0", series.outOfRange && "border-destructive", empty && "opacity-60")}>
    <div className="flex items-baseline justify-between gap-1"><p className="text-xs font-medium truncate">{label}</p><p className="text-[10px] text-muted-foreground shrink-0">{unit}{basis === "rate" ? "/h" : ""}</p></div>
    {empty ? <p className="text-xs text-muted-foreground py-6 text-center">No data</p> : <>
      <div className="flex items-baseline justify-between mt-1"><span className={cn("font-mono text-lg", series.outOfRange && "text-destructive")}>{series.last?.toFixed(2)}</span>
        {series.change != null && <span className="text-[10px] font-mono text-muted-foreground">{series.change>0?"+":""}{series.change.toFixed(0)}%</span>}</div>
      <div className="h-10 w-full" aria-hidden><ResponsiveContainer width="100%" height="100%"><LineChart data={series.points} margin={{top:2,right:2,left:2,bottom:2}}>
        <YAxis hide domain={["dataMin","dataMax"]}/><Line dataKey="value" stroke={series.outOfRange ? "hsl(var(--destructive))" : "hsl(var(--primary))"} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false}/>
      </LineChart></ResponsiveContainer></div></>}
  </button>;
}

function MetricDetailChart({metric, label, series, basis, axis, sorted}: {metric:Metric; label:string; series:MetricSeries; basis:Basis; axis:Axis; sorted:OilSample[]}) {
  const latest = sorted[sorted.length - 1]; const {points, numbers, mean, last, change, range} = series;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y py-4">
      {[["Samples",String(sorted.length)],["Mean",mean?.toFixed(2) ?? "—"],["Latest",last?.toFixed(2) ?? "—"],["First → latest",change != null ? `${change>0?"+":""}${change.toFixed(1)}%` : "—"]].map(([l,v])=><div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-mono">{v}</p></div>)}
    </div>
    <div className="h-80 w-full min-w-0" role="img" aria-label={`${label} trend chart`}>
      <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{top:15,right:15,left:0,bottom:15}}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3"/><XAxis dataKey="x" type={axis === "engine" ? "number" : "category"} domain={axis === "engine" ? ["dataMin","dataMax"] : undefined} tick={{fill:"hsl(var(--muted-foreground))",fontSize:11}}/><YAxis tick={{fill:"hsl(var(--muted-foreground))",fontSize:11}}/>
        <Tooltip content={({active,payload,label:l})=>active && payload?.length ? <div className="bg-popover text-popover-foreground border rounded p-3 text-sm"><p>{l}</p>{payload.map(p=><p key={String(p.dataKey)}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}</p>)}</div> : null}/>
        <Line name={`${label}${basis === "rate" ? " / oil hour" : ""}`} type="linear" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls={false} isAnimationActive={false}/>
        {basis === "raw" && <Line name="Report fleet average" dataKey="average" stroke="hsl(var(--chart-4))" strokeDasharray="4 4" isAnimationActive={false} connectNulls={false}/>}
        {basis === "raw" && range?.min != null && <ReferenceLine y={range.min} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label="Lab min"/>}
        {basis === "raw" && range?.max != null && <ReferenceLine y={range.max} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label="Lab max"/>}
        {basis === "raw" && metric === "cst_viscosity_100c" && latest?.reference_profile === "rotax916" && <ReferenceLine y={12.5} stroke="hsl(var(--chart-3))" strokeDasharray="4 4" label="Watch 12.5"/>}
      </LineChart></ResponsiveContainer>
    </div>
    <div className="flex flex-wrap gap-2"><Badge variant="outline">{basis === "rate" ? "Exact readings ÷ hours on oil" : "Exact measured readings"}</Badge><Badge variant="outline">{numbers.length} plotted values</Badge></div>
  </div>;
}

export default function OilAnalysisTrends({samples}: {samples:OilSample[]}) {
  const [open,setOpen] = useState<Metric | null>(null);
  const [basis,setBasis] = useState<Basis>("raw");
  const [axis,setAxis] = useState<Axis>("date");
  const [engine,setEngine] = useState("all");
  const engines = Array.from(new Set(samples.map(s=>`${s.engine_model} / ${s.engine_serial}`)));
  const sorted = useMemo(()=>[...samples].filter(s=>engine === "all" || `${s.engine_model} / ${s.engine_serial}` === engine).sort((a,b)=>a.sample_date.localeCompare(b.sample_date)),[samples,engine]);
  const tiles = useMemo(()=>METRICS.map(([key,label,unit],i)=>({key:key as Metric,label,unit:unitOf(i,unit),series:buildMetricSeries(sorted,key as Metric,basis,axis)}))
    .sort((a,b)=>Number(a.series.numbers.length===0)-Number(b.series.numbers.length===0)),[sorted,basis,axis]);
  const current = tiles.find(t=>t.key===open);
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1 min-w-40"><Label>Engine</Label><Select value={engine} onValueChange={setEngine}><SelectTrigger aria-label="Trend engine"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All engines</SelectItem>{engines.map(e=><SelectItem key={e} value={e}>{e === " / " ? "Unspecified engine" : e}</SelectItem>)}</SelectContent></Select></div>
      <ToggleGroup type="single" value={basis} onValueChange={v=>{if(v)setBasis(v as Basis);}} aria-label="Value basis"><ToggleGroupItem value="raw">Measured</ToggleGroupItem><ToggleGroupItem value="rate">Per oil hour</ToggleGroupItem></ToggleGroup>
      <ToggleGroup type="single" value={axis} onValueChange={v=>{if(v)setAxis(v as Axis);}} aria-label="Trend axis"><ToggleGroupItem value="date">Date</ToggleGroupItem><ToggleGroupItem value="engine">Engine hours</ToggleGroupItem></ToggleGroup>
    </div>
    <p className="text-xs text-muted-foreground">Tap a metric to see its full trend. Red tiles have a latest reading outside the lab range.</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {tiles.map(t=><MetricTile key={t.key} label={t.label} unit={t.unit} series={t.series} basis={basis} onOpen={()=>setOpen(t.key)}/>)}
    </div>
    <p className="text-xs text-muted-foreground">Below/above detection-limit readings are excluded from numeric averages and charts. Lab methods, oil grade, fuel mix, drain intervals and engine changes can affect comparisons. {sorted.length < 3 ? "Fewer than three samples: trends are preliminary." : ""}</p>
    <Dialog open={!!current} onOpenChange={o=>{if(!o)setOpen(null);}}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] max-h-[95vh] overflow-y-auto">
        {current && <><DialogHeader><DialogTitle>{current.label} ({current.unit}{basis === "rate" ? " / oil hour" : ""})</DialogTitle><DialogDescription>{engine === "all" ? "All engines" : engine} · by {axis === "engine" ? "engine hours" : "date"}</DialogDescription></DialogHeader>
        <MetricDetailChart metric={current.key} label={current.label} series={current.series} basis={basis} axis={axis} sorted={sorted}/></>}
      </DialogContent>
    </Dialog>
  </div>;
}
