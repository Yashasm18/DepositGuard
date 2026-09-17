import { photoUrl, type Photo, type PhotoSource } from '../lib/api';
import { formatDateTime } from '../lib/format';

interface Props {
  photo: Photo;
  label: string;
  source: PhotoSource;
  onDelete?: () => void;
}

export function PhotoThumb({ photo, label, source, onDelete }: Props) {
  const url = photoUrl(source, photo.id);
  return (
    <figure className="thumb">
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={label} loading="lazy" />
      </a>
      {onDelete && (
        <button className="thumb-delete" onClick={onDelete} aria-label={`Delete ${label}`} title="Delete photo">
          ✕
        </button>
      )}
      <figcaption title={`SHA-256 fingerprint ${photo.sha256}`}>
        <b>{label}</b>
        <span>{formatDateTime(photo.capturedAt)}</span>
        <code>#{photo.sha256.slice(0, 10)}</code>
      </figcaption>
    </figure>
  );
}
