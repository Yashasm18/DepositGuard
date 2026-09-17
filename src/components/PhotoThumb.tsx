import { useEffect, useState } from 'react';
import { getUrl } from 'aws-amplify/storage';
import type { Photo } from '../lib/client';

export function PhotoThumb({ photo, label }: { photo: Photo; label: string }) {
  const url = usePhotoUrl(photo.path);
  return (
    <figure className="thumb" title={`SHA-256 ${photo.sha256}`}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} loading="lazy" />
        </a>
      ) : (
        <div className="thumb-loading" />
      )}
      <figcaption>
        <b>{label}</b>
        <span>{formatDateTime(photo.capturedAt)}</span>
        <code>#{photo.sha256.slice(0, 10)}</code>
      </figcaption>
    </figure>
  );
}

export function usePhotoUrl(path: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    getUrl({ path, options: { expiresIn: 3600 } }).then(({ url }) => {
      if (!cancelled) setUrl(url.toString());
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
