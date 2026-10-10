import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { canonicalEditionUrl, shareEdition, type EditionShareResult } from '../lib/editionShare';

interface EditionShareProps {
    editionId: string;
    title: string;
}

const messages: Record<EditionShareResult, string> = {
    shared: 'Edition shared.',
    copied: 'Edition link copied.',
    cancelled: 'Sharing cancelled.',
    failed: 'Unable to share this edition. Please copy the address from your browser.',
};

export default function EditionShare({ editionId, title }: EditionShareProps) {
    const [message, setMessage] = useState('');
    const [pending, setPending] = useState(false);
    const inFlight = useRef(false);

    const handleShare = async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        setPending(true);
        setMessage('');
        try {
            const url = canonicalEditionUrl(window.location.origin, editionId);
            const result = await shareEdition(navigator, title, url);
            setMessage(messages[result]);
        } finally {
            inFlight.current = false;
            setPending(false);
        }
    };

    return (
        <div className="relative flex items-center justify-end">
            <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-white/5 text-[var(--text-secondary)] hover:text-white transition-colors"
                style={{ opacity: pending ? 0.5 : 1 }}
                aria-label="Share this edition"
                disabled={pending}
                onClick={() => void handleShare()}
            >
                <Share2 size={20} aria-hidden="true" />
            </button>
            <span
                className={message ? undefined : 'sr-only'}
                style={message ? {
                    pointerEvents: 'none', position: 'absolute', right: 0, top: '100%',
                    zIndex: 10, marginTop: '0.5rem', width: 'max-content',
                    maxWidth: 'min(14rem, calc(100vw - 2rem))', borderRadius: '0.375rem',
                    border: '1px solid var(--glass-border)', background: '#111827',
                    padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem',
                    color: 'white', boxShadow: '0 4px 8px #0004',
                } : undefined}
                role={message ? 'status' : undefined}
                aria-live="polite"
                aria-atomic="true"
            >
                {message}
            </span>
        </div>
    );
}
