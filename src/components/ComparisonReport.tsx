import { useState } from 'react';
import type { ComparisonReport, Finding, FindingStatus, Photo } from '../lib/client';
import { formatDateTime, usePhotoUrl } from './PhotoThumb';

const OVERALL: Record<ComparisonReport['overall'], { text: string; tone: string }> = {
  NO_NEW_DAMAGE: { text: 'No new damage found', tone: 'good' },
  WEAR_AND_TEAR_ONLY: { text: 'Only normal wear and tear', tone: 'good' },
  NEW_DAMAGE_FOUND: { text: 'New damage found', tone: 'bad' },
  INSUFFICIENT_EVIDENCE: { text: 'Not enough evidence to decide', tone: 'warn' },
};

const STATUS: Record<FindingStatus, { text: string; tone: string }> = {
  NEW_DAMAGE: { text: 'New damage', tone: 'bad' },
  PRE_EXISTING: { text: 'Already there at move-in', tone: 'info' },
  WEAR_AND_TEAR: { text: 'Normal wear and tear', tone: 'good' },
  NO_CHANGE: { text: 'No change', tone: 'good' },
  UNCLEAR: { text: 'Unclear', tone: 'warn' },
};

const ORDER: FindingStatus[] = ['NEW_DAMAGE', 'UNCLEAR', 'PRE_EXISTING', 'WEAR_AND_TEAR', 'NO_CHANGE'];

interface Props {
  report: ComparisonReport;
  comparedAt: string | null | undefined;
  photos: Photo[];
}

export function ComparisonReportView({ report, comparedAt, photos }: Props) {
  const overall = OVERALL[report.overall] ?? OVERALL.INSUFFICIENT_EVIDENCE;
  const findings = [...report.findings].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const verified = report.evidence.filter((e) => e.verified).length;
  const allVerified = verified === report.evidence.length;
  const photoFor = (phase: Photo['phase'], n: number) => {
    const ev = report.evidence.filter((e) => e.phase === phase)[n - 1];
    return ev && photos.find((p) => p.id === ev.photoId);
  };

  return (
    <div className="report">
      <div className="report-head">
        <span className={`badge badge-${overall.tone}`}>{overall.text}</span>
        <span className="small muted">Report generated {formatDateTime(comparedAt)}</span>
      </div>
      <p className="summary">{report.summary}</p>

      <div className={`evidence ${allVerified ? 'evidence-ok' : 'evidence-bad'}`}>
        {allVerified
          ? `✓ All ${verified} photos match the fingerprints recorded at upload, so none were changed afterwards.`
          : `⚠ ${report.evidence.length - verified} of ${report.evidence.length} photos no longer match their upload fingerprint.`}
      </div>

      <div className="findings">
        {findings.map((f, i) => (
          <FindingRow
            key={i}
            finding={f}
            before={f.moveInPhotos.map((n) => photoFor('MOVE_IN', n)).find(Boolean)}
            after={f.moveOutPhotos.map((n) => photoFor('MOVE_OUT', n)).find(Boolean)}
          />
        ))}
      </div>

      {report.photoQualityNotes.length > 0 && (
        <div className="notes">
          <h5>Photo tips</h5>
          <ul>
            {report.photoQualityNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="small muted disclaimer">
        AI-assisted evidence summary to help tenant and owner agree. It is not a legal judgement.
      </p>
    </div>
  );
}

function FindingRow({ finding, before, after }: { finding: Finding; before?: Photo; after?: Photo }) {
  const [open, setOpen] = useState(finding.status === 'NEW_DAMAGE');
  const status = STATUS[finding.status] ?? STATUS.UNCLEAR;
  const canShow = !!(before || after);
  return (
    <div className={`finding finding-${status.tone}`}>
      <button className="finding-head" onClick={() => setOpen(!open)} disabled={!canShow}>
        <span className={`badge badge-${status.tone}`}>{status.text}</span>
        <span className="finding-title">
          <b>{finding.item}</b> · {finding.location}
        </span>
        {finding.severity !== 'none' && <span className="small muted">{finding.severity} severity</span>}
        <span className="small muted">{Math.round(finding.confidence * 100)}% sure</span>
      </button>
      <p>{finding.description}</p>
      {open && canShow && (
        <div className="compare-pair">
          <Side title="Move-in" photo={before} />
          <Side title="Move-out" photo={after} />
        </div>
      )}
    </div>
  );
}

function Side({ title, photo }: { title: string; photo?: Photo }) {
  const url = usePhotoUrl(photo?.path);
  return (
    <figure>
      {url ? <img src={url} alt={title} /> : <div className="thumb-empty">No photo referenced</div>}
      <figcaption>
        {title}
        {photo && ` · ${formatDateTime(photo.capturedAt)}`}
      </figcaption>
    </figure>
  );
}
