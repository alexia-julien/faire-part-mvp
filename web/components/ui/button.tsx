import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Restylé Maison Meli : boutons en pilule, encre sur ivoire, appui à 0,97 (micro-interaction < 200 ms).
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-[transform,background-color,box-shadow,color,opacity] duration-200 ease-out outline-none active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-primary/88 hover:shadow-lift",
        outline: "border border-border bg-card/80 text-foreground hover:bg-card hover:border-foreground/20",
        secondary: "bg-muted text-foreground hover:bg-[#E7DECF]",
        ghost: "text-foreground hover:bg-foreground/[0.05]",
        glass: "glass text-foreground hover:bg-white/75",
        link: "text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground rounded-none active:scale-100",
        destructive: "bg-[#8E3B2F] text-white hover:bg-[#7A3227]",
      },
      size: {
        default: "h-12 px-6 text-[15px]",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
