import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { scanReceipt, type ScannedReceipt } from "@/lib/scanReceipt";

interface Props {
  aircraftId: string;
  kind: "transaction" | "maintenance";
  onResult: (r: ScannedReceipt) => void;
}

export function ReceiptScanButton({ aircraftId, kind, onResult }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [scanning, setScanning] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setScanning(true); setWarnings([]);
    try {
      const r = await scanReceipt(file, aircraftId, kind, ctrl.signal);
      onResult(r);
      setWarnings(r.warnings);
      toast.success("Receipt read — review the filled fields before saving.");
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message || "Unable to read this receipt.");
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-lg border border-dashed p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Scan a receipt or invoice to fill in what can be read. The file is read once and not saved.
        </p>
        <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
        {scanning ? (
          <Button type="button" variant="outline" size="sm" onClick={() => abortRef.current?.abort()}>
            <Loader2 className="h-4 w-4 animate-spin" /> Reading… <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <ScanLine className="h-4 w-4" /> Scan receipt
          </Button>
        )}
      </div>
      {warnings.length > 0 && (
        <ul className="text-xs text-muted-foreground list-disc pl-4">
          {warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}
