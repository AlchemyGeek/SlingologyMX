import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const SUBSCRIPTION_TYPES = [
  "EFB & Flight Planning",
  "Avionics Subscriptions",
  "Aircraft Maintenance, Tracking, & Record Services",
  "Proficiency & Safety Tools",
  "Aviation Community Memberships",
  "Weather Tools",
  "Magazine Subscription",
  "Aircraft Operations & Financial Tools",
  "Hardware-Related Annual Fees",
  "Insurance Related Add-Ons",
  "Other"
];

interface SubscriptionListProps {
  subscriptions: any[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (subscription: any) => void;
  onSelect: (subscription: any) => void;
}

const SubscriptionList = ({ subscriptions, loading, onUpdate, onEdit, onSelect }: SubscriptionListProps) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "cost" | "type">("name");

  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((subscription) => {
        const matchesSearch = searchTerm === "" || 
          subscription.subscription_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === "all" || subscription.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.subscription_name.localeCompare(b.subscription_name);
        }
        if (sortBy === "date") {
          return new Date(b.initial_date).getTime() - new Date(a.initial_date).getTime();
        }
        if (sortBy === "cost") {
          return (b.cost || 0) - (a.cost || 0);
        }
        if (sortBy === "type") {
          return a.type.localeCompare(b.type);
        }
        return 0;
      });
  }, [subscriptions, searchTerm, typeFilter, sortBy]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("subscriptions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Commitment deleted");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete commitment");
    }
  };

  const hasActiveFilters = searchTerm !== "" || typeFilter !== "all" || sortBy !== "name";

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setSortBy("name");
  };

  

  if (loading) {
    return <p className="text-muted-foreground">Loading commitments...</p>;
  }

  if (subscriptions.length === 0) {
    return <p className="text-muted-foreground">No commitments yet. Create your first one!</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SUBSCRIPTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: "name" | "date" | "cost" | "type") => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="cost">Sort by Cost</SelectItem>
            <SelectItem value="type">Sort by Type</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results Count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredSubscriptions.length} of {subscriptions.length} commitments
        </p>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <div className="min-w-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {!isMobile && <TableHead>Type</TableHead>}
                {!isMobile && <TableHead>Cost</TableHead>}
                <TableHead>Initial Date</TableHead>
                {!isMobile && <TableHead>Recurrence</TableHead>}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 6} className="text-center text-muted-foreground">
                    No commitments match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <TableRow 
                    key={subscription.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelect(subscription)}
                  >
                    <TableCell className="font-medium">{subscription.subscription_name}</TableCell>
                    {!isMobile && (
                      <TableCell className="max-w-[200px] truncate" title={subscription.type}>
                        {subscription.type}
                      </TableCell>
                    )}
                    {!isMobile && <TableCell>${subscription.cost}</TableCell>}
                    <TableCell>{parseLocalDate(subscription.initial_date).toLocaleDateString()}</TableCell>
                    {!isMobile && <TableCell>{subscription.recurrence}</TableCell>}
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(subscription)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(subscription.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionList;