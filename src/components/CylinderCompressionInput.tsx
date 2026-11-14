import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { COMPRESSION_MAX, parseCompression, isLowCompression } from "@/lib/compression";

interface Props {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  values: string[];
  onValuesChange: (v: string[]) => void;
  cylinderCount: number;
  threshold: number;
}

export function CylinderCompressionInput({ enabled, onEnabledChange, values, onValuesChange, cylinderCount, threshold }: Props) {
  const slots = Array.from({ length: cylinderCount }, (_, i) => values[i] ?? "");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Cylinder Compression</h3>
          <p className="text-xs text-muted-foreground">
            {cylinderCount} cylinders · warning below {threshold}/{COMPRESSION_MAX} (set in the aircraft profile)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="record_compression" className="text-sm">Record compression</Label>
          <Switch id="record_compression" checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </div>
      {enabled && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {slots.map((v, i) => {
            const n = parseCompression(v);
            const invalid = v !== "" && n === null;
            const low = n !== null && isLowCompression(n, threshold);
            return (
              <div key={i} className="space-y-1">
                <Label htmlFor={`cyl_${i}`}>Cyl {i + 1} *</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id={`cyl_${i}`}
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="XX"
                    value={v}
                    aria-invalid={invalid}
                    className={invalid || low ? "border-destructive" : ""}
                    onChange={(e) => {
                      const next = [...slots];
                      next[i] = e.target.value.replace(/\D/g, "").slice(0, 2);
                      onValuesChange(next);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">/{COMPRESSION_MAX}</span>
                </div>
                {invalid && <p className="text-xs text-destructive">0–{COMPRESSION_MAX}</p>}
                {low && (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" /> Low
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CompressionReadings({ readings, threshold }: { readings: number[]; threshold: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {readings.map((n, i) => (
        <Badge key={i} variant={isLowCompression(n, threshold) ? "destructive" : "secondary"} className="tabular-nums">
          Cyl {i + 1}: {String(n).padStart(2, "0")}/{COMPRESSION_MAX}
        </Badge>
      ))}
    </div>
  );
}
