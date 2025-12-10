import { Calendar, Bell, History, CreditCard, Wrench, FileText, AlertCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type DashboardView = 
  | "calendar" 
  | "notifications" 
  | "history" 
  | "subscriptions" 
  | "maintenance" 
  | "directives";

interface DashboardSidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  hasActiveAlerts?: boolean;
}

const eventsItems = [
  { id: "calendar" as const, title: "Calendar", icon: Calendar },
  { id: "notifications" as const, title: "Notifications", icon: Bell },
  { id: "history" as const, title: "History", icon: History },
];

const recordsItems = [
  { id: "subscriptions" as const, title: "Subscriptions", icon: CreditCard },
  { id: "maintenance" as const, title: "Maintenance", icon: Wrench },
  { id: "directives" as const, title: "Directives & Bulletins", icon: FileText },
];

export function DashboardSidebar({ activeView, onViewChange, hasActiveAlerts }: DashboardSidebarProps) {
  return (
    <Sidebar className="top-[65px] h-[calc(100svh-65px)] border-r border-t bg-card">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
            Events
            {hasActiveAlerts && <AlertCircle className="h-4 w-4 text-destructive" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {eventsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={activeView === item.id}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex items-center gap-2">
                      {item.title}
                      {item.id === "notifications" && hasActiveAlerts && (
                        <AlertCircle className="h-3 w-3 text-destructive" />
                      )}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold uppercase tracking-wide text-foreground">Records</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recordsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={activeView === item.id}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export type { DashboardView };
