import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

export interface DatePickerProps {
  id?: string
  /** ISO "yyyy-MM-dd", or "" — same contract as a native
   * `<input type="date">`, so existing `value`/`onChange` state wires in
   * directly without reshaping it. */
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** ISO "yyyy-MM-dd" bounds — same contract as the native input's `min`/
   * `max` attributes, translated to the Calendar's own disabled-day matcher. */
  min?: string
  max?: string
  className?: string
  "aria-label"?: string
}

function parseISODate(value?: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
}

/** Shadcn-pattern date picker (Popover + Calendar) with a native-date-input
 * compatible `value`/`onChange` contract. The selected day's highlight comes
 * from `Calendar`'s own `bg-primary` — on-brand (chestnut) automatically,
 * no color prop needed here. */
function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  min,
  max,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseISODate(value)
  const minDate = parseISODate(min)
  const maxDate = parseISODate(max)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          data-slot="date-picker-trigger"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          {selected ? formatDisplay(selected) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={
            minDate || maxDate
              ? { before: minDate ?? new Date(0), after: maxDate ?? new Date(8640000000000000) }
              : undefined
          }
          onSelect={(date) => {
            if (date) onChange?.(toISODate(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
