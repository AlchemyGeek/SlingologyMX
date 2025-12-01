import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const featureRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title must be 200 characters or less" }),
  description: z
    .string()
    .trim()
    .min(1, { message: "Description is required" })
    .max(2000, { message: "Description must be 2000 characters or less" }),
});

interface FeatureRequestFormProps {
  userId: string;
  onFeatureSubmitted: () => void;
}

const FeatureRequestForm = ({
  userId,
  onFeatureSubmitted,
}: FeatureRequestFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input
      const validated = featureRequestSchema.parse({
        title,
        description,
      });

      setIsSubmitting(true);

      const { error } = await supabase.from("feature_requests").insert({
        user_id: userId,
        title: validated.title,
        description: validated.description,
      });

      if (error) throw error;

      toast.success("Feature request submitted successfully!");
      setTitle("");
      setDescription("");
      onFeatureSubmitted();
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        toast.error("Failed to submit feature request");
        console.error("Error submitting feature request:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Feature Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title for your feature request"
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the feature you'd like to see"
              maxLength={2000}
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/2000 characters
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Feature Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FeatureRequestForm;
