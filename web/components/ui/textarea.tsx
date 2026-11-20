import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-border bg-card px-4 py-3 text-[17px] leading-relaxed shadow-[inset_0_1px_2px_rgba(28,26,23,0.04)] transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
