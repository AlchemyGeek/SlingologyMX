import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminNotificationCounts {
  newUsers: boolean;
  newBugReports: boolean;
  newFeatureRequests: boolean;
}

export function useAdminNotifications(userId: string | undefined, isAdmin: boolean) {
  const [notifications, setNotifications] = useState<AdminNotificationCounts>({
    newUsers: false,
    newBugReports: false,
    newFeatureRequests: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchNotificationStatus = useCallback(async () => {
    if (!userId || !isAdmin) {
      setLoading(false);
      return;
    }

    try {
      // Get last seen timestamps for this admin
      const { data: statusData } = await supabase
        .from("admin_notification_status")
        .select("notification_type, last_seen_at")
        .eq("user_id", userId);

      const lastSeenMap: Record<string, string> = {};
      statusData?.forEach((item: any) => {
        lastSeenMap[item.notification_type] = item.last_seen_at;
      });

      // Check for new users (profiles created after last seen)
      const usersLastSeen = lastSeenMap["users"];
      let hasNewUsers = false;
      if (usersLastSeen) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gt("created_at", usersLastSeen);
        hasNewUsers = (count || 0) > 0;
      } else {
        // If never seen, check if there are any users at all (other than current admin)
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .neq("id", userId);
        hasNewUsers = (count || 0) > 0;
      }

      // Check for new bug reports
      const bugReportsLastSeen = lastSeenMap["bug_reports"];
      let hasNewBugReports = false;
      if (bugReportsLastSeen) {
        const { count } = await supabase
          .from("bug_reports")
          .select("*", { count: "exact", head: true })
          .gt("created_at", bugReportsLastSeen);
        hasNewBugReports = (count || 0) > 0;
      } else {
        const { count } = await supabase
          .from("bug_reports")
          .select("*", { count: "exact", head: true });
        hasNewBugReports = (count || 0) > 0;
      }

      // Check for new feature requests
      const featureRequestsLastSeen = lastSeenMap["feature_requests"];
      let hasNewFeatureRequests = false;
      if (featureRequestsLastSeen) {
        const { count } = await supabase
          .from("feature_requests")
          .select("*", { count: "exact", head: true })
          .gt("created_at", featureRequestsLastSeen);
        hasNewFeatureRequests = (count || 0) > 0;
      } else {
        const { count } = await supabase
          .from("feature_requests")
          .select("*", { count: "exact", head: true });
        hasNewFeatureRequests = (count || 0) > 0;
      }

      setNotifications({
        newUsers: hasNewUsers,
        newBugReports: hasNewBugReports,
        newFeatureRequests: hasNewFeatureRequests,
      });
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  const markAsSeen = useCallback(async (notificationType: "users" | "bug_reports" | "feature_requests") => {
    if (!userId || !isAdmin) return;

    try {
      const now = new Date().toISOString();
      
      // Upsert the last_seen_at timestamp
      const { error } = await supabase
        .from("admin_notification_status")
        .upsert(
          {
            user_id: userId,
            notification_type: notificationType,
            last_seen_at: now,
          },
          {
            onConflict: "user_id,notification_type",
          }
        );

      if (error) throw error;

      // Update local state
      setNotifications(prev => ({
        ...prev,
        newUsers: notificationType === "users" ? false : prev.newUsers,
        newBugReports: notificationType === "bug_reports" ? false : prev.newBugReports,
        newFeatureRequests: notificationType === "feature_requests" ? false : prev.newFeatureRequests,
      }));
    } catch (error) {
      console.error("Error marking notification as seen:", error);
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    fetchNotificationStatus();
  }, [fetchNotificationStatus]);

  return {
    notifications,
    loading,
    markAsSeen,
    refetch: fetchNotificationStatus,
  };
}
