import { useState, useMemo } from "react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThumbsUp, ThumbsDown, User } from "lucide-react";
import type { CommunitySBWithMaintainer } from "@/types/communitySB";

interface CommunitySBListProps {
  communitySBs: CommunitySBWithMaintainer[];
  onViewDetail: (sb: CommunitySBWithMaintainer) => void;
  loading: boolean;
  userId?: string;
  getItemStatus?: (sb: CommunitySBWithMaintainer) => "new" | "updated" | null;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Emergency":
      return "destructive";
    case "Mandatory":
      return "default";
    case "Obligatory":
      return "default";
    case "Recommended":
      return "secondary";
    case "Informational":
      return "outline";
    default:
      return "secondary";
  }
};

const CommunitySBList = ({ communitySBs, onViewDetail, loading, userId, getItemStatus }: CommunitySBListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "code">("recent");

  const filteredAndSortedSBs = useMemo(() => {
    return communitySBs
      .filter((sb) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          sb.directive_code.toLowerCase().includes(searchLower) ||
          sb.title.toLowerCase().includes(searchLower) ||
          sb.issuing_authority?.toLowerCase().includes(searchLower) ||
          sb.directive_type.toLowerCase().includes(searchLower);
        const matchesCategory = categoryFilter === "all" || sb.category === categoryFilter;
        const matchesSeverity = severityFilter === "all" || sb.severity === severityFilter;
        return matchesSearch && matchesCategory && matchesSeverity;
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          const dateA = a.updated_at || a.created_at || "";
          const dateB = b.updated_at || b.created_at || "";
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        }
        if (sortBy === "popular") {
          const scoreA = a.upvotes - a.downvotes;
          const scoreB = b.upvotes - b.downvotes;
          return scoreB - scoreA;
        }
        if (sortBy === "code") {
          return a.directive_code.localeCompare(b.directive_code);
        }
        return 0;
      });
  }, [communitySBs, searchTerm, categoryFilter, severityFilter, sortBy]);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading community service bulletins...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer Banner */}
      <div className="bg-accent border border-border rounded-lg p-3 text-sm">
        <p className="text-muted-foreground">
          <strong className="text-foreground">⚠️ Community Service Bulletins are interpretations only</strong> and must be 
          verified against original manufacturer documentation before use.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search by code, title, authority, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Airframe">Airframe</SelectItem>
            <SelectItem value="Engine">Engine</SelectItem>
            <SelectItem value="Propeller">Propeller</SelectItem>
            <SelectItem value="Avionics">Avionics</SelectItem>
            <SelectItem value="System">System</SelectItem>
            <SelectItem value="Appliance">Appliance</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="Emergency">Emergency</SelectItem>
            <SelectItem value="Mandatory">Mandatory</SelectItem>
            <SelectItem value="Obligatory">Obligatory</SelectItem>
            <SelectItem value="Recommended">Recommended</SelectItem>
            <SelectItem value="Informational">Informational</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: "recent" | "popular" | "code") => setSortBy(value)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="code">By Code</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hide-at-1200">Issuing Authority</TableHead>
              <TableHead className="hide-at-1000">Type</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hide-at-800">Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead className="hide-at-800">Maintainer</TableHead>
              <TableHead className="text-center">Votes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedSBs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {communitySBs.length === 0
                    ? "No community service bulletins yet. Be the first to share one!"
                    : "No community SBs match your filters"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedSBs.map((sb) => {
                const itemStatus = getItemStatus?.(sb);
                return (
                  <TableRow
                    key={sb.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewDetail(sb)}
                  >
                    <TableCell className="hide-at-1200 text-sm text-muted-foreground">
                      {sb.issuing_authority || "-"}
                    </TableCell>
                    <TableCell className="hide-at-1000 text-sm">
                      {sb.directive_type}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      <div className="flex items-center gap-2">
                        {sb.directive_code}
                        {itemStatus === "new" && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>
                        )}
                        {itemStatus === "updated" && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Updated</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate">{sb.title}</div>
                      {sb.version_number > 1 && (
                        <span className="text-xs text-muted-foreground">v{sb.version_number}</span>
                      )}
                    </TableCell>
                    <TableCell className="hide-at-800">{sb.category}</TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(sb.severity) as any}>{sb.severity}</Badge>
                    </TableCell>
                    <TableCell className="hide-at-800">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {userId && sb.maintainer_id === userId ? (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        ) : (
                          <span className="truncate max-w-[100px]">
                            {sb.maintainer_display_name || "Unknown"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-primary">
                          <ThumbsUp className="h-3 w-3" />
                          {sb.upvotes}
                        </span>
                        <span className="flex items-center gap-1 text-destructive">
                          <ThumbsDown className="h-3 w-3" />
                          {sb.downvotes}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CommunitySBList;
