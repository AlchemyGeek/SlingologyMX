import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CounterNotificationListProps {
  notifications: any[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (notification: any) => void;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
}

const counterTypeToFieldMap: Record<string, string> = {
  "Hobbs": "hobbs",
  "Tach": "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

type AlertStatus = "normal" | "reminder" | "due";

const CounterNotificationList = ({ notifications, loading, onUpdate, onEdit, currentCounters }: CounterNotificationListProps) => {
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

  const getCounterProgress = (notification: any) => {
    if (!currentCounters || !notification.counter_type) return null;
    const field = counterTypeToFieldMap[notification.counter_type];
    const currentValue = currentCounters[field as keyof typeof currentCounters] || 0;
    const targetValue = notification.initial_counter_value || 0;
    const remaining = targetValue - currentValue;
    return { currentValue, targetValue, remaining };
  };

  const getCounterAlertStatus = (notification: any): AlertStatus => {
    if (notification.is_completed) return "normal";
    
    const progress = getCounterProgress(notification);
    if (!progress) return "normal";
    
    const alertHours = notification.alert_hours ?? 10;
    
    if (progress.remaining <= 0) return "due";
    if (progress.remaining <= alertHours) return "reminder";
    return "normal";
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading notifications...</p>;
  }

  if (notifications.length === 0) {
    return <p className="text-muted-foreground">No counter-based notifications yet. Create your first one!</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Notification</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Component</TableHead>
            <TableHead>Counter</TableHead>
            <TableHead>Due At</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Recurrence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((notification) => {
            const progress = getCounterProgress(notification);
            const isOverdue = progress && progress.remaining <= 0;
            const alertStatus = getCounterAlertStatus(notification);
            const showLinkIcon = isLinkedToRecord(notification) && !isUserModified(notification);
            const rowClassName = cn(
              alertStatus === "reminder" && "bg-orange-500/10 hover:bg-orange-500/20",
              alertStatus === "due" && "bg-destructive/10 hover:bg-destructive/20"
            );
            
            return (
              <TableRow key={notification.id} className={rowClassName}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {notification.description}
                    {showLinkIcon && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link className="h-4 w-4 text-primary flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>System-managed notification</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>{notification.type}</TableCell>
                <TableCell>{notification.component}</TableCell>
                <TableCell>{notification.counter_type}</TableCell>
                <TableCell>{notification.initial_counter_value?.toFixed(1)}</TableCell>
                <TableCell>
                  {progress && (
                    <span className={isOverdue ? "text-destructive font-medium" : ""}>
                      {progress.remaining.toFixed(1)} hrs
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {notification.counter_step ? `Every ${notification.counter_step} hrs` : "None"}
                </TableCell>
                <TableCell>
                  <Badge variant={notification.is_completed ? "secondary" : isOverdue ? "destructive" : "default"}>
                    {notification.is_completed ? "Completed" : isOverdue ? "Due" : "Active"}
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

export default CounterNotificationList;