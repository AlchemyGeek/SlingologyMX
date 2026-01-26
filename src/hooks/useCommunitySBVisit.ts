import { useState, useCallback, useMemo } from "react";
import type { CommunitySBWithMaintainer } from "@/types/communitySB";

const STORAGE_KEY = "community_sb_last_visited";

interface VisitStatus {
  lastVisited: string | null;
  markAsVisited: () => void;
  hasNewOrUpdated: boolean;
  getItemStatus: (sb: CommunitySBWithMaintainer) => "new" | "updated" | null;
}

export function useCommunitySBVisit(
  userId: string | null,
  communitySBs: CommunitySBWithMaintainer[]
): VisitStatus {
  // Store last visited per user to handle multiple accounts
  const storageKey = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
  
  const [lastVisited, setLastVisited] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(storageKey);
  });

  const markAsVisited = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(storageKey, now);
    setLastVisited(now);
  }, [storageKey]);

  const getItemStatus = useCallback(
    (sb: CommunitySBWithMaintainer): "new" | "updated" | null => {
      if (!lastVisited) {
        // First time visiting - nothing is "new"
        return null;
      }

      const lastVisitedDate = new Date(lastVisited);
      const createdAt = sb.created_at ? new Date(sb.created_at) : null;
      const updatedAt = sb.updated_at ? new Date(sb.updated_at) : null;

      // Check if created after last visit
      if (createdAt && createdAt > lastVisitedDate) {
        return "new";
      }

      // Check if updated after last visit (and has multiple versions)
      if (updatedAt && updatedAt > lastVisitedDate && sb.version_number > 1) {
        return "updated";
      }

      return null;
    },
    [lastVisited]
  );

  const hasNewOrUpdated = useMemo(() => {
    if (!lastVisited || communitySBs.length === 0) {
      return false;
    }

    return communitySBs.some((sb) => getItemStatus(sb) !== null);
  }, [lastVisited, communitySBs, getItemStatus]);

  return {
    lastVisited,
    markAsVisited,
    hasNewOrUpdated,
    getItemStatus,
  };
}
