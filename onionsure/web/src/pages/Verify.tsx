import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QrCode, ShieldCheck, Search, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { Logo } from '../components/Brand';
import { Card, GradeBadge } from '../components/ui';

export default function Verify() {
  const { certId } = useParams();
  const [input, setInput] = useState(certId || '');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (id: string) => {
    setErr(''); setLoading(true);
    try {
      const r = await api.verify(id.trim());
      setData(r);
    } catch (e: any) {
      setData(null);
      setErr(e.message || 'Certificate not found');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (certId) run(certId); /* eslint-disable */ }, [certId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-emerald-50">
      <header className="border-b border-emerald-100 bg-white/70 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl"><Logo /></div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-12">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-forest text-white"><QrCode size={26} /></div>
          <h1 className="mt-4 text-3xl font-extrabold text-emerald-950">Certificate Verification</h1>
          <p className="mt-2 text-sm text-emerald-700/80">Enter a certificate number or scan the QR code to verify authenticity.</p>
        </div>

        <div className="mt-7 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
            <input className="input pl-9" placeholder="CERT-ON-2026-xxxxxx" value={input}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run(input)} />
          </div>
          <button className="btn-primary" onClick={() => run(input)} disabled={loading || !input}>{loading ? 'Verifying…' : 'Verify'}</button>
        </div>

        {err && <div className="mt-5 rounded-xl bg-reject/10 px-4 py-3 text-sm text-reject">{err}</div>}

        {data && (
          <MotionCard data={data} />
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-forest"><ArrowLeft size={15} /> Back to OnionSure</Link>
        </div>
      </div>
    </div>
  );
}

function MotionCard({ data }: { data: any }) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex items-center gap-2 text-fresh"><ShieldCheck size={20} /><span className="font-bold text-forest">✓ VERIFIED CERTIFICATE</span></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Lot Number" value={data.lotNumber} />
        <Field label="Grade" value={<GradeBadge grade={data.grade} />} />
        <Field label="Quality Score" value={`${data.qualityScore} / 100`} />
        <Field label="Inspection Date" value={new Date(data.inspectionDate).toLocaleDateString()} />
        <Field label="Procurement Center" value={data.procurementCenter} />
        <Field label="FPO" value={data.fpo || '—'} />
        <Field label="Grade A %" value={`${data.grade_a_percentage}%`} />
        <Field label="URS %" value={`${data.urs_percentage}%`} />
        <Field label="Rejected %" value={`${data.rejected_percentage}%`} />
        <Field label="Status" value={data.status} />
      </div>
      <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">Certificate ID: <b>{data.certificateNumber}</b></div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{label}</div>
      <div className="mt-1 text-lg font-bold text-emerald-950">{value}</div>
    </div>
  );
}
