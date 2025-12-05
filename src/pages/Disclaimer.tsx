import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield } from "lucide-react";
import slingologyIcon from "@/assets/slingology-icon.png";

const Disclaimer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      // Check if user has already acknowledged the disclaimer this session
      const acknowledged = sessionStorage.getItem("disclaimer_acknowledged");
      if (acknowledged === "true") {
        navigate("/dashboard");
        return;
      }
      
      setLoading(false);
    };
    
    checkSession();
  }, [navigate]);

  const handleAcknowledge = () => {
    sessionStorage.setItem("disclaimer_acknowledged", "true");
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-2xl border-2 border-destructive/50 shadow-xl">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center mb-2">
            <img src={slingologyIcon} alt="SlingologyMX" className="h-16 w-16" />
          </div>
          <div className="flex items-center justify-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <CardTitle className="text-3xl font-bold text-destructive">
              Early Adopter Disclaimer
            </CardTitle>
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 space-y-4">
            <p className="text-foreground font-semibold text-lg leading-relaxed">
              This is an <span className="text-destructive font-bold">Early Adopter phase</span> of the project, intended solely for gathering feedback. No decision has been made about releasing this service publicly. All data you enter during this phase may be deleted at any time as the project evolves.
            </p>
            
            <p className="text-foreground leading-relaxed">
              We'll continue improving the prototype and do our best to keep things stable, but there are <span className="font-bold text-destructive">no guarantees</span> regarding uptime, availability, or uninterrupted functionality.
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-foreground font-semibold text-lg mb-2">
                  Protect Your Data
                </p>
                <p className="text-foreground leading-relaxed">
                  Your <span className="font-bold">paper logbooks and your own digitized scans</span> should always remain your primary source of truth. Please keep your own backups—use the <span className="font-semibold text-primary">Export option in your profile</span> to save anything you need.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
            <p className="text-muted-foreground font-medium">
              By using this site, you acknowledge that you do so <span className="text-foreground font-bold">at your own risk</span>.
            </p>
          </div>

          <Button 
            onClick={handleAcknowledge} 
            className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90"
          >
            I Understand and Accept
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Disclaimer;
