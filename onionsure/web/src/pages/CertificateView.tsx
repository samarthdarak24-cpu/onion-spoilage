import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Download, QrCode, MapPin, CalendarDays, UserCog, Leaf, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { Logo } from '../components/Brand';
import { GradeBadge, Spinner } from '../components/ui';

export default function CertificateView() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');

  // Keep the certificate live: refetch when the underlying lot is re-graded.
  useEffect(() => {
    let active = true;
    const load = () => api.getCertificate(id!).then((d) => active && setData(d)).catch((e) => active && setErr(e.message));
    load();
    const iv = setInterval(load, 15000);
    return () => { active = false; clearInterval(iv); };
  }, [id]);

  if (err) return <div className="grid h-screen place-items-center text-reject">{err}</div>;
  if (!data) return <div className="grid h-screen place-items-center"><Spinner label="Loading certificate…" /></div>;

  const { certificate: c, lot, fusion, center, fpo } = data;
  const verifyUrl = `${window.location.origin}/verify/${c.certificateNumber}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-gradient-to-br from-cream via-white to-emerald-50 p-5"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <Logo />
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => window.print()}><Download size={16} /> Download PDF</button>
            <a className="btn-primary" href={verifyUrl} target="_blank" rel="noreferrer"><QrCode size={16} /> Verify QR</a>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-soft">
          {/* Header band */}
          <div className="flex items-center justify-between bg-gradient-to-r from-darkgreen to-forest px-8 py-5 text-white">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-100">OnionSure</div>
              <div className="text-xl font-extrabold">Digital Quality Certificate</div>
            </div>
            <Award size={40} className="text-emerald-100" />
          </div>

          <div className="grid gap-8 p-8 md:grid-cols-[1fr_auto]">
            <div className="space-y-6">
              {/* Grade hero */}
              <div className="flex items-center gap-5">
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-forest text-white">
                  <div className="text-center"><div className="text-xs">GRADE</div><div className="text-3xl font-extrabold">{c.grade.replace('GRADE ', '').replace('REJECTED', 'REJ')}</div></div>
                </div>
                <div>
                  <div className="text-sm text-emerald-600">Quality Score</div>
                  <div className="text-4xl font-extrabold text-emerald-950">{c.qualityScore}<span className="text-xl text-emerald-400">/100</span></div>
                  <div className="mt-1"><GradeBadge grade={c.grade} /></div>
                </div>
              </div>

              <Section title="Lot Information">
                <KV k="Lot Number" v={lot?.lotNumber} />
                <KV k="Crop / Variety" v={`${lot?.crop} · ${lot?.variety}`} />
                <KV k="Quantity" v={`${lot?.quantityKg} kg`} />
                <KV k="FPO" v={fpo?.name || '—'} />
              </Section>

              <Section title="Quality Breakdown">
                <Bar label="Grade A %" v={c.grade_a_percentage} tone="forest" />
                <Bar label="URS %" v={c.urs_percentage} tone="amber" />
                <Bar label="Rejected %" v={c.rejected_percentage} tone="reject" />
              </Section>

              <Section title="Fusion Result">
                <KV k="Vision Score" v={fusion?.visionScore} />
                <KV k="Gas Score" v={fusion?.gasScore} />
                <KV k="Environment Score" v={fusion?.environmentalScore} />
                <KV k="Confidence" v={`${Math.round((fusion?.confidence || 0) * 100)}%`} />
                {fusion?.earlySpoilageAlert && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber/15 px-3 py-2 text-sm text-amber-700">
                    <Leaf size={16} className="mt-0.5" /> Early-spoilage signal detected via gas signature.
                  </div>
                )}
              </Section>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-700"><MapPin size={15} /> {center?.name}</div>
                <div className="flex items-center gap-2 text-emerald-700"><CalendarDays size={15} /> {new Date(c.createdAt).toLocaleString()}</div>
                <div className="flex items-center gap-2 text-emerald-700"><UserCog size={15} /> Inspector ID: {lot?.inspectorId?.slice(0, 10)}</div>
                <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={15} /> {center ? `${center.latitude?.toFixed(3)}, ${center.longitude?.toFixed(3)}` : '—'}</div>
              </div>
            </div>

            {/* QR */}
            <div className="flex flex-col items-center justify-start">
              <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                <QRCodeSVG value={verifyUrl} size={150} bgColor="#ffffff" fgColor="#0B5D3B" />
              </div>
              <div className="mt-2 text-center text-xs text-emerald-600">{c.certificateNumber}</div>
              <div className="mt-1 text-center text-[10px] text-emerald-400">Scan to verify authenticity</div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/quality/certificates" className="text-sm text-emerald-700 hover:text-forest">← Back to certificates</Link>
        </div>
      </div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">{title}</div><div className="space-y-1">{children}</div></div>;
}
function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between text-sm"><span className="text-emerald-600">{k}</span><span className="font-semibold text-emerald-950">{v ?? '—'}</span></div>;
}
function Bar({ label, v, tone }: { label: string; v: number; tone: 'forest' | 'amber' | 'reject' }) {
  const colors = { forest: 'bg-forest', amber: 'bg-amber', reject: 'bg-reject' };
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-emerald-600">{label}</span><span className="font-semibold">{v}%</span></div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-emerald-100"><div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${v}%` }} /></div>
    </div>
  );
}
