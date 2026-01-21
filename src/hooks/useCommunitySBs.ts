import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CommunitySB, CommunitySBWithMaintainer, CommunitySBFeedback } from "@/types/communitySB";
import { toast } from "sonner";

export function useCommunitySBs(userId: string | null) {
  const [communitySBs, setCommunitySBs] = useState<CommunitySBWithMaintainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunitySBs = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch all community SBs
      const { data: sbs, error: sbError } = await supabase
        .from("community_service_bulletins")
        .select("*")
        .eq("directive_status", "Active")
        .order("updated_at", { ascending: false });

      if (sbError) throw sbError;

      if (!sbs || sbs.length === 0) {
        setCommunitySBs([]);
        setLoading(false);
        return;
      }

      // Get unique maintainer IDs
      const maintainerIds = [...new Set(sbs.map((sb) => sb.maintainer_id))];

      // Fetch maintainer display names from public_profiles
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("id, display_name")
        .in("id", maintainerIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);

      // Fetch all feedback for these SBs
      const sbIds = sbs.map((sb) => sb.id);
      const { data: feedback } = await supabase
        .from("community_sb_feedback")
        .select("community_sb_id, user_id, vote_type")
        .in("community_sb_id", sbIds);

      // Calculate votes per SB and user's vote
      const votesMap = new Map<string, { upvotes: number; downvotes: number; userVote: number | null }>();
      sbs.forEach((sb) => {
        votesMap.set(sb.id, { upvotes: 0, downvotes: 0, userVote: null });
      });

      feedback?.forEach((f) => {
        const current = votesMap.get(f.community_sb_id);
        if (current) {
          if (f.vote_type === 1) current.upvotes++;
          if (f.vote_type === -1) current.downvotes++;
          if (f.user_id === userId) current.userVote = f.vote_type;
        }
      });

      // Combine all data
      const enrichedSBs: CommunitySBWithMaintainer[] = sbs.map((sb) => {
        const votes = votesMap.get(sb.id) || { upvotes: 0, downvotes: 0, userVote: null };
        return {
          ...sb,
          source_links: sb.source_links as Array<{ description: string; url: string }> | null,
          maintainer_display_name: profileMap.get(sb.maintainer_id) || "Unknown",
          upvotes: votes.upvotes,
          downvotes: votes.downvotes,
          user_vote: votes.userVote,
        };
      });

      setCommunitySBs(enrichedSBs);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching community SBs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCommunitySBs();
  }, [fetchCommunitySBs]);

  return { communitySBs, loading, error, refetch: fetchCommunitySBs };
}

export function useCommunitySBFeedback(communitySbId: string, userId: string | null) {
  const [feedback, setFeedback] = useState<CommunitySBFeedback[]>([]);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = useCallback(async () => {
    if (!communitySbId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("community_sb_feedback")
        .select("*")
        .eq("community_sb_id", communitySbId);

      if (error) throw error;

      // Cast the maintainer_status properly
      const typedData = (data || []).map(item => ({
        ...item,
        maintainer_status: item.maintainer_status as 'Incorporated' | 'Acknowledged' | null
      }));
      setFeedback(typedData);
      
      // Find user's vote
      if (userId) {
        const userFeedback = data?.find((f) => f.user_id === userId);
        setUserVote(userFeedback?.vote_type || null);
      }
    } catch (err: any) {
      console.error("Error fetching feedback:", err);
    } finally {
      setLoading(false);
    }
  }, [communitySbId, userId]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const submitVote = async (voteType: 1 | -1, reason?: string) => {
    if (!userId) {
      toast.error("You must be logged in to vote");
      return;
    }

    try {
      // Check if user already has a vote
      const existingVote = feedback.find((f) => f.user_id === userId);

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          const { error } = await supabase
            .from("community_sb_feedback")
            .delete()
            .eq("id", existingVote.id);

          if (error) throw error;
          setUserVote(null);
          toast.success("Vote removed");
        } else {
          // Update vote
          const { error } = await supabase
            .from("community_sb_feedback")
            .update({ vote_type: voteType, reason: voteType === -1 ? reason : null })
            .eq("id", existingVote.id);

          if (error) throw error;
          setUserVote(voteType);
          toast.success("Vote updated");
        }
      } else {
        // Create new vote
        const { error } = await supabase.from("community_sb_feedback").insert({
          community_sb_id: communitySbId,
          user_id: userId,
          vote_type: voteType,
          reason: voteType === -1 ? reason : null,
        });

        if (error) throw error;
        setUserVote(voteType);
        toast.success(voteType === 1 ? "Upvoted!" : "Downvoted");
      }

      fetchFeedback();
    } catch (err: any) {
      console.error("Error submitting vote:", err);
      toast.error("Failed to submit vote");
    }
  };

  return { feedback, userVote, loading, submitVote, refetch: fetchFeedback };
}

export function useCommunitySBUpdateNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("community_sb_update_notifications")
        .select(`
          *,
          community_service_bulletins:community_sb_id (
            directive_code,
            title
          )
        `)
        .eq("user_id", userId)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (err: any) {
      console.error("Error fetching update notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("community_sb_update_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      fetchNotifications();
    } catch (err: any) {
      console.error("Error marking notification as read:", err);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await supabase
        .from("community_sb_update_notifications")
        .update({ is_dismissed: true })
        .eq("id", notificationId);

      fetchNotifications();
    } catch (err: any) {
      console.error("Error dismissing notification:", err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    dismissNotification,
    refetch: fetchNotifications,
  };
}
