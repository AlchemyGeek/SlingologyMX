// Update this page (the content is just a fallback if you fail to update the page)

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import slingologyIcon from "@/assets/slingology-icon.png";
const Index = () => {
  const navigate = useNavigate();
  
  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-6 p-8">
        <img src={slingologyIcon} alt="SlingologyMX" className="h-48 w-48 mx-auto" />
        <p className="text-xl text-muted-foreground max-w-md mx-auto">Built by Experimental Owners. Free to use. Your data stays yours. No lock-ins. Paper logs remain the master.</p>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Get Started
        </Button>
      </div>
    </div>;
};
export default Index;