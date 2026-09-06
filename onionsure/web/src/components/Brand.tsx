import React from 'react';
import { OnionGlyph } from './animations';

export function Logo({ size = 30, tone = 'dark' }: { size?: number; tone?: 'dark' | 'light' }) {
  const light = tone === 'light';
  return (
    <div className="flex items-center gap-3 group">
      <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-fresh via-emerald-600 to-emerald-950 p-[1px] shadow-[0_4px_16px_rgba(63,174,90,0.4)] transition-transform duration-300 group-hover:scale-105">
        <div className="grid h-full w-full place-items-center rounded-[15px] bg-emerald-950/90 backdrop-blur-md">
          <OnionGlyph size={size} />
        </div>
      </div>
      <div className="leading-none">
        <div className={['text-[19px] font-black tracking-tight drop-shadow-sm', light ? 'text-white' : 'text-emerald-950'].join(' ')}>
          Onion<span className="bg-gradient-to-r from-fresh to-emerald-300 bg-clip-text text-transparent">Sure</span>
        </div>
        <div className={[
          'text-[9.5px] font-bold uppercase tracking-[0.22em] mt-0.5',
          light ? 'text-emerald-200/80' : 'text-emerald-700',
        ].join(' ')}>
          Quality Intelligence
        </div>
      </div>
    </div>
  );
}
