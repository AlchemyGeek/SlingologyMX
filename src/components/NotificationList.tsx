import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NotificationListProps {
  notifications: any[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (notification: any) => void;
}

const NotificationList = ({ notifications, loading, onUpdate, onEdit }: NotificationListProps) => {
  const handleDelete = async (id: string, subscriptionId: string | null) => {
    if (subscriptionId) {
      toast.error("This notification is linked to a subscription. Delete the subscription instead.");
      return;
    }
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      toast.success("Notification deleted");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete notification");
    }
  };

  const isLinkedToSubscription = (notification: any) => !!notification.subscription_id;

  if (loading) {
    return <p className="text-muted-foreground">Loading notifications...</p>;
  }

  if (notifications.length === 0) {
    return <p className="text-muted-foreground">No notifications yet. Create your first one!</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Notification</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Component</TableHead>
            <TableHead>Initial Date</TableHead>
            <TableHead>Recurrence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((notification) => {
            const linkedToSub = isLinkedToSubscription(notification);
            return (
              <TableRow key={notification.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {notification.description}
                    {linkedToSub && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Link className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>Linked to subscription</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>{notification.type}</TableCell>
                <TableCell>{notification.component}</TableCell>
                <TableCell>{new Date(notification.initial_date).toLocaleDateString()}</TableCell>
                <TableCell>{notification.recurrence}</TableCell>
                <TableCell>
                  <Badge variant={notification.is_completed ? "secondary" : "default"}>
                    {notification.is_completed ? "Completed" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {linkedToSub ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button variant="ghost" size="icon" disabled>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Edit via Subscriptions tab</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(notification)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(notification.id, notification.subscription_id)}
                      disabled={linkedToSub}
                    >
                      <Trash2 className={`h-4 w-4 ${linkedToSub ? "text-muted-foreground" : "text-destructive"}`} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default NotificationList;