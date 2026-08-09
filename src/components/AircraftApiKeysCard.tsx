import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Plus, Copy, Trash2, Check } from "lucide-react";

interface ApiKey {
  id: string;
  aircraft_id: string;
  label: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface AircraftApiKeysCardProps {
  aircraftId: string;
  registration: string;
}

export function AircraftApiKeysCard({ aircraftId, registration }: AircraftApiKeysCardProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revokingKey, setRevokingKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    const { data, error } = await supabase
      .from("aircraft_api_keys")
      .select("id, aircraft_id, label, created_at, updated_at, last_used_at, revoked_at")
      .eq("aircraft_id", aircraftId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading API keys:", error);
      toast.error("Failed to load integration keys");
      return;
    }

    setKeys((data as ApiKey[]) || []);
    setLoading(false);
  }, [aircraftId]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const generateKey = async () => {
    const label = newLabel.trim() || "Integration";
    setGenerating(true);

    try {
      const plaintext = `mx_${crypto.randomUUID().replace(/-/g, "")}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(plaintext));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase.from("aircraft_api_keys").insert({
        aircraft_id: aircraftId,
        key_hash: keyHash,
        label,
      });

      if (error) throw error;

      setGeneratedKey(plaintext);
      setNewLabel("");
      await loadKeys();
    } catch (error: any) {
      console.error("Error generating API key:", error);
      toast.error("Failed to generate key");
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async () => {
    if (!revokingKey) return;

    try {
      const { error } = await supabase
        .from("aircraft_api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", revokingKey.id);

      if (error) throw error;

      toast.success("Integration key revoked");
      setRevokingKey(null);
      await loadKeys();
    } catch (error: any) {
      console.error("Error revoking API key:", error);
      toast.error("Failed to revoke key");
    }
  };

  const copyKey = async () => {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

  const formatLastUsed = (date: string | null) => {
    if (!date) return "Never used";
    return new Date(date).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Integrations
            </CardTitle>
            <CardDescription>
              API keys for {registration}
            </CardDescription>
          </div>
          <Button onClick={() => setIsGenerateOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Generate Key</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading keys...</p>
        ) : activeKeys.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No integration keys yet.</p>
            <p className="text-xs mt-1">Generate a key to connect SlingologyRamp or future apps.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{key.label}</span>
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(key.created_at).toLocaleDateString()} · {formatLastUsed(key.last_used_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRevokingKey(key)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {revokedKeys.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Revoked keys</p>
            <div className="space-y-2">
              {revokedKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50 opacity-60"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{key.label}</span>
                      <Badge variant="secondary" className="text-[10px]">Revoked</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Revoked {new Date(key.revoked_at!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Generate Key Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Integration Key</DialogTitle>
            <DialogDescription>
              Create a new API key for {registration}. This key can only be used to send transactions into this aircraft.
            </DialogDescription>
          </DialogHeader>

          {!generatedKey ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-label">Label</Label>
                <Input
                  id="key-label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Ramp"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">A name so you remember what this key is for.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Your API key</Label>
                <div className="flex gap-2">
                  <Input readOnly value={generatedKey} className="font-mono text-xs" />
                  <Button onClick={copyKey} variant="outline" size="icon">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-destructive font-medium">
                  Copy this now. MX stores only a hash and cannot show it again.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {!generatedKey ? (
              <>
                <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={generateKey} disabled={generating}>
                  {generating ? "Generating..." : "Generate Key"}
                </Button>
              </>
            ) : (
              <Button onClick={() => { setIsGenerateOpen(false); setGeneratedKey(null); }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokingKey} onOpenChange={(open) => !open && setRevokingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Integration Key?</AlertDialogTitle>
            <AlertDialogDescription>
              The key <strong>{revokingKey?.label}</strong> will stop working immediately. Any app using it will need a new key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revokeKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
