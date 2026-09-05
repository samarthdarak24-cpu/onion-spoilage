import React from 'react';
import { OnionGlyph } from './animations';

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-forest to-darkgreen shadow-soft">
        <OnionGlyph size={size} />
      </div>
      <div className="leading-none">
        <div className="text-lg font-extrabold tracking-tight text-emerald-950">Onion<span className="text-fresh">Sure</span></div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Quality Intelligence</div>
      </div>
    </div>
  );
}
