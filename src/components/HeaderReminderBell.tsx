import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardView } from "./DashboardSidebar";
import { parseLocalDate } from "@/lib/utils";

interface HeaderReminderBellProps {
  userId: string;
  aircraftId: string;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
  onNavigate: (view: DashboardView, opts?: { overdueOnly?: boolean }) => void;
}

const SNOOZE_MS = 24 * 60 * 60 * 1000;

const snoozeKey = (userId: string, aircraftId: string) =>
  `reminderBell.snoozeUntil.${userId}.${aircraftId}`;

const counterTypeToFieldMap: Record<string, string> = {
  Hobbs: "hobbs",
  Tach: "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

export function HeaderReminderBell({
  userId,
  aircraftId,
  currentCounters,
  onNavigate,
}: HeaderReminderBellProps) {
  const [overdueCount, setOverdueCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);

  // Load snooze state whenever user/aircraft changes
  useEffect(() => {
    if (!userId || !aircraftId) return;
    const raw = localStorage.getItem(snoozeKey(userId, aircraftId));
    if (raw) {
      const until = parseInt(raw, 10);
      if (!Number.isNaN(until) && until > Date.now()) {
        setSnoozedUntil(until);
        return;
      }
      localStorage.removeItem(snoozeKey(userId, aircraftId));
    }
    setSnoozedUntil(null);
  }, [userId, aircraftId]);

  const fetchCounts = useCallback(async () => {
    if (!userId || !aircraftId) {
      setOverdueCount(0);
      setTxCount(0);
      return;
    }
    const [{ data: notifs }, { count: tCount }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, notification_basis, counter_type, initial_counter_value, initial_date")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .eq("is_completed", false),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .eq("status", "Pending"),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = (notifs ?? []).filter((n: any) => {
      if (n.notification_basis === "Counter" || n.counter_type) {
        if (!currentCounters || !n.counter_type) return false;
        const field = counterTypeToFieldMap[n.counter_type];
        const current = currentCounters[field as keyof typeof currentCounters] || 0;
        const target = n.initial_counter_value || 0;
        return target - current <= 0;
      }
      if (!n.initial_date) return false;
      const due = parseLocalDate(n.initial_date);
      due.setHours(0, 0, 0, 0);
      return due.getTime() <= today.getTime();
    }).length;

    setOverdueCount(overdue);
    setTxCount(tCount ?? 0);
  }, [userId, aircraftId, currentCounters]);

  useEffect(() => {
    fetchCounts();
    const id = setInterval(fetchCounts, 60_000);
    return () => clearInterval(id);
  }, [fetchCounts]);

  // Auto-unsnooze tick
  useEffect(() => {
    if (!snoozedUntil) return;
    const ms = snoozedUntil - Date.now();
    if (ms <= 0) {
      setSnoozedUntil(null);
      return;
    }
    const id = setTimeout(() => setSnoozedUntil(null), ms);
    return () => clearTimeout(id);
  }, [snoozedUntil]);

  const total = overdueCount + txCount;

  if (snoozedUntil && snoozedUntil > Date.now()) return null;
  if (total === 0) return null;

  const handleSnooze = () => {
    const until = Date.now() + SNOOZE_MS;
    localStorage.setItem(snoozeKey(userId, aircraftId), String(until));
    setSnoozedUntil(until);
    setOpen(false);
  };

  const goTo = (view: DashboardView) => {
    onNavigate(view, view === "notifications" ? { overdueOnly: true } : undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Reminders">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="px-2 py-1.5 text-sm font-semibold">Reminders</div>
        <button
          type="button"
          disabled={overdueCount === 0}
          onClick={() => goTo("notifications")}
          className="w-full flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          <span>Overdue notifications</span>
          <span className="font-semibold">{overdueCount}</span>
        </button>
        <button
          type="button"
          disabled={txCount === 0}
          onClick={() => goTo("transactions")}
          className="w-full flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          <span>Pending transactions</span>
          <span className="font-semibold">{txCount}</span>
        </button>
        <div className="border-t mt-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={handleSnooze}
          >
            Snooze for 24 hours
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}