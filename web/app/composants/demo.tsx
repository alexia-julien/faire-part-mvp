"use client";

import { useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Switch } from "@/components/ui/switch";
import { NumberTicker } from "@/components/magic/number-ticker";
import { ShineBorder } from "@/components/magic/shine-border";

export function ComponentsDemo() {
  const [on, setOn] = useState(true);
  const [code, setCode] = useState("");
  return (
    <>
      <h2 className="t-section mt-16 mb-6">Interactions</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex items-center justify-between rounded-[20px] border border-border bg-card px-4 py-4 shadow-soft">Compte à rebours <Switch checked={on} onCheckedChange={setOn} /></label>
        <div className="rounded-[20px] border border-border bg-card p-4 shadow-soft">
          <InputOTP maxLength={6} value={code} onChange={setCode} aria-label="Code à 6 chiffres"><InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="!w-9 !h-12 !text-[22px]" />)}</InputOTPGroup></InputOTP>
        </div>
        <div className="relative rounded-[20px] bg-card p-4 shadow-soft">
          <ShineBorder shineColor={["#B8975A", "#F3E6C4", "#B8975A"]} borderWidth={1.5} duration={10} />
          <p className="font-serif text-[44px] leading-none [font-variant-numeric:lining-nums]"><NumberTicker value={86} /></p>
          <p className="text-[13px] text-muted-foreground">Shine Border + Number Ticker</p>
        </div>
      </div>
    </>
  );
}
