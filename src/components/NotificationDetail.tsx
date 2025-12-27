import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Clock, Bell, RefreshCw } from "lucide-react";
import { parseLocalDate } from "@/lib/utils";
import { format } from "date-fns";

interface NotificationDetailProps {
  notification: any;
  onClose: () => void;
}

const NotificationDetail = ({ notification, onClose }: NotificationDetailProps) => {
  const isCounterBased = notification.notification_basis === "Counter";
  const isRecurring = notification.recurrence !== "None";

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{notification.description}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default">{notification.type}</Badge>
                <Badge variant={notification.is_completed ? "secondary" : "outline"}>
                  {notification.is_completed ? "Completed" : "Active"}
                </Badge>
                <Badge variant={isRecurring ? "default" : "outline"}>
                  {isRecurring ? "Recurring" : "One-Time"}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Notification Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{notification.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Initial Date</p>
                  <p className="font-medium">
                    {format(parseLocalDate(notification.initial_date), "PPP")}
                  </p>
                </div>
              </div>
              {notification.completed_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed At</p>
                    <p className="font-medium">
                      {format(new Date(notification.completed_at), "PPP p")}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Recurrence</p>
                  <p className="font-medium">{notification.recurrence}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notification Basis */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Notification Basis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Basis Type</p>
                <p className="font-medium">{notification.notification_basis}</p>
              </div>
              {isCounterBased ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Counter Type</p>
                    <p className="font-medium">{notification.counter_type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Initial Counter Value</p>
                    <p className="font-medium">{notification.initial_counter_value ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Counter Step</p>
                    <p className="font-medium">{notification.counter_step ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Alert Hours Before</p>
                    <p className="font-medium">{notification.alert_hours ?? 10} hours</p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Alert Days Before</p>
                  <p className="font-medium">{notification.alert_days ?? 7} days</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {notification.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{notification.notes}</p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4">Record Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {notification.created_at
                    ? format(new Date(notification.created_at), "PPP p")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {notification.updated_at
                    ? format(new Date(notification.updated_at), "PPP p")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDetail;
