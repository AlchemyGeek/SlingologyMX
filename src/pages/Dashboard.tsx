import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, Lightbulb, User as UserIcon, BookOpen, AlertCircle } from "lucide-react";
import slingologyIcon from "@/assets/slingology-icon.png";
import NotificationsPanel from "@/components/NotificationsPanel";
import ActiveNotificationsPanel from "@/components/ActiveNotificationsPanel";
import HistoryPanel from "@/components/HistoryPanel";
import CalendarPanel from "@/components/CalendarPanel";
import MaintenanceLogsPanel from "@/components/MaintenanceLogsPanel";
import SubscriptionsPanel from "@/components/SubscriptionsPanel";
import DirectivesPanel from "@/components/DirectivesPanel";
import AircraftCountersDisplay from "@/components/AircraftCountersDisplay";
import { useAircraftCounters } from "@/hooks/useAircraftCounters";

const counterTypeToFieldMap: Record<string, string> = {
  "Hobbs": "hobbs",
  "Tach": "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date().toDateString());
  const { counters, loading: countersLoading, updateCounter, updateAllCounters, refetch } = useAircraftCounters(user?.id || "");

  // Fetch active notifications for alert indicator
  const fetchActiveNotificationsForAlerts = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_completed", false);
    
    setActiveNotifications(data || []);
  };

  useEffect(() => {
    if (!user?.id) return;

    fetchActiveNotificationsForAlerts();

    // Subscribe to notification changes
    const channel = supabase
      .channel('active-notifications-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
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
  }, [counters?.hobbs, counters?.tach, counters?.airframe_total_time, counters?.engine_total_time, counters?.prop_total_time]);

  const hasActiveAlerts = useMemo(() => {
    if (!counters) return false;
    
    return activeNotifications.some(notification => {
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
        const dueDate = new Date(notification.initial_date);
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
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={slingologyIcon} alt="SlingologyMX" className="h-8 w-8" />
            <h1 className="text-2xl font-bold">SlingologyMX</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open("https://slingology.blog/category/mx/?utm_source=slingology-mx", "_blank")}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Blog
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <UserIcon className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/feature-requests")}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Feature Requests
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <AircraftCountersDisplay
          counters={counters}
          loading={countersLoading}
          userId={user.id}
          onUpdateCounter={updateCounter}
          onRefetch={refetch}
        />
        <Tabs defaultValue="manage" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="manage" className="flex items-center gap-1">
              Notifications
              {hasActiveAlerts && <AlertCircle className="h-4 w-4 text-destructive" />}
            </TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-1">
              Active
              {hasActiveAlerts && <AlertCircle className="h-4 w-4 text-destructive" />}
            </TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="logs">Maintenance</TabsTrigger>
            <TabsTrigger value="directives">Directives</TabsTrigger>
          </TabsList>

          <TabsContent value="manage">
            <NotificationsPanel 
              userId={user.id} 
              currentCounters={counters ? {
                hobbs: counters.hobbs || 0,
                tach: counters.tach || 0,
                airframe_total_time: counters.airframe_total_time || 0,
                engine_total_time: counters.engine_total_time || 0,
                prop_total_time: counters.prop_total_time || 0,
              } : undefined}
            />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionsPanel userId={user.id} />
          </TabsContent>

          <TabsContent value="active">
            <ActiveNotificationsPanel 
              userId={user.id} 
              currentCounters={counters ? {
                hobbs: counters.hobbs || 0,
                tach: counters.tach || 0,
                airframe_total_time: counters.airframe_total_time || 0,
                engine_total_time: counters.engine_total_time || 0,
                prop_total_time: counters.prop_total_time || 0,
              } : undefined}
              onNotificationCompleted={fetchActiveNotificationsForAlerts}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarPanel 
              userId={user.id} 
              currentCounters={counters ? {
                hobbs: counters.hobbs || 0,
                tach: counters.tach || 0,
                airframe_total_time: counters.airframe_total_time || 0,
                engine_total_time: counters.engine_total_time || 0,
                prop_total_time: counters.prop_total_time || 0,
              } : undefined}
            />
          </TabsContent>

          <TabsContent value="history">
            <HistoryPanel userId={user.id} />
          </TabsContent>

          <TabsContent value="logs">
            <MaintenanceLogsPanel 
              userId={user.id} 
              counters={counters} 
              onUpdateGlobalCounters={(updates) => updateAllCounters(updates, "Maintenance Record")}
            />
          </TabsContent>

          <TabsContent value="directives">
            <DirectivesPanel userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
export default Dashboard;
