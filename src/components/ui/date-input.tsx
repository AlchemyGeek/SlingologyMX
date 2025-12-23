import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateInputProps {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
}

export function DateInput({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  id,
  required,
}: DateInputProps) {
  const [textValue, setTextValue] = React.useState("");
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  // Sync text value when date prop changes
  React.useEffect(() => {
    if (value && isValid(value)) {
      setTextValue(format(value, "MM-dd-yyyy"));
    } else {
      setTextValue("");
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTextValue(newValue);

    // Try to parse the date
    if (newValue === "") {
      onChange(null);
    } else {
      // Try MM-dd-yyyy format first (primary format)
      let parsed = parse(newValue, "MM-dd-yyyy", new Date());
      
      // If that didn't work, try MM/dd/yyyy (US format with slashes)
      if (!isValid(parsed) || parsed.getFullYear() < 1900 || parsed.getFullYear() > 2100) {
        parsed = parse(newValue, "MM/dd/yyyy", new Date());
      }
      
      // Also try yyyy-MM-dd as fallback
      if (!isValid(parsed) || parsed.getFullYear() < 1900 || parsed.getFullYear() > 2100) {
        parsed = parse(newValue, "yyyy-MM-dd", new Date());
      }
      
      // Validate the parsed date has a reasonable year
      if (isValid(parsed) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
        onChange(parsed);
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setIsPopoverOpen(false);
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <Input
          id={id}
          type="text"
          value={textValue}
          onChange={handleTextChange}
          placeholder="MM-DD-YYYY"
          disabled={disabled}
          required={required}
          className="pr-10"
        />
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={value || undefined}
              onSelect={handleCalendarSelect}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
