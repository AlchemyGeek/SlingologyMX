import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { CompressionReadings } from "./CylinderCompressionInput";
import { readCompressions } from "@/lib/compression";
import type { Aircraft } from "@/contexts/AircraftContext";

interface Row { id: string; entry_title: string; date_started: string; date_completed: string | null; tach_at_event: number | null; readings: number[] }

export function CompressionHistory({ aircraft }: { aircraft: Aircraft }) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    supabase
      .from("maintenance_logs")
      .select("id, entry_title, date_started, date_completed, tach_at_event, cylinder_compressions")
      .eq("aircraft_id", aircraft.id)
      .not("cylinder_compressions", "is", null)
      .then(({ data }) => {
        const r = (data || [])
          .map((d: any) => ({ ...d, readings: readCompressions(d.cylinder_compressions) }))
          .filter((d: any) => d.readings) as Row[];
        r.sort((a, b) => (b.date_completed ?? b.date_started).localeCompare(a.date_completed ?? a.date_started));
        setRows(r);
      });
  }, [aircraft.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> Compression History · {aircraft.registration}</CardTitle>
        <CardDescription>Readings recorded in maintenance records, newest first. Red readings are below {aircraft.compression_warning_threshold}/80.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No compression readings recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium">{r.entry_title}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {r.date_completed ?? r.date_started}{r.tach_at_event != null ? ` · Tach ${r.tach_at_event}` : ""}
                  </span>
                </div>
                <CompressionReadings readings={r.readings} threshold={aircraft.compression_warning_threshold} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
