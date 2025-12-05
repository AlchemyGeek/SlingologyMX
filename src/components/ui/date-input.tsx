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
      setTextValue(format(value, "yyyy-MM-dd"));
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
      const parsed = parse(newValue, "yyyy-MM-dd", new Date());
      if (isValid(parsed)) {
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
      <Input
        id={id}
        type="date"
        value={textValue}
        onChange={handleTextChange}
        disabled={disabled}
        required={required}
        className="flex-1"
      />
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
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
  );
}
