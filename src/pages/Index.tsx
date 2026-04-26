import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import slingologyIcon from "@/assets/slingology-icon.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-6 p-8">
        <Alert className="max-w-2xl mx-auto text-left bg-card/80 backdrop-blur">
          <Info className="h-4 w-4" />
          <AlertTitle>MX availability update</AlertTitle>
          <AlertDescription>
            <p className="mt-2">
              <span className="font-medium">Update (April 2026):</span> MX is no longer publicly available. I continue to use it privately and actively expand its capabilities, and it may become public again in the future. If you're interested, the project is available on{" "}
              <a
                href="https://github.com/slingology/slingologymx"
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
        <img src={slingologyIcon} alt="SlingologyMX" className="h-48 w-48 mx-auto" />
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Built by Experimental Owners. Free to use. Your data stays yours. No lock-ins. Paper logs remain the master.
        </p>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
