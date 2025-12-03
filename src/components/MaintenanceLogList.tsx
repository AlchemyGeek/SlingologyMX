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

interface MaintenanceLog {
  id: string;
  entry_title: string;
  category: string;
  subcategory: string;
  tags: string[];
  date_performed: string;
}

interface MaintenanceLogListProps {
  logs: MaintenanceLog[];
  onViewDetail: (log: any) => void;
}

const MaintenanceLogList = ({ logs, onViewDetail }: MaintenanceLogListProps) => {
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Subcategory</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                  <TableCell>{log.subcategory}</TableCell>
                  <TableCell className="font-medium">{log.entry_title}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {log.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
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

export default MaintenanceLogList;
