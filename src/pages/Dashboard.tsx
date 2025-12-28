import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, User as UserIcon } from "lucide-react";
import slingologyIcon from "@/assets/slingology-icon.png";
import { parseLocalDate } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar, DashboardView } from "@/components/DashboardSidebar";
import ActiveNotificationsPanel from "@/components/ActiveNotificationsPanel";
import HistoryPanel from "@/components/HistoryPanel";
import CalendarPanel from "@/components/CalendarPanel";
import MaintenanceLogsPanel from "@/components/MaintenanceLogsPanel";
import SubscriptionsPanel from "@/components/SubscriptionsPanel";
import EquipmentPanel from "@/components/EquipmentPanel";
import DirectivesPanel from "@/components/DirectivesPanel";
import AircraftCountersDisplay from "@/components/AircraftCountersDisplay";
import CountersPanel from "@/components/CountersPanel";
import { useAircraftCounters } from "@/hooks/useAircraftCounters";
import { AircraftSwitcher } from "@/components/AircraftSwitcher";
import { useAircraft } from "@/contexts/AircraftContext";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

const counterTypeToFieldMap: Record<string, string> = {
  Hobbs: "hobbs",
  Tach: "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date().toDateString());
  const [activeView, setActiveView] = useState<DashboardView>("calendar");
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);
  const { selectedAircraft } = useAircraft();
  const {
    counters,
    loading: countersLoading,
    updateCounter,
    updateAllCounters,
    refetch,
  } = useAircraftCounters(user?.id || "", selectedAircraft?.id || "");

  // Admin notifications hook
  const { notifications: adminNotifications, markAsSeen } = useAdminNotifications(user?.id, isAdmin);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdminStatus();
  }, [user?.id]);

  // Fetch active notifications for alert indicator
  const fetchActiveNotificationsForAlerts = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).eq("is_completed", false);

    setActiveNotifications(data || []);
  };

  useEffect(() => {
    if (!user?.id) return;

    fetchActiveNotificationsForAlerts();

    // Subscribe to notification changes
    const channel = supabase
      .channel("active-notifications-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        fetchActiveNotificationsForAlerts();
      })
      .subscribe();

    // Check for date change every minute
    const dateCheckInterval = setInterval(() => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
        fetchActiveNotificationsForAlerts();
      }
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(dateCheckInterval);
    };
  }, [user?.id, currentDate]);

  // Re-evaluate alerts when counters change
  useEffect(() => {
    if (counters && user?.id) {
      fetchActiveNotificationsForAlerts();
    }
  }, [
    counters?.hobbs,
    counters?.tach,
    counters?.airframe_total_time,
    counters?.engine_total_time,
    counters?.prop_total_time,
  ]);

  const hasActiveAlerts = useMemo(() => {
    if (!counters) return false;

    return activeNotifications.some((notification) => {
      if (notification.notification_basis === "Counter" || notification.counter_type) {
        // Counter-based
        if (!notification.counter_type) return false;
        const field = counterTypeToFieldMap[notification.counter_type];
        const currentValue = Number(counters[field as keyof typeof counters]) || 0;
        const targetValue = notification.initial_counter_value || 0;
        const remaining = targetValue - currentValue;
        const alertHours = notification.alert_hours ?? 10;
        return remaining <= alertHours;
      } else {
        // Date-based
        const dueDate = parseLocalDate(notification.initial_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const alertDays = notification.alert_days ?? 7;
        return diffDays <= alertDays;
      }
    });
  }, [activeNotifications, counters]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore errors - session might already be invalid
    }
    // Clear state immediately to prevent stale data
    setUser(null);
    setSession(null);
    toast.success("Logged out successfully");
    navigate("/");
  };

  const currentCounters = counters
    ? {
        hobbs: counters.hobbs || 0,
        tach: counters.tach || 0,
        airframe_total_time: counters.airframe_total_time || 0,
        engine_total_time: counters.engine_total_time || 0,
        prop_total_time: counters.prop_total_time || 0,
      }
    : undefined;

  const renderContent = () => {
    switch (activeView) {
      case "calendar":
        return (
          <CalendarPanel
            userId={user!.id}
            aircraftId={selectedAircraft?.id || ""}
            refreshKey={recordsRefreshKey}
            currentCounters={currentCounters}
          />
        );
      case "counters":
        return (
          <CountersPanel
            userId={user!.id}
            aircraftId={selectedAircraft?.id || ""}
            currentCounters={currentCounters}
          />
        );
      case "notifications":
        return (
          <ActiveNotificationsPanel
            userId={user!.id}
            aircraftId={selectedAircraft?.id || ""}
            currentCounters={currentCounters}
            onNotificationCompleted={fetchActiveNotificationsForAlerts}
            refreshKey={recordsRefreshKey}
          />
        );
      case "history":
        return <HistoryPanel userId={user!.id} aircraftId={selectedAircraft?.id || ""} refreshKey={recordsRefreshKey} />;
      case "subscriptions":
        return (
          <SubscriptionsPanel
            userId={user!.id}
            aircraftId={selectedAircraft?.id || ""}
            onNotificationChanged={fetchActiveNotificationsForAlerts}
            onRecordChanged={() => setRecordsRefreshKey((k) => k + 1)}
          />
        );
      case "equipment":
        return (
          <EquipmentPanel
            userId={user!.id}
            aircraftId={selectedAircraft?.id || ""}
            onRecordChanged={() => setRecordsRefreshKey((k) => k + 1)}
          />
        );
      case "maintenance":
        return (
          <MaintenanceLogsPanel
            userId={user!.id}
            aircraftId={selectedAircraft?.id || ""}
            counters={counters}
            onUpdateGlobalCounters={(updates) => updateAllCounters(updates, "Maintenance Record")}
            onRecordChanged={() => setRecordsRefreshKey((k) => k + 1)}
          />
        );
      case "directives":
        return (
          <DirectivesPanel
            userId={user!.id}
            aircraftId={selectedAircraft?.id || ""}
            onRecordChanged={() => setRecordsRefreshKey((k) => k + 1)}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <header className="border-b z-10">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="mr-2" />
              <img src={slingologyIcon} alt="SlingologyMX" className="h-8 w-8" />
              <h1 className="text-2xl font-bold hidden sm:block">SlingologyMX</h1>
              <div className="ml-4">
                <AircraftSwitcher />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (isAdmin) {
                    markAsSeen("users");
                  }
                  navigate("/profile");
                }}
                className="relative"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Profile
                {isAdmin && adminNotifications.newUsers && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <DashboardSidebar
            activeView={activeView}
            onViewChange={setActiveView}
            hasActiveAlerts={hasActiveAlerts}
            adminNotifications={isAdmin ? adminNotifications : undefined}
            onMarkNotificationSeen={isAdmin ? markAsSeen : undefined}
          />

          <main className="flex-1 p-6 space-y-6 overflow-auto min-w-0">
            <div className="min-w-[600px]">
            <AircraftCountersDisplay
              counters={counters}
              loading={countersLoading}
              userId={user.id}
              aircraftId={selectedAircraft?.id || ""}
              onUpdateCounter={updateCounter}
              onUpdateAllCounters={(updates) => updateAllCounters(updates, "Dashboard")}
              onRefetch={refetch}
            />

              <div className="bg-card rounded-lg border p-6">
                {renderContent()}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
