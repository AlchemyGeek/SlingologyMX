import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import slingologyIcon from "@/assets/slingology-icon.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <img src={slingologyIcon} alt="SlingologyMX" className="h-48 w-48 mx-auto" />
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Built by Experimental Owners. Free to use. Your data stays yours. No lock-ins. Paper logs remain the master.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
          </Button>
        </div>
      </div>
      <div className="w-full p-6">
        <Alert className="max-w-2xl mx-auto text-left bg-card/80 backdrop-blur border-[hsl(20_90%_45%)]/40">
          <Info className="h-4 w-4 text-[hsl(20_90%_45%)]" />
          <AlertTitle className="text-[hsl(20_90%_45%)] font-bold uppercase tracking-wide">
            MX AVAILABILITY UPDATE
          </AlertTitle>
          <AlertDescription>
            <p className="mt-2">
              <span className="font-medium">Update (April 2026):</span> MX is no longer publicly available. I continue to use it privately and actively expand its capabilities, and it may become public again in the future. If you're interested, the project is available on{" "}
              <a
                href="https://github.com/AlchemyGeek/SlingologyMX"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium text-primary"
              >
                GitHub
              </a>
              —feel free to download it and host it yourself.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default Index;
