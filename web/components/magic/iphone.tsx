import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

// Mockup de téléphone inspiré du composant « iPhone » de Magic UI, réécrit pour accueillir un contenu vivant
// (le vrai faire-part, interactif et défilable) au lieu d'une simple image : l'écran est un vrai conteneur.
export interface IphoneProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  screenClassName?: string
  screenRef?: React.Ref<HTMLDivElement>
}

export function Iphone({ children, className, screenClassName, screenRef, ...props }: IphoneProps) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[433/882] w-full rounded-[14.5%/7.2%] bg-[#E9E4DB] p-[1.6%] shadow-float",
        "before:absolute before:inset-[0.6%] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/70 before:to-white/10 before:content-['']",
        className
      )}
      {...props}
    >
      <div className="relative size-full rounded-[13.4%/6.6%] bg-[#1C1A17] p-[3.2%]">
        <div
          ref={screenRef}
          className={cn("phone-screen relative size-full overflow-hidden rounded-[11.8%/5.6%] bg-background [container-type:inline-size]", screenClassName)}
        >
          {children}
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute top-[4.6%] left-1/2 z-30 h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-[#1C1A17]" />
      </div>
    </div>
  )
}
