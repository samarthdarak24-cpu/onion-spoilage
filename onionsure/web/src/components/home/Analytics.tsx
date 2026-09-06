import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { DemoNote, Reveal, SectionHeading } from './primitives';

const TREND = [
  { w: 'Week 1', score: 84 },
  { w: 'Week 2', score: 87 },
  { w: 'Week 3', score: 86 },
  { w: 'Week 4', score: 91 },
  { w: 'Week 5', score: 89 },
];

const GRADE_MIX = [
  { name: 'Grade A', value: 64, color: '#3FAE5A' },
  { name: 'URS', value: 25, color: '#F4B942' },
  { name: 'Rejected', value: 11, color: '#D9534F' },
];

const tooltipStyle = {
  contentStyle: {
    borderRadius: 10,
    border: '1px solid rgba(6,69,44,0.10)',
    boxShadow: '0 8px 24px rgba(20,20,25,0.08)',
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  labelStyle: { fontWeight: 700, color: '#06452C' },
};

export default function Analytics() {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-emerald-900/[0.06] bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Quality Intelligence"
            title="Turn Every Inspection Into Data."
            sub="Compare quality patterns across lots and procurement centers."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:gap-6">
          {/* ---------- trend ---------- */}
          <Reveal delay={0.05}>
            <div className="h-full rounded-2xl border border-emerald-900/[0.07] bg-[#FCFBF8] p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-emerald-950">Quality Score Trend</h3>
                <span className="rounded-md bg-emerald-50 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-emerald-700/70">
                  5 weeks
                </span>
              </div>

              <div className="mt-4 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={TREND} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3FAE5A" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3FAE5A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,69,44,0.08)" vertical={false} />
                    <XAxis dataKey="w" tick={{ fontSize: 11, fill: '#5b7a68' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: '#5b7a68' }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#0B5D3B"
                      strokeWidth={2.5}
                      fill="url(#trendFill)"
                      dot={{ r: 3.5, fill: '#0B5D3B', strokeWidth: 0 }}
                      activeDot={{ r: 5.5 }}
                      isAnimationActive={!reduce}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <DemoNote>Illustrative inspection trend — sample data for demonstration.</DemoNote>
            </div>
          </Reveal>

          {/* ---------- grade mix ---------- */}
          <Reveal delay={0.15}>
            <div className="flex h-full flex-col rounded-2xl border border-emerald-900/[0.07] bg-[#FCFBF8] p-5 shadow-soft sm:p-6">
              <h3 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-emerald-950">Batch Distribution</h3>

              <div className="relative mt-2 flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={GRADE_MIX}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive={!reduce}
                      animationDuration={1300}
                    >
                      {GRADE_MIX.map((g) => <Cell key={g.name} fill={g.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: any) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>

                {/* centre readout */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2">
                  <motion.span
                    className="font-mono text-[30px] font-extrabold leading-none text-emerald-950"
                    initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    64%
                  </motion.span>
                  <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-emerald-700/55">Grade A</span>
                </div>
              </div>

              <ul className="mt-3 space-y-2">
                {GRADE_MIX.map((g) => (
                  <li key={g.name} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-emerald-900/70">
                      <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                      {g.name}
                    </span>
                    <span className="font-mono font-bold text-emerald-950">{g.value}%</span>
                  </li>
                ))}
              </ul>

              <DemoNote>Illustrative batch distribution — sample data for demonstration.</DemoNote>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
