import { supabase } from "@/integrations/supabase/client";
import type { OilSample } from "./oilAnalysis";

export async function scanOilPdf(file:File, aircraftId:string, signal:AbortSignal): Promise<Partial<OilSample>> {
  if (file.size === 0 || file.size > 10*1024*1024) throw new Error("Choose a non-empty PDF smaller than 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0,5)) !== "%PDF-") throw new Error("Choose a valid PDF report.");
  let binary=""; for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const {data:{session}} = await supabase.auth.getSession();
  if(!session) throw new Error("Sign in before scanning a report.");
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-oil-analysis`, {
    method:"POST", signal, headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY},
    body:JSON.stringify({aircraft_id:aircraftId,filename:file.name,base64:btoa(binary)}),
  });
  binary="";
  if(!response.ok) {const e=await response.json().catch(()=>({message:`Scan failed (${response.status})`}));throw new Error(e.message || e.error || "Scan failed");}
  if(!response.body)throw new Error("No extraction response received.");
  const reader=response.body.getReader(), decoder=new TextDecoder();let buffer="";let output:Partial<OilSample>|undefined;
  while(true) {
    const {done,value}=await reader.read(); if(done)break;
    buffer+=decoder.decode(value,{stream:true});
    let boundary; while((boundary=buffer.indexOf("\n"))>=0) {
      const line=buffer.slice(0,boundary);buffer=buffer.slice(boundary+1);if(!line.trim())continue;
      const event=JSON.parse(line);
      if(event.type === "error")throw new Error(event.message);
      if(event.type === "result")output=event.sample;
    }
  }
  if(!output)throw new Error("The report did not produce readable results.");
  return output;
}