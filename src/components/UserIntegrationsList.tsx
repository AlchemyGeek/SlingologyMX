import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Key, Trash2, Plane } from "lucide-react";

interface ApiKeyWithAircraft {
  id: string;
  aircraft_id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  aircraft: {
    registration: string;
  } | null;
}

export function UserIntegrationsList() {
  const [keys, setKeys] = useState<ApiKeyWithAircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingKey, setRevokingKey] = useState<ApiKeyWithAircraft | null>(null);

  const loadKeys = useCallback(async () => {
    const { data, error } = await supabase
      .from("aircraft_api_keys")
      .select("id, aircraft_id, label, created_at, last_used_at, revoked_at, aircraft(registration)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading integration keys:", error);
      toast.error("Failed to load integration keys");
      return;
    }

    setKeys((data as ApiKeyWithAircraft[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

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

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

  const formatLastUsed = (date: string | null) => {
    if (!date) return "Never used";
    return new Date(date).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          All Integrations
        </CardTitle>
        <CardDescription>
          API keys across all your aircraft. Generate or revoke keys from each aircraft&apos;s profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading keys...</p>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No integration keys yet.</p>
            <p className="text-xs mt-1">Go to the Aircraft tab to generate keys for each aircraft.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeKeys.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
                {activeKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{key.label}</span>
                        <Badge variant="outline" className="text-[10px]">Active</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Plane className="h-3 w-3" />
                        <span>{key.aircraft?.registration || "Unknown aircraft"}</span>
                        <span>·</span>
                        <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>{formatLastUsed(key.last_used_at)}</span>
                      </div>
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
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revoked</p>
                {revokedKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50 opacity-60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{key.label}</span>
                        <Badge variant="secondary" className="text-[10px]">Revoked</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Plane className="h-3 w-3" />
                        <span>{key.aircraft?.registration || "Unknown aircraft"}</span>
                        <span>·</span>
                        <span>Revoked {new Date(key.revoked_at!).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <AlertDialog open={!!revokingKey} onOpenChange={(open) => !open && setRevokingKey(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke Integration Key?</AlertDialogTitle>
              <AlertDialogDescription>
                The key <strong>{revokingKey?.label}</strong> for {revokingKey?.aircraft?.registration} will stop working immediately.
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
      </CardContent>
    </Card>
  );
}
