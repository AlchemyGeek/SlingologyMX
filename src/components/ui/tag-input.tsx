import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface TagInputProps {
  userId: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  source: "maintenance_logs" | "equipment";
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  userId,
  tags,
  onTagsChange,
  source,
  maxLength = 30,
  placeholder = "Add tag...",
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  // Fetch all existing tags from the database
  React.useEffect(() => {
    const fetchTags = async () => {
      const { data, error } = await supabase
        .from(source)
        .select("tags")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching tags:", error);
        return;
      }

      // Extract unique tags from all records
      const uniqueTags = new Set<string>();
      data?.forEach((record) => {
        if (record.tags && Array.isArray(record.tags)) {
          record.tags.forEach((tag: string) => uniqueTags.add(tag));
        }
      });

      setAllTags(Array.from(uniqueTags).sort());
    };

    fetchTags();
  }, [userId, source]);

  // Filter suggestions based on input
  React.useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allTags.filter(
        (tag) =>
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(tag)
      );
      setSuggestions(filtered.slice(0, 5)); // Limit to 5 suggestions
      setShowSuggestions(filtered.length > 0);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, allTags, tags]);

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && trimmedTag.length <= maxLength && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
      // Add to allTags if it's a new tag
      if (!allTags.includes(trimmedTag)) {
        setAllTags((prev) => [...prev, trimmedTag].sort());
      }
    }
    setInputValue("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleRemoveTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleAddTag(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        handleAddTag(inputValue);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.trim() && suggestions.length > 0 && setShowSuggestions(true)}
            maxLength={maxLength}
            placeholder={placeholder}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    index === highlightedIndex && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleAddTag(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={() => handleAddTag(inputValue)}
          size="sm"
        >
          Add
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {tags.map((tag, index) => (
          <div
            key={index}
            className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded"
          >
            {tag}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => handleRemoveTag(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
