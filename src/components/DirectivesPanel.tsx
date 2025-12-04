import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DirectiveForm from "./DirectiveForm";
import DirectiveList from "./DirectiveList";
import DirectiveDetail from "./DirectiveDetail";
import { toast } from "sonner";

export interface Directive {
  id: string;
  user_id: string;
  directive_code: string;
  title: string;
  directive_type: string;
  severity: string;
  directive_status: string;
  category: string;
  issuing_authority: string | null;
  issue_date: string | null;
  effective_date: string | null;
  revision: string | null;
  aircraft_make_model_filter: string | null;
  engine_model_filter: string | null;
  prop_model_filter: string | null;
  applicable_serial_range: string | null;
  applicability_notes: string | null;
  compliance_scope: string;
  action_types: string[] | null;
  initial_due_type: string | null;
  initial_due_hours: number | null;
  initial_due_months: number | null;
  initial_due_date: string | null;
  repeat_hours: number | null;
  repeat_months: number | null;
  terminating_action_exists: boolean;
  terminating_action_summary: string | null;
  requires_log_entry: boolean;
  source_links: Array<{ description: string; url: string }> | null;
  archived: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface DirectivesPanelProps {
  userId: string;
}

const DirectivesPanel = ({ userId }: DirectivesPanelProps) => {
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDirective, setEditingDirective] = useState<Directive | null>(null);
  const [selectedDirective, setSelectedDirective] = useState<Directive | null>(null);

  const fetchDirectives = async () => {
    try {
      const { data, error } = await supabase
        .from("directives")
        .select("*")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDirectives((data || []) as Directive[]);
    } catch (error: any) {
      toast.error("Failed to load directives");
      console.error("Error fetching directives:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectives();
  }, [userId]);

  const handleDirectiveCreated = () => {
    setShowForm(false);
    setEditingDirective(null);
    fetchDirectives();
    toast.success(editingDirective ? "Directive updated successfully" : "Directive created successfully");
  };

  const handleEdit = (directive: Directive) => {
    setEditingDirective(directive);
    setShowForm(true);
    setSelectedDirective(null);
  };

  const handleDelete = async (directiveId: string) => {
    try {
      // Find the directive to get its details for history
      const directiveToDelete = directives.find(d => d.id === directiveId);
      
      // Log Delete action to directive history before deleting
      if (directiveToDelete) {
        await supabase.from("directive_history").insert({
          user_id: userId,
          directive_id: directiveId,
          directive_code: directiveToDelete.directive_code,
          directive_title: directiveToDelete.title,
          action_type: "Delete",
        });
      }
      
      const { error } = await supabase
        .from("directives")
        .delete()
        .eq("id", directiveId);

      if (error) throw error;
      toast.success("Directive deleted successfully");
      fetchDirectives();
      setSelectedDirective(null);
    } catch (error: any) {
      toast.error("Failed to delete directive");
      console.error("Error deleting directive:", error);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingDirective(null);
  };

  const handleViewDetail = (directive: Directive) => {
    setSelectedDirective(directive);
  };

  const handleCloseDetail = () => {
    setSelectedDirective(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading directives...</p>
        </CardContent>
      </Card>
    );
  }

  if (selectedDirective) {
    return (
      <DirectiveDetail
        directive={selectedDirective}
        userId={userId}
        onClose={handleCloseDetail}
        onEdit={() => handleEdit(selectedDirective)}
        onDelete={() => handleDelete(selectedDirective.id)}
        onUpdate={fetchDirectives}
      />
    );
  }

  if (showForm) {
    return (
      <DirectiveForm
        userId={userId}
        editingDirective={editingDirective}
        onSuccess={handleDirectiveCreated}
        onCancel={handleCancelForm}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Directives & Bulletins</CardTitle>
            <CardDescription>Track ADs, Service Bulletins, and other compliance items</CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Directive
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DirectiveList
          directives={directives}
          onViewDetail={handleViewDetail}
        />
      </CardContent>
    </Card>
  );
};

export default DirectivesPanel;
