import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Directive } from "@/components/DirectivesPanel";

interface CommunitySBData {
  id: string;
  version_number: number;
  directive_code: string;
}

interface ShareStatus {
  isShared: boolean;
  loading: boolean;
  communitySB: CommunitySBData | null;
  refetch: () => void;
}

export const useCommunitySBShareStatus = (
  directive: Directive,
  userId: string
): ShareStatus => {
  const [status, setStatus] = useState<{
    isShared: boolean;
    loading: boolean;
    communitySB: CommunitySBData | null;
  }>({
    isShared: false,
    loading: true,
    communitySB: null,
  });
  
  const [refreshKey, setRefreshKey] = useState(0);

  const checkShareStatus = async () => {
    if (!userId || !directive.directive_code) {
      setStatus({ isShared: false, loading: false, communitySB: null });
      return;
    }

    setStatus((prev) => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase
        .from("community_service_bulletins")
        .select("id, version_number, directive_code")
        .eq("maintainer_id", userId)
        .eq("directive_code", directive.directive_code)
        .order("version_number", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setStatus({
          isShared: true,
          loading: false,
          communitySB: data[0] as CommunitySBData,
        });
      } else {
        setStatus({
          isShared: false,
          loading: false,
          communitySB: null,
        });
      }
    } catch (err) {
      console.error("Error checking community SB status:", err);
      setStatus({ isShared: false, loading: false, communitySB: null });
    }
  };

  useEffect(() => {
    checkShareStatus();
  }, [userId, directive.directive_code, refreshKey]);

  const refetch = () => setRefreshKey((k) => k + 1);

  return { ...status, refetch };
};
