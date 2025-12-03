import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, parseLocalDate } from "@/lib/utils";

interface NotificationListProps {
  notifications: any[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (notification: any) => void;
}

type AlertStatus = "normal" | "reminder" | "due";

const getDateAlertStatus = (notification: any): AlertStatus => {
  if (notification.is_completed) return "normal";
  
  const dueDate = parseLocalDate(notification.initial_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const alertDays = notification.alert_days ?? 7;
  
  if (diffDays <= 0) return "due";
  if (diffDays <= alertDays) return "reminder";
  return "normal";
};

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
            const alertStatus = getDateAlertStatus(notification);
            const rowClassName = cn(
              alertStatus === "reminder" && "bg-orange-500/10 hover:bg-orange-500/20",
              alertStatus === "due" && "bg-destructive/10 hover:bg-destructive/20"
            );
            return (
              <TableRow key={notification.id} className={rowClassName}>
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
                <TableCell>{parseLocalDate(notification.initial_date).toLocaleDateString()}</TableCell>
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