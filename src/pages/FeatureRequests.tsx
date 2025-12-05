import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, User as UserIcon, Lightbulb, BookOpen } from "lucide-react";
import { toast } from "sonner";
import slingologyIcon from "@/assets/slingology-icon.png";
import FeatureRequestForm from "@/components/FeatureRequestForm";
import FeatureRequestList from "@/components/FeatureRequestList";

const FeatureRequests = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleFeatureSubmitted = () => {
    setRefreshKey((prev) => prev + 1);
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <img src={slingologyIcon} alt="SlingologyMX" className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Feature Requests</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(
                  "https://slingology.blog/category/mx/?utm_campaign=slingologymx&utm_source=service&utm_medium=menu",
                  "_blank",
                )
              }
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Blog
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <UserIcon className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FeatureRequestForm userId={user.id} onFeatureSubmitted={handleFeatureSubmitted} />
          </div>
          <div className="lg:col-span-2">
            <FeatureRequestList userId={user.id} refreshKey={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default FeatureRequests;
