import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, Legend, AreaChart, Area,
} from 'recharts';

const GREEN = '#0B5D3B';
const FRESH = '#3FAE5A';
const AMBER = '#F4B942';
const REJECT = '#D9534F';
const CREAM = '#F7F5EA';

export function Donut({ data, height = 220 }: { data: { name: string; value: number; color?: string }[]; height?: number }) {
  const palette = [GREEN, AMBER, REJECT, FRESH, '#9CA3AF'];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
          {data.map((d, i) => <Cell key={i} fill={d.color || palette[i % palette.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, xKey, yKey, color = FRESH, height = 220 }: { data: any[]; xKey: string; yKey: string; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7efe8" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#5b7a68' }} />
        <YAxis tick={{ fontSize: 11, fill: '#5b7a68' }} domain={[0, 100]} />
        <Tooltip />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} fill="url(#g)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LiveLine({ data, height = 200 }: { data: { t: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7efe8" />
        <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#5b7a68' }} />
        <YAxis tick={{ fontSize: 10, fill: '#5b7a68' }} domain={['auto', 'auto']} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={FRESH} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DefectBars({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  const colors: any = { Healthy: FRESH, Damaged: AMBER, Rotten: REJECT, Sprouted: '#8B5CF6', Undersized: '#0EA5E9' };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7efe8" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5b7a68' }} />
        <YAxis tick={{ fontSize: 11, fill: '#5b7a68' }} />
        <Tooltip />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={colors[d.name] || FRESH} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export { GREEN, FRESH, AMBER, REJECT, CREAM };
