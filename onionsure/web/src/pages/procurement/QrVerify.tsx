import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, ScanLine, CheckCircle2, AlertTriangle, ShieldCheck, ArrowUpRight, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Spinner, GradeBadge } from '../../components/ui';

export default function QrVerify() {
  const nav = useNavigate();
  const [input, setInput] = useState('');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const run = async (id: string) => {
    if (!id.trim()) { setErr('Enter a certificate number to verify.'); setData(null); return; }
    setErr(''); setLoading(true);
    try {
      const r = await api.verify(id.trim());
      setData(r);
    } catch (e: any) { setData(null); setErr(e.message || 'Certificate not found'); }
    finally { setLoading(false); }
  };

  const loadSample = async () => {
    try {
      const certs = await api.getCertificates();
      if (certs && certs.length) { setInput(certs[0].certificateNumber); setTouched(true); run(certs[0].certificateNumber); }
      else setErr('No certificates available yet — run a New Inspection first.');
    } catch { setErr('Could not load a sample certificate.'); }
  };

  const invalid = touched && !input.trim();

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Quality &amp; Trust</div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><QrCode size={22} className="text-fresh" /> QR Verification</h1>
        <p className="mt-0.5 text-sm text-muted">Confirm any certificate's authenticity by number or scanned token.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className="space-y-5">
          <Card>
            <label className="label">Certificate Number / QR Token</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className={`input pl-9 ${invalid ? '!border-reject focus:!ring-reject/20' : ''}`}
                  placeholder="CERT-ON-2026-xxxxxx"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setTouched(true); if (err) setErr(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && run(input)}
                />
              </div>
              <button className="btn-primary" onClick={() => run(input)} disabled={loading || !input.trim()}>
                {loading ? <Spinner label="…" /> : 'Verify'}
              </button>
            </div>
            {invalid && <p className="mt-1.5 text-xs text-reject">Please enter a certificate number.</p>}

            <button className="btn-ghost mt-3 w-full justify-center" onClick={loadSample} disabled={loading}>
              <ScanLine size={16} /> Load latest certificate
            </button>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-mint px-3 py-2 text-sm text-forest">
              <ScanLine size={16} className="mt-0.5 shrink-0" />
              <span>Certificates print with a scannable QR linking to <code className="rounded bg-white/60 px-1">/verify/:id</code>. A buyer scans to confirm authenticity in seconds.</span>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2 font-bold text-ink"><ShieldCheck size={18} className="text-fresh" /> How verification works</div>
            <ol className="space-y-2 text-sm text-muted">
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">1</span> Scan the QR code or paste the certificate number.</li>
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">2</span> The backend checks it against the issued record.</li>
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">3</span> A verified result shows the lot, grade, score and center.</li>
            </ol>
          </Card>
        </div>

        <div className="lg:sticky lg:top-5 lg:self-start">
          {loading ? (
            <Card className="grid h-64 place-items-center"><Spinner label="Verifying…" /></Card>
          ) : err ? (
            <Card className="border-reject/20">
              <div className="flex items-start gap-3 text-reject">
                <AlertTriangle size={22} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold">Verification failed</div>
                  <p className="mt-1 text-sm text-muted">{err}</p>
                </div>
              </div>
            </Card>
          ) : data ? (
            <Card className="border-forest/30">
              <div className="flex items-center gap-2 text-fresh">
                <CheckCircle2 size={18} /> <span className="font-bold">VERIFIED CERTIFICATE</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Field label="Lot" value={data.lotNumber} />
                <Field label="Grade" value={<GradeBadge grade={data.grade} />} />
                <Field label="Quality Score" value={`${data.qualityScore}/100`} />
                <Field label="Inspection Date" value={new Date(data.inspectionDate).toLocaleDateString()} />
                <Field label="Procurement Center" value={data.procurementCenter} />
                <Field label="Status" value={<span className="font-bold text-fresh">{data.status}</span>} />
              </div>

              <div className="mt-4 rounded-xl bg-mint p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Scannable token</div>
                <FauxQR seed={data.certificateNumber} />
              </div>

              <button className="btn-ghost mt-4 w-full justify-center" onClick={() => nav(`/verify/${data.certificateNumber}`)}>
                Open public page <ArrowUpRight size={15} />
              </button>
            </Card>
          ) : (
            <Card className="grid h-64 place-items-center text-center">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint text-fresh"><QrCode size={26} /></div>
                <div className="mt-3 font-bold text-ink">Awaiting certificate</div>
                <p className="mt-1 max-w-[220px] text-sm text-muted">Enter a number or load the latest certificate to see its verified details here.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-bold text-ink">{value}</div>
    </div>
  );
}

function FauxQR({ seed }: { seed: string }) {
  const cells = Array.from({ length: 49 }).map((_, i) => {
    const code = (seed.charCodeAt(i % seed.length) + i * 7) % 3;
    return code === 0;
  });
  return (
    <div className="mt-2 grid w-[112px] grid-cols-7 gap-0.5">
      {cells.map((on, i) => (
        <span key={i} className={`h-3 w-3 rounded-[2px] ${on ? 'bg-forest' : 'bg-white'}`} />
      ))}
    </div>
  );
}
