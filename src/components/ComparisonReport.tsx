import { useState } from 'react';
import {
  photoUrl,
  type Box,
  type Finding,
  type FindingStatus,
  type OwnerResponse,
  type Photo,
  type PhotoSource,
  type Report,
  type Verdict,
} from '../lib/api';
import { formatDateTime } from '../lib/format';

const OVERALL: Record<Report['overall'], { text: string; tone: string }> = {
  NO_NEW_DAMAGE: { text: 'No new damage found', tone: 'good' },
  WEAR_AND_TEAR_ONLY: { text: 'Only normal wear and tear', tone: 'good' },
  NEW_DAMAGE_FOUND: { text: 'Possible new damage', tone: 'bad' },
  INSUFFICIENT_EVIDENCE: { text: 'Not enough evidence to decide', tone: 'warn' },
};

const STATUS: Record<FindingStatus, { text: string; tone: string }> = {
  NEW_DAMAGE: { text: 'New damage', tone: 'bad' },
  UNCLEAR: { text: 'Unclear', tone: 'warn' },
  PRE_EXISTING: { text: 'Already there at move-in', tone: 'info' },
  WEAR_AND_TEAR: { text: 'Normal wear and tear', tone: 'good' },
  NOT_DAMAGE: { text: 'Not damage', tone: 'good' },
  NO_CHANGE: { text: 'No change', tone: 'good' },
};

const ORDER = Object.keys(STATUS) as FindingStatus[];

interface Props {
  report: Report;
  comparedAt: string | null;
  photos: Photo[];
  responses: Record<string, OwnerResponse>;
  source: PhotoSource;
  /** Present on the owner's shared page. */
  onRespond?: (findingId: string, verdict: Verdict, comment?: string) => Promise<void>;
}

export function ComparisonReportView({ report, comparedAt, photos, responses, source, onRespond }: Props) {
  const overall = OVERALL[report.overall] ?? OVERALL.INSUFFICIENT_EVIDENCE;
  const findings = [...report.findings].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const verified = report.evidence.filter((e) => e.verified).length;
  const allVerified = verified === report.evidence.length;
  const labels = Object.fromEntries(report.evidence.map((e) => [e.photoId, e.label]));
  const photoById = Object.fromEntries(photos.map((p) => [p.id, p]));
  const disputed = findings.filter((f) => responses[f.id]?.verdict === 'DISPUTE').length;
  const agreed = findings.filter((f) => responses[f.id]?.verdict === 'AGREE').length;

  return (
    <div className="report">
      <div className="report-head">
        <span className={`badge badge-lg badge-${overall.tone}`}>{overall.text}</span>
        <span className="small muted">Report from {formatDateTime(comparedAt)}</span>
      </div>
      <p className="summary">{report.summary}</p>

      <div className={`evidence ${allVerified ? 'evidence-ok' : 'evidence-bad'}`}>
        {allVerified
          ? `✓ All ${verified} photos match the fingerprints recorded at upload, so none were changed afterwards.`
          : `⚠ ${report.evidence.length - verified} of ${report.evidence.length} photos no longer match their upload fingerprint.`}
      </div>

      {(agreed > 0 || disputed > 0) && !onRespond && (
        <div className="evidence evidence-info">
          Owner response: {agreed} agreed, {disputed} disputed.
        </div>
      )}

      <div className="findings">
        {findings.map((f) => (
          <FindingRow
            key={f.id}
            finding={f}
            before={photoById[f.moveInPhotoId]}
            after={photoById[f.moveOutPhotoId]}
            beforeLabel={labels[f.moveInPhotoId]}
            afterLabel={labels[f.moveOutPhotoId]}
            response={responses[f.id]}
            source={source}
            onRespond={onRespond}
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
        Changes found by comparing the photos, then described by {report.model}, running on this computer. This is
        evidence to help tenant and owner agree, not a legal judgement.
      </p>
    </div>
  );
}

interface RowProps {
  finding: Finding;
  before?: Photo;
  after?: Photo;
  beforeLabel?: string;
  afterLabel?: string;
  response?: OwnerResponse;
  source: PhotoSource;
  onRespond?: Props['onRespond'];
}

function FindingRow({ finding, before, after, beforeLabel, afterLabel, response, source, onRespond }: RowProps) {
  const important = finding.status === 'NEW_DAMAGE' || finding.status === 'UNCLEAR';
  const [open, setOpen] = useState(important);
  const status = STATUS[finding.status] ?? STATUS.UNCLEAR;

  return (
    <div className={`finding finding-${status.tone}`}>
      <button className="finding-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`badge badge-${status.tone}`}>{status.text}</span>
        <span className="finding-title">
          <b>{finding.item}</b>
          {finding.location && <span className="muted"> · {finding.location}</span>}
        </span>
        {finding.severity !== 'none' && <span className="small muted">{finding.severity} severity</span>}
        {response && (
          <span className={`badge badge-${response.verdict === 'AGREE' ? 'good' : 'bad'}`}>
            Owner {response.verdict === 'AGREE' ? 'agrees' : 'disputes'}
          </span>
        )}
        <span className="chevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      <p>{finding.description}</p>
      {response?.comment && <p className="owner-comment">Owner: “{response.comment}”</p>}
      {open && (
        <>
          <div className="compare-pair">
            <Side title={beforeLabel ?? 'Move-in'} photo={before} box={finding.box} source={source} />
            <Side title={afterLabel ?? 'Move-out'} photo={after} box={finding.box} source={source} />
          </div>
          <p className="small muted">
            {finding.source === 'ai'
              ? finding.box
                ? `AI confidence ${Math.round(finding.confidence * 100)}%. The box marks the area that changed.`
                : 'Described by the local AI.'
              : 'Found by comparing the photos directly.'}
          </p>
          {onRespond && <RespondControls findingId={finding.id} current={response} onRespond={onRespond} />}
        </>
      )}
    </div>
  );
}

function Side({ title, photo, box, source }: { title: string; photo?: Photo; box: Box | null; source: PhotoSource }) {
  return (
    <figure>
      {photo ? (
        <div className="boxed">
          <img src={photoUrl(source, photo.id)} alt={title} />
          {box && (
            <span
              className="box"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
              }}
            />
          )}
        </div>
      ) : (
        <div className="thumb-empty">Photo not available</div>
      )}
      <figcaption>
        {title}
        {photo && ` · ${formatDateTime(photo.capturedAt)}`}
      </figcaption>
    </figure>
  );
}

function RespondControls({
  findingId,
  current,
  onRespond,
}: {
  findingId: string;
  current?: OwnerResponse;
  onRespond: NonNullable<Props['onRespond']>;
}) {
  const [comment, setComment] = useState(current?.comment ?? '');
  const [busy, setBusy] = useState(false);

  async function send(verdict: Verdict) {
    setBusy(true);
    try {
      await onRespond(findingId, verdict, comment.trim() || undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="respond">
      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        placeholder="Optional comment for the tenant"
        aria-label="Comment"
      />
      <button
        className={`btn ${current?.verdict === 'AGREE' ? 'btn-primary' : 'btn-secondary'}`}
        disabled={busy}
        onClick={() => send('AGREE')}
      >
        Agree
      </button>
      <button
        className={`btn ${current?.verdict === 'DISPUTE' ? 'btn-danger' : 'btn-ghost'}`}
        disabled={busy}
        onClick={() => send('DISPUTE')}
      >
        Dispute
      </button>
    </div>
  );
}
