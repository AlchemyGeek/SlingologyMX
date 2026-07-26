import { useState } from "react";
import { format } from "date-fns";
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
import { parseLocalDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MaintenanceLog {
  id: string;
  entry_title: string;
  category: string;
  subcategory: string;
  tags: string[];
  date_performed: string;
  has_compliance_item?: boolean;
  has_linked_compliance?: boolean;
}

interface MaintenanceLogListProps {
  logs: MaintenanceLog[];
  onViewDetail: (log: any) => void;
}

const MaintenanceLogList = ({ logs, onViewDetail }: MaintenanceLogListProps) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "category">("date");

  const filteredAndSortedLogs = logs
    .filter((log) => {
      const matchesSearch = log.entry_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
      const matchesSubcategory = subcategoryFilter === "all" || log.subcategory === subcategoryFilter;
      return matchesSearch && matchesCategory && matchesSubcategory;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return parseLocalDate(b.date_performed).getTime() - parseLocalDate(a.date_performed).getTime();
      }
      return a.category.localeCompare(b.category);
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search by title or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Airframe">Airframe</SelectItem>
            <SelectItem value="Engine">Engine</SelectItem>
            <SelectItem value="Propeller">Propeller</SelectItem>
            <SelectItem value="Avionics">Avionics</SelectItem>
            <SelectItem value="Electrical">Electrical</SelectItem>
            <SelectItem value="Interior">Interior</SelectItem>
            <SelectItem value="Exterior">Exterior</SelectItem>
            <SelectItem value="Accessories">Accessories</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by subcategory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subcategories</SelectItem>
            <SelectItem value="Inspection">Inspection</SelectItem>
            <SelectItem value="Repair">Repair</SelectItem>
            <SelectItem value="Replacement">Replacement</SelectItem>
            <SelectItem value="Modification">Modification</SelectItem>
            <SelectItem value="Software Update">Software Update</SelectItem>
            <SelectItem value="Compliance">Compliance</SelectItem>
            <SelectItem value="Troubleshooting">Troubleshooting</SelectItem>
            <SelectItem value="Scheduled Maintenance">Scheduled Maintenance</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: "date" | "category") => setSortBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="category">Sort by Category</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {filteredAndSortedLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No maintenance logs found</p>
        ) : (
          filteredAndSortedLogs.map((log) => {
            const hasCompliance = log.has_compliance_item || log.has_linked_compliance;
            return (
              <div
                key={log.id}
                onClick={() => onViewDetail(log)}
                className="w-full text-left rounded-lg border p-3 active:bg-accent transition-colors bg-card cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{log.entry_title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseLocalDate(log.date_performed), "MMM dd, yyyy")} · {log.category}
                      {log.subcategory ? ` · ${log.subcategory}` : ""}
                    </p>
                    {log.tags && log.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {log.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                        {log.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{log.tags.length - 3}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge variant={hasCompliance ? "default" : "outline"} className="shrink-0">
                    {hasCompliance ? "Compliance" : "Log"}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <div className="min-w-0 md:min-w-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                {!isMobile && <TableHead>Subcategory</TableHead>}
                <TableHead>Title</TableHead>
                {!isMobile && <TableHead>Compliance</TableHead>}
                {!isMobile && <TableHead>Tags</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 6} className="text-center text-muted-foreground">
                    No maintenance logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewDetail(log)}
                  >
                    <TableCell>{format(parseLocalDate(log.date_performed), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{log.category}</TableCell>
                    {!isMobile && <TableCell>{log.subcategory}</TableCell>}
                    <TableCell className="font-medium">{log.entry_title}</TableCell>
                    {!isMobile && (
                      <TableCell>
                        {(() => {
                          const hasCompliance = log.has_compliance_item || log.has_linked_compliance;
                          return (
                            <Badge variant={hasCompliance ? "default" : "outline"}>
                              {hasCompliance ? "Yes" : "No"}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {log.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    )}
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

export default MaintenanceLogList;
