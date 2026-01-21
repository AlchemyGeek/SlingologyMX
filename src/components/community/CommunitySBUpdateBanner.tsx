import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Bell, ExternalLink } from "lucide-react";
import { useCommunitySBUpdateNotifications } from "@/hooks/useCommunitySBs";

interface CommunitySBUpdateBannerProps {
  userId: string;
  onViewUpdate?: (communitySbId: string, localDirectiveId: string | null) => void;
}

const CommunitySBUpdateBanner = ({ userId, onViewUpdate }: CommunitySBUpdateBannerProps) => {
  const { notifications, unreadCount, dismissNotification, markAsRead } =
    useCommunitySBUpdateNotifications(userId);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {notifications.slice(0, 3).map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${
            notification.is_read
              ? "bg-muted/50 border-border"
              : "bg-primary/5 border-primary/30"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {notification.community_service_bulletins?.title || "Community SB"} updated
              </p>
              <p className="text-xs text-muted-foreground">
                v{notification.old_version_number} → v{notification.new_version_number}
                {notification.version_notes && `: ${notification.version_notes}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!notification.is_read && (
              <Badge variant="default" className="text-xs">
                New
              </Badge>
            )}
            {onViewUpdate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  markAsRead(notification.id);
                  onViewUpdate(notification.community_sb_id, notification.local_directive_id);
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => dismissNotification(notification.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
      {notifications.length > 3 && (
        <p className="text-xs text-muted-foreground text-center">
          +{notifications.length - 3} more updates
        </p>
      )}
    </div>
  );
};

export default CommunitySBUpdateBanner;
