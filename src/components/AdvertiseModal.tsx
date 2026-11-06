import { useEffect, useId, useRef, useState } from 'react';

const EMBED_SRC = 'https://flyoverit.apps.grok.bot';

export const EMBED_SNIPPET = `<!-- FlyOverIt embed -->
<iframe
  src="${EMBED_SRC}"
  title="FlyOverIt — hill launch plane game"
  width="100%"
  height="560"
  style="border:0;border-radius:8px;max-width:960px;aspect-ratio:16/10;height:auto;min-height:420px;background:#063642;"
  loading="lazy"
  allow="fullscreen; gamepad"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>`;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdvertiseModal({ open, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMBED_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for older / restricted contexts
      const ta = document.createElement('textarea');
      ta.value = EMBED_SNIPPET;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div
      className="advertise-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="advertise-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="advertise-head">
          <h2 id={titleId}>Advertise FlyOverIt.io</h2>
          <button
            ref={closeRef}
            type="button"
            className="text-btn advertise-close"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <p className="advertise-lead">
          Drop this HTML5 embed on your site so visitors can launch straight into the
          hangar.
        </p>
        <pre className="advertise-code" tabIndex={0}>
          <code>{EMBED_SNIPPET}</code>
        </pre>
        <div className="advertise-actions">
          <button type="button" className="ctl-btn ctl-primary" onClick={copy}>
            {copied ? 'Copied' : 'Copy embed code'}
          </button>
        </div>
      </div>
    </div>
  );
}
