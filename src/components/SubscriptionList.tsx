import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";

interface SubscriptionListProps {
  subscriptions: any[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (subscription: any) => void;
}

const SubscriptionList = ({ subscriptions, loading, onUpdate, onEdit }: SubscriptionListProps) => {
  const handleDelete = async (id: string) => {
    try {
      // The notification will be automatically deleted due to ON DELETE CASCADE
      const { error } = await supabase.from("subscriptions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Subscription deleted");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete subscription");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading subscriptions...</p>;
  }

  if (subscriptions.length === 0) {
    return <p className="text-muted-foreground">No subscriptions yet. Create your first one!</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Initial Date</TableHead>
            <TableHead>Recurrence</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((subscription) => (
            <TableRow key={subscription.id}>
              <TableCell className="font-medium">{subscription.subscription_name}</TableCell>
              <TableCell className="max-w-[200px] truncate" title={subscription.type}>
                {subscription.type}
              </TableCell>
              <TableCell>${subscription.cost}</TableCell>
              <TableCell>{parseLocalDate(subscription.initial_date).toLocaleDateString()}</TableCell>
              <TableCell>{subscription.recurrence}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(subscription)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(subscription.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SubscriptionList;