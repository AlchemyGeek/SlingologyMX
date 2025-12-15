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
  console.log("NotificationList rendered with", notifications.length, "notifications:", notifications.map(n => ({ desc: n.description, maint_log_id: n.maintenance_log_id, user_modified: n.user_modified })));
  
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      toast.success("Notification deleted");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete notification");
    }
  };

  const isLinkedToRecord = (notification: any) => 
    !!notification.subscription_id || !!notification.maintenance_log_id || !!notification.directive_id;
  const isUserModified = (notification: any) => notification.user_modified === true;

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
            <TableHead>Initial Date</TableHead>
            <TableHead>Recurrence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((notification) => {
            const alertStatus = getDateAlertStatus(notification);
            const linked = isLinkedToRecord(notification);
            const modified = isUserModified(notification);
            const showLinkIcon = linked && !modified;
            console.log("Notification link debug:", notification.description, { maintenance_log_id: notification.maintenance_log_id, subscription_id: notification.subscription_id, directive_id: notification.directive_id, user_modified: notification.user_modified, showLinkIcon });
            const rowClassName = cn(
              alertStatus === "reminder" && "bg-orange-500/10 hover:bg-orange-500/20",
              alertStatus === "due" && "bg-destructive/10 hover:bg-destructive/20"
            );
            return (
              <TableRow key={notification.id} className={rowClassName}>
                <TableCell className="font-medium">
                  {notification.description}
                  {showLinkIcon && (
                    <Tooltip>
                      <TooltipTrigger className="inline align-middle ml-1">
                        <Link size={16} className="text-primary" style={{ width: 16, height: 16, minWidth: 16, minHeight: 16 }} />
                      </TooltipTrigger>
                      <TooltipContent>System-managed notification</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{notification.type}</TableCell>
                <TableCell>{parseLocalDate(notification.initial_date).toLocaleDateString()}</TableCell>
                <TableCell>{notification.recurrence}</TableCell>
                <TableCell>
                  <Badge variant={notification.is_completed ? "secondary" : "default"}>
                    {notification.is_completed ? "Completed" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(notification)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(notification.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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