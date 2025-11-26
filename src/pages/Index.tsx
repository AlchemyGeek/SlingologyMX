// Update this page (the content is just a fallback if you fail to update the page)

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plane } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-6 p-8">
        <Plane className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-5xl font-bold">Aircraft Maintenance Tracker</h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Keep your experimental aircraft in top condition with organized maintenance notifications and records
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
