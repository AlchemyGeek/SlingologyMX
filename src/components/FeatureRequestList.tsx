import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  vote_count: number;
  created_at: string;
  user_id: string;
}

interface Vote {
  id: string;
  feature_id: string;
  vote_type: number;
}

interface FeatureRequestListProps {
  userId: string;
  refreshKey: number;
}

const FeatureRequestList = ({
  userId,
  refreshKey,
}: FeatureRequestListProps) => {
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [userVotes, setUserVotes] = useState<Map<string, Vote>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("feature_requests")
        .select("*")
        .order("vote_count", { ascending: false });

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      toast.error("Failed to load feature requests");
      console.error("Error fetching features:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    try {
      const { data, error } = await supabase
        .from("feature_votes")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      const votesMap = new Map<string, Vote>();
      data?.forEach((vote) => {
        votesMap.set(vote.feature_id, vote);
      });
      setUserVotes(votesMap);
    } catch (error) {
      console.error("Error fetching user votes:", error);
    }
  };

  useEffect(() => {
    fetchFeatures();
    fetchUserVotes();
  }, [userId, refreshKey]);

  const handleVote = async (featureId: string, voteType: number) => {
    try {
      const existingVote = userVotes.get(featureId);

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking the same button
          const { error } = await supabase
            .from("feature_votes")
            .delete()
            .eq("id", existingVote.id);

          if (error) throw error;
          toast.success("Vote removed");
        } else {
          // Update vote if changing vote type
          const { error } = await supabase
            .from("feature_votes")
            .update({ vote_type: voteType })
            .eq("id", existingVote.id);

          if (error) throw error;
          toast.success(voteType === 1 ? "Upvoted!" : "Downvoted!");
        }
      } else {
        // Create new vote
        const { error } = await supabase.from("feature_votes").insert({
          feature_id: featureId,
          user_id: userId,
          vote_type: voteType,
        });

        if (error) throw error;
        toast.success(voteType === 1 ? "Upvoted!" : "Downvoted!");
      }

      // Refresh data
      await fetchFeatures();
      await fetchUserVotes();
    } catch (error) {
      toast.error("Failed to vote");
      console.error("Error voting:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Loading feature requests...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Requests</CardTitle>
        <p className="text-sm text-muted-foreground">
          Vote on features you'd like to see
        </p>
      </CardHeader>
      <CardContent>
        {features.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No feature requests yet. Be the first to submit one!
          </p>
        ) : (
          <div className="space-y-4">
            {features.map((feature) => {
              const userVote = userVotes.get(feature.id);
              const hasUpvoted = userVote?.vote_type === 1;
              const hasDownvoted = userVote?.vote_type === -1;

              return (
                <div
                  key={feature.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(feature.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        variant={hasUpvoted ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleVote(feature.id, 1)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Badge variant="secondary" className="text-base px-3">
                        {feature.vote_count}
                      </Badge>
                      <Button
                        variant={hasDownvoted ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleVote(feature.id, -1)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeatureRequestList;
