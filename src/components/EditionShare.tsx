import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { canonicalEditionUrl, shareEdition, type EditionShareResult } from '../lib/editionShare';

interface EditionShareProps {
  editionId: string;
  title: string;
}

const messages: Record<EditionShareResult, string> = {
  shared: 'Edition shared.',
  copied: 'Edition link copied.',
  failed: 'Unable to share this edition.',
};

export default function EditionShare({ editionId, title }: EditionShareProps) {
  const [message, setMessage] = useState('');

  const handleShare = async () => {
    const url = canonicalEditionUrl(window.location.origin, editionId);
    const result = await shareEdition(navigator, title, url);
    setMessage(messages[result]);
  };

  return (
    <div className="relative flex items-center justify-end">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-white/5 text-[var(--text-secondary)] hover:text-white transition-colors"
        aria-label="Share this edition"
        onClick={() => void handleShare()}
      >
        <Share2 size={20} aria-hidden="true" />
      </button>
      {message && (
        <span
          className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-max max-w-[min(14rem,calc(100vw-2rem))] rounded-md border border-[var(--glass-border)] bg-[#111827] px-3 py-2 text-left text-xs text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {message}
        </span>
      )}
    </div>
  );
}
