import { useState } from "react";
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
import type { Directive } from "./DirectivesPanel";

interface DirectiveListProps {
  directives: Directive[];
  onViewDetail: (directive: Directive) => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Emergency":
      return "destructive";
    case "Mandatory":
      return "default";
    case "Recommended":
      return "secondary";
    case "Informational":
      return "outline";
    default:
      return "secondary";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "default";
    case "Superseded":
      return "secondary";
    case "Cancelled":
      return "outline";
    case "Proposed":
      return "secondary";
    default:
      return "secondary";
  }
};

const getApplicabilityColor = (status: string | null | undefined) => {
  switch (status) {
    case "Applies":
      return "destructive";
    case "Does Not Apply":
      return "outline";
    case "Unsure":
    default:
      return "secondary";
  }
};

const DirectiveList = ({ directives, onViewDetail }: DirectiveListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "code" | "severity">("date");

  const filteredAndSortedDirectives = directives
    .filter((directive) => {
      const matchesSearch =
        directive.directive_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        directive.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || directive.directive_type === typeFilter;
      const matchesCategory = categoryFilter === "all" || directive.category === categoryFilter;
      const matchesSeverity = severityFilter === "all" || directive.severity === severityFilter;
      return matchesSearch && matchesType && matchesCategory && matchesSeverity;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        const dateA = a.effective_date || a.issue_date || a.created_at || "";
        const dateB = b.effective_date || b.issue_date || b.created_at || "";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      if (sortBy === "code") {
        return a.directive_code.localeCompare(b.directive_code);
      }
      if (sortBy === "severity") {
        const severityOrder = ["Emergency", "Mandatory", "Recommended", "Informational"];
        return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
      }
      return 0;
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search by code or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="FAA Airworthiness Directive">FAA AD</SelectItem>
            <SelectItem value="Manufacturer Alert">Manufacturer Alert</SelectItem>
            <SelectItem value="Manufacturer Mandatory">Manufacturer Mandatory</SelectItem>
            <SelectItem value="Service Bulletin">Service Bulletin</SelectItem>
            <SelectItem value="Service Instruction">Service Instruction</SelectItem>
            <SelectItem value="Information Bulletin">Information Bulletin</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
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
            <SelectItem value="Recommended">Recommended</SelectItem>
            <SelectItem value="Informational">Informational</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: "date" | "code" | "severity") => setSortBy(value)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="code">Sort by Code</SelectItem>
            <SelectItem value="severity">Sort by Severity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hide-at-900">Type</TableHead>
              <TableHead className="hide-at-700">Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applicable</TableHead>
              <TableHead className="hide-at-700">Effective Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedDirectives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No directives found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedDirectives.map((directive) => (
                <TableRow
                  key={directive.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewDetail(directive)}
                >
                  <TableCell className="font-mono font-medium">{directive.directive_code}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{directive.title}</TableCell>
                  <TableCell className="hide-at-900 text-sm">{directive.directive_type}</TableCell>
                  <TableCell className="hide-at-700">{directive.category}</TableCell>
                  <TableCell>
                    <Badge variant={getSeverityColor(directive.severity) as any}>
                      {directive.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(directive.directive_status) as any}>
                      {directive.directive_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getApplicabilityColor(directive.applicability_status) as any}>
                      {directive.applicability_status || "Unsure"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hide-at-700">
                    {directive.effective_date
                      ? format(parseLocalDate(directive.effective_date), "MMM dd, yyyy")
                      : directive.issue_date
                      ? format(parseLocalDate(directive.issue_date), "MMM dd, yyyy")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DirectiveList;
