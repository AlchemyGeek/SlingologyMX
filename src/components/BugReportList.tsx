import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Eye, Trash2 } from "lucide-react";
import BugReportDetail from "./BugReportDetail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type BugReport = Database["public"]["Tables"]["bug_reports"]["Row"];

interface BugReportListProps {
  userId: string;
  isAdmin: boolean;
  refreshKey: number;
  onBugChanged: () => void;
}

const BugReportList = ({
  userId,
  isAdmin,
  refreshKey,
  onBugChanged,
}: BugReportListProps) => {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bugToDelete, setBugToDelete] = useState<BugReport | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");

  const fetchBugs = async () => {
    try {
      const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBugs(data || []);
    } catch (error) {
      toast.error("Failed to load bug reports");
      console.error("Error fetching bugs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
  }, [refreshKey]);

  const handleDelete = async () => {
    if (!bugToDelete) return;

    try {
      const { error } = await supabase
        .from("bug_reports")
        .delete()
        .eq("id", bugToDelete.id);

      if (error) throw error;

      toast.success("Bug report deleted");
      setDeleteDialogOpen(false);
      setBugToDelete(null);
      onBugChanged();
    } catch (error) {
      toast.error("Failed to delete bug report");
      console.error("Error deleting bug:", error);
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "destructive";
      case "Major":
        return "destructive";
      case "Moderate":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Resolved":
        return "default";
      case "In Progress":
        return "secondary";
      case "Waiting for User":
        return "outline";
      case "Closed (Won't Fix)":
      case "Closed (Duplicate)":
        return "secondary";
      default:
        return "outline";
    }
  };

  const activeBugs = bugs.filter(
    (b) => !["Resolved", "Closed (Won't Fix)", "Closed (Duplicate)"].includes(b.status)
  );
  const resolvedBugs = bugs.filter((b) =>
    ["Resolved", "Closed (Won't Fix)", "Closed (Duplicate)"].includes(b.status)
  );

  const renderBugList = (bugList: BugReport[]) => {
    if (bugList.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-8">
          No bug reports in this category.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {bugList.map((bug) => {
          const isOwner = bug.user_id === userId;
          const canDelete = isOwner || isAdmin;

          return (
            <div
              key={bug.id}
              className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold truncate">{bug.title}</h3>
                    <Badge variant={getStatusVariant(bug.status)}>
                      {bug.status}
                    </Badge>
                    <Badge variant={getSeverityVariant(bug.severity)}>
                      {bug.severity}
                    </Badge>
                    <Badge variant="outline">{bug.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {bug.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted{" "}
                    {formatDistanceToNow(new Date(bug.created_at), {
                      addSuffix: true,
                    })}
                    {bug.priority !== "Medium" && (
                      <span className="ml-2">• Priority: {bug.priority}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBug(bug)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBugToDelete(bug);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Loading bug reports...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {isAdmin ? "All Bug Reports" : "Your Bug Reports"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "View and manage all user-submitted bug reports"
              : "Track the status of your submitted bug reports"}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "active" | "resolved")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Active ({activeBugs.length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({resolvedBugs.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-4">
              {renderBugList(activeBugs)}
            </TabsContent>
            <TabsContent value="resolved" className="mt-4">
              {renderBugList(resolvedBugs)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedBug && (
        <BugReportDetail
          bug={selectedBug}
          isAdmin={isAdmin}
          isOpen={!!selectedBug}
          onClose={() => setSelectedBug(null)}
          onUpdate={() => {
            fetchBugs();
            onBugChanged();
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bug Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The bug report "{bugToDelete?.title}"
              will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BugReportList;
