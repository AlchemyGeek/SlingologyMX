import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plane, LogOut } from "lucide-react";
import NotificationsPanel from "@/components/NotificationsPanel";
import ActiveNotificationsPanel from "@/components/ActiveNotificationsPanel";
import HistoryPanel from "@/components/HistoryPanel";
import CalendarPanel from "@/components/CalendarPanel";
import MaintenanceLogsPanel from "@/components/MaintenanceLogsPanel";
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
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
    return <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>;
  }
  if (!user) {
    return null;
  }
  return <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">SlingologyMX</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="manage" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="manage">Manage Notifications</TabsTrigger>
            <TabsTrigger value="active">Active Notifications</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="logs">Maintenance Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="manage">
            <NotificationsPanel userId={user.id} />
          </TabsContent>

          <TabsContent value="active">
            <ActiveNotificationsPanel userId={user.id} />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarPanel userId={user.id} />
          </TabsContent>

          <TabsContent value="history">
            <HistoryPanel userId={user.id} />
          </TabsContent>

          <TabsContent value="logs">
            <MaintenanceLogsPanel userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>;
};
export default Dashboard;