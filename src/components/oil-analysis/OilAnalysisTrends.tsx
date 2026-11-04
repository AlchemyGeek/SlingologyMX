import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { METRICS, jsonObject, rate, type Metric, type OilSample } from "@/lib/oilAnalysis";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";

export default function OilAnalysisTrends({samples}: {samples:OilSample[]}) {
  const [metric,setMetric] = useState<Metric>("iron");
  const [basis,setBasis] = useState("raw");
  const [axis,setAxis] = useState("date");
  const [engine,setEngine] = useState("all");
  const engines = Array.from(new Set(samples.map(s=>`${s.engine_model} / ${s.engine_serial}`)));
  const sorted = [...samples].filter(s=>engine === "all" || `${s.engine_model} / ${s.engine_serial}` === engine).sort((a,b)=>a.sample_date.localeCompare(b.sample_date));
  const latest = sorted.at(-1);
  const config = METRICS.find(m=>m[0]===metric);
  const points = sorted.filter(s=>axis !== "engine" || s.hours_on_engine != null).map(s=>({
    x:axis === "engine" ? s.hours_on_engine : s.sample_date,
    value:basis === "rate" ? rate(s,metric) : jsonObject(s.qualifiers)[metric] ? null : s[metric],
    average:basis === "raw" ? jsonObject(s.universal_averages)[metric] ?? null : null,
    lab:s.lab_name,
  }));
  const numbers = points.map(p=>p.value).filter((v):v is number => v != null);
  const mean = numbers.length ? numbers.reduce((a,b)=>a+b,0)/numbers.length : null;
  const first = numbers[0], last = numbers.at(-1);
  const change = first != null && last != null && first > 0 && numbers.length > 1 ? (last-first)/first*100 : null;
  const range = latest ? jsonObject(latest.lab_ranges)[metric] : null;
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1 min-w-40"><Label>Metric</Label><Select value={metric} onValueChange={v=>setMetric(v as Metric)}><SelectTrigger aria-label="Trend metric"><SelectValue/></SelectTrigger><SelectContent>{METRICS.map(([key,label,unit])=><SelectItem key={key} value={key}>{label} ({unit.length <= 2 ? "ppm" : unit})</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1 min-w-40"><Label>Engine</Label><Select value={engine} onValueChange={setEngine}><SelectTrigger aria-label="Trend engine"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All engines</SelectItem>{engines.map(e=><SelectItem key={e} value={e}>{e === " / " ? "Unspecified engine" : e}</SelectItem>)}</SelectContent></Select></div>
      <ToggleGroup type="single" value={basis} onValueChange={v=>{if(v)setBasis(v);}} aria-label="Value basis"><ToggleGroupItem value="raw">Measured</ToggleGroupItem><ToggleGroupItem value="rate">Per oil hour</ToggleGroupItem></ToggleGroup>
      <ToggleGroup type="single" value={axis} onValueChange={v=>{if(v)setAxis(v);}} aria-label="Trend axis"><ToggleGroupItem value="date">Date</ToggleGroupItem><ToggleGroupItem value="engine">Engine hours</ToggleGroupItem></ToggleGroup>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y py-4">
      {[["Samples",String(sorted.length)],["Mean",mean?.toFixed(2) ?? "—"],["Latest",last?.toFixed(2) ?? "—"],["First → latest",change != null ? `${change>0?"+":""}${change.toFixed(1)}%` : "—"]].map(([label,value])=><div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-mono">{value}</p></div>)}
    </div>
    <div className="h-80 w-full min-w-0" role="img" aria-label={`${config?.[1]} trend chart`}>
      <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{top:15,right:15,left:0,bottom:15}}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3"/><XAxis dataKey="x" type={axis === "engine" ? "number" : "category"} domain={axis === "engine" ? ["dataMin","dataMax"] : undefined} tick={{fill:"hsl(var(--muted-foreground))",fontSize:11}}/><YAxis tick={{fill:"hsl(var(--muted-foreground))",fontSize:11}}/>
        <Tooltip content={({active,payload,label})=>active && payload?.length ? <div className="bg-popover text-popover-foreground border rounded p-3 text-sm"><p>{label}</p>{payload.map(p=><p key={String(p.dataKey)}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}</p>)}</div> : null}/>
        <Line name={`${config?.[1]}${basis === "rate" ? " / oil hour" : ""}`} type="linear" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls={false} isAnimationActive={false}/>
        {basis === "raw" && <Line name="Report fleet average" dataKey="average" stroke="hsl(var(--chart-4))" strokeDasharray="4 4" isAnimationActive={false} connectNulls={false}/>}
        {basis === "raw" && range?.min != null && <ReferenceLine y={range.min} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label="Lab min"/>}
        {basis === "raw" && range?.max != null && <ReferenceLine y={range.max} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label="Lab max"/>}
        {basis === "raw" && metric === "cst_viscosity_100c" && latest?.reference_profile === "rotax916" && <ReferenceLine y={12.5} stroke="hsl(var(--chart-3))" strokeDasharray="4 4" label="Watch 12.5"/>}
      </LineChart></ResponsiveContainer>
    </div>
    <div className="flex flex-wrap gap-2"><Badge variant="outline">{basis === "rate" ? "Exact readings ÷ hours on oil" : "Exact measured readings"}</Badge><Badge variant="outline">{numbers.length} plotted values</Badge></div>
    <p className="text-xs text-muted-foreground">Below/above detection-limit readings are excluded from numeric averages and charts. Lab methods, oil grade, fuel mix, drain intervals and engine changes can affect comparisons. {sorted.length < 3 ? "Fewer than three samples: trends are preliminary." : ""}</p>
  </div>;
}