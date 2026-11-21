"use client"

// Compteur qui défile jusqu'à sa valeur quand il entre à l'écran (inspiré de Magic UI).
// Réécrit sans le moteur d'animation de Motion (useSpring tirait ~100 Ko de JavaScript sur l'accueil) :
// IntersectionObserver + requestAnimationFrame, courbe « ease-out » proche du ressort d'origine.
// Mouvement réduit : la valeur finale s'affiche directement.
import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
  duration?: number
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  duration = 1.6,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const from = direction === "down" ? value : startValue
  const to = direction === "down" ? startValue : value

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fmt = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })
    const show = (n: number) => { el.textContent = fmt.format(Number(n.toFixed(decimalPlaces))) }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce || typeof IntersectionObserver === "undefined") { show(to); return }
    let raf = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const run = () => {
      const t0 = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / (duration * 1000))
        const eased = 1 - Math.pow(1 - p, 4)
        show(from + (to - from) * eased)
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect()
        timer = setTimeout(run, delay * 1000)
      }
    })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf); if (timer !== null) clearTimeout(timer) }
  }, [from, to, delay, decimalPlaces, duration])

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block [font-variant-numeric:lining-nums_tabular-nums]",
        className
      )}
      {...props}
    >
      {startValue}
    </span>
  )
}
