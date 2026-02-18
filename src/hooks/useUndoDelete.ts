import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseUndoDeleteOptions {
  tableName: string;
  onBeforeDelete?: (id: string) => Promise<void>;
  onAfterDelete?: () => void;
  onAfterRestore?: () => void;
}

export function useUndoDelete({ tableName, onBeforeDelete, onAfterDelete, onAfterRestore }: UseUndoDeleteOptions) {
  const deleteWithUndo = async (id: string, snapshot: Record<string, any>) => {
    try {
      // Run pre-delete cascades
      if (onBeforeDelete) {
        await onBeforeDelete(id);
      }

      // Perform the actual delete
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Notify parent to refresh UI
      onAfterDelete?.();

      // Prepare the snapshot for re-insert (remove generated fields that would conflict)
      const restoreRecord = async () => {
        try {
          const { error: insertError } = await supabase
            .from(tableName as any)
            .insert(snapshot as any);

          if (insertError) throw insertError;

          onAfterRestore?.();
          toast.success("Restored.");
        } catch {
          toast.error("Undo unavailable.");
        }
      };

      toast("Deleted.", {
        duration: 20000,
        action: {
          label: "Undo",
          onClick: restoreRecord,
        },
      });
    } catch {
      toast.error("Failed to delete.");
    }
  };

  return { deleteWithUndo };
}
