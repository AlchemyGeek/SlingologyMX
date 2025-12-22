import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type BugCategory = Database["public"]["Enums"]["bug_category"];
type BugSeverity = Database["public"]["Enums"]["bug_severity"];
type DeviceType = Database["public"]["Enums"]["device_type"];

const bugReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(255, { message: "Title must be 255 characters or less" }),
  description: z
    .string()
    .trim()
    .min(1, { message: "Description is required" }),
  actual_result: z
    .string()
    .trim()
    .min(1, { message: "Actual result is required" }),
  steps_to_reproduce: z.string().optional(),
  expected_result: z.string().optional(),
  category: z.string().min(1, { message: "Category is required" }),
  severity: z.string().min(1, { message: "Severity is required" }),
  browser: z.string().optional(),
  operating_system: z.string().optional(),
  device_type: z.string().optional(),
  attachment_url: z.string().url().optional().or(z.literal("")),
});

interface BugReportFormProps {
  userId: string;
  onBugSubmitted: () => void;
}

const BugReportForm = ({ userId, onBugSubmitted }: BugReportFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [category, setCategory] = useState<BugCategory | "">("");
  const [severity, setSeverity] = useState<BugSeverity | "">("");
  const [browser, setBrowser] = useState("");
  const [operatingSystem, setOperatingSystem] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType | "">("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: BugCategory[] = [
    "Authentication",
    "Notifications",
    "Maintenance Logs",
    "Directives",
    "Equipment",
    "Subscriptions",
    "Calendar",
    "Counters",
    "Profile",
    "UI/Display",
    "Performance",
    "Data",
    "Other",
  ];

  const severities: BugSeverity[] = ["Minor", "Moderate", "Major", "Critical"];

  const deviceTypes: DeviceType[] = [
    "Desktop",
    "Laptop",
    "Tablet",
    "Phone",
    "Other",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = bugReportSchema.parse({
        title,
        description,
        actual_result: actualResult,
        steps_to_reproduce: stepsToReproduce || undefined,
        expected_result: expectedResult || undefined,
        category,
        severity,
        browser: browser || undefined,
        operating_system: operatingSystem || undefined,
        device_type: deviceType || undefined,
        attachment_url: attachmentUrl || undefined,
      });

      setIsSubmitting(true);

      const { error } = await supabase.from("bug_reports").insert({
        user_id: userId,
        title: validated.title,
        description: validated.description,
        actual_result: validated.actual_result,
        steps_to_reproduce: validated.steps_to_reproduce || null,
        expected_result: validated.expected_result || null,
        category: validated.category as BugCategory,
        severity: validated.severity as BugSeverity,
        browser: validated.browser || null,
        operating_system: validated.operating_system || null,
        device_type: (validated.device_type as DeviceType) || null,
        attachment_url: validated.attachment_url || null,
      });

      if (error) throw error;

      toast.success("Bug report submitted successfully!");
      
      // Reset form
      setTitle("");
      setDescription("");
      setStepsToReproduce("");
      setExpectedResult("");
      setActualResult("");
      setCategory("");
      setSeverity("");
      setBrowser("");
      setOperatingSystem("");
      setDeviceType("");
      setAttachmentUrl("");
      
      onBugSubmitted();
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        toast.error("Failed to submit bug report");
        console.error("Error submitting bug report:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report a Bug</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Bug Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the problem"
              maxLength={255}
              required
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/255 characters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as BugCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Where did this happen?" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as BugSeverity)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How serious is this?" />
                </SelectTrigger>
                <SelectContent>
                  {severities.map((sev) => (
                    <SelectItem key={sev} value={sev}>
                      {sev}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">What happened? *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in your own words"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stepsToReproduce">Steps to Reproduce (optional)</Label>
            <Textarea
              id="stepsToReproduce"
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedResult">Expected Result (optional)</Label>
            <Textarea
              id="expectedResult"
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="What did you expect to happen?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="actualResult">Actual Result *</Label>
            <Textarea
              id="actualResult"
              value={actualResult}
              onChange={(e) => setActualResult(e.target.value)}
              placeholder="What actually happened? Include any error messages."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="browser">Browser (optional)</Label>
              <Input
                id="browser"
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                placeholder="e.g., Chrome 120"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operatingSystem">Operating System (optional)</Label>
              <Input
                id="operatingSystem"
                value={operatingSystem}
                onChange={(e) => setOperatingSystem(e.target.value)}
                placeholder="e.g., Windows 11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type (optional)</Label>
              <Select
                value={deviceType}
                onValueChange={(v) => setDeviceType(v as DeviceType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes.map((device) => (
                    <SelectItem key={device} value={device}>
                      {device}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachmentUrl">Attachment URL (optional)</Label>
            <Input
              id="attachmentUrl"
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="Link to screenshot or file (Google Drive, Dropbox, etc.)"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Bug Report"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BugReportForm;
