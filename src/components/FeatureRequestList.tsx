import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import FeatureRequestEditDialog from "./FeatureRequestEditDialog";
import type { Database } from "@/integrations/supabase/types";

type FeatureStatus = Database["public"]["Enums"]["feature_status"];

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  vote_count: number;
  created_at: string;
  user_id: string;
  status: FeatureStatus;
  admin_comment: string | null;
  submitter_name?: string;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureRequest | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("feature_requests")
        .select(`
          *,
          profiles:user_id (
            name
          )
        `)
        .order("vote_count", { ascending: false });

      if (error) throw error;
      
      // Map the data to include submitter name
      const featuresWithNames = data?.map((feature: any) => ({
        ...feature,
        submitter_name: feature.profiles?.name || "Anonymous",
      })) || [];
      
      setFeatures(featuresWithNames);
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

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();

      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  useEffect(() => {
    fetchFeatures();
    fetchUserVotes();
    checkAdminStatus();
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

  const openFeatures = features.filter((f) => f.status === "open");
  const closedFeatures = features.filter((f) => f.status !== "open");

  const renderFeatureList = (featureList: FeatureRequest[], showVoting: boolean) => {
    if (featureList.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-8">
          No feature requests in this category yet.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {featureList.map((feature) => {
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
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <Badge
                      variant={
                        feature.status === "completed"
                          ? "default"
                          : feature.status === "closed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {feature.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                  {feature.admin_comment && (
                    <p className="text-sm text-primary mt-2 italic">
                      Admin: {feature.admin_comment}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Submitted by {feature.submitter_name} •{" "}
                      {formatDistanceToNow(new Date(feature.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingFeature(feature)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
                {showVoting && (
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
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Feature Requests</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vote on features you'd like to see
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">
              Loading feature requests...
            </p>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "open" | "closed")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="open">Open ({openFeatures.length})</TabsTrigger>
                <TabsTrigger value="closed">Closed ({closedFeatures.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="open" className="mt-4">
                {renderFeatureList(openFeatures, true)}
              </TabsContent>
              <TabsContent value="closed" className="mt-4">
                {renderFeatureList(closedFeatures, false)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      
      {editingFeature && (
        <FeatureRequestEditDialog
          isOpen={!!editingFeature}
          onClose={() => setEditingFeature(null)}
          featureId={editingFeature.id}
          currentStatus={editingFeature.status}
          currentAdminComment={editingFeature.admin_comment}
          onSuccess={() => {
            fetchFeatures();
            setEditingFeature(null);
          }}
        />
      )}
    </>
  );
};

export default FeatureRequestList;
