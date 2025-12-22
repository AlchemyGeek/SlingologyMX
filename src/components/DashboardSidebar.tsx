import {
  Calendar,
  Bell,
  History,
  CreditCard,
  Wrench,
  FileText,
  AlertCircle,
  HelpCircle,
  BookOpen,
  MessageCircle,
  Bug,
  Lightbulb,
  Database,
  Gauge,
  Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  | "counters"
  | "notifications"
  | "history"
  | "subscriptions"
  | "equipment"
  | "maintenance"
  | "directives";

interface DashboardSidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  hasActiveAlerts?: boolean;
}

const eventsItems = [
  { id: "calendar" as const, title: "Calendar", icon: Calendar },
  { id: "counters" as const, title: "Counters", icon: Gauge },
  { id: "notifications" as const, title: "Notifications", icon: Bell },
  { id: "history" as const, title: "History", icon: History },
];

const recordsItems = [
  { id: "subscriptions" as const, title: "Subscriptions", icon: CreditCard },
  { id: "equipment" as const, title: "Equipment", icon: Package },
  { id: "maintenance" as const, title: "Maintenance", icon: Wrench },
  { id: "directives" as const, title: "Directives & Bulletins", icon: FileText },
];

const supportItems = [
  { id: "help", title: "Help", icon: HelpCircle, external: "https://slingology.blog/slingologymx-help-pages/" },
  {
    id: "blog",
    title: "Blog",
    icon: BookOpen,
    external: "https://slingology.blog/category/mx/?utm_campaign=slingologymx&utm_source=service&utm_medium=menu",
  },
  { id: "discord", title: "Discord", icon: MessageCircle, external: "https://discord.gg/v3ydQuupmy" },
  { id: "data-management", title: "Data Management", icon: Database, route: "/data-management" },
  { id: "bug-reports", title: "Bug Reports", icon: Bug, route: "/bug-reports" },
  { id: "feature-requests", title: "Feature Requests", icon: Lightbulb, route: "/feature-requests" },
];

export function DashboardSidebar({ activeView, onViewChange, hasActiveAlerts }: DashboardSidebarProps) {
  const navigate = useNavigate();

  return (
    <Sidebar className="top-[73px] h-[calc(100svh-73px)]">
      <SidebarContent className="pt-6">
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
          <SidebarGroupLabel className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Records
          </SidebarGroupLabel>
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      if (item.external) {
                        window.open(item.external, "_blank");
                      } else if (item.route) {
                        navigate(item.route);
                      }
                    }}
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
