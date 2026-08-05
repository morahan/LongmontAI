import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { ScheduledEditionResponse } from '../articles/types';
import { fetchScheduledEdition } from '../articles/scheduledEdition';
import ContentBlock from '../components/ContentBlock';
import SponsorAcknowledgement from '../components/SponsorAcknowledgement';

const ScheduledEdition: React.FC = () => {
    const [result, setResult] = useState<ScheduledEditionResponse | null | undefined>(undefined);

    useEffect(() => {
        const controller = new AbortController();
        void fetchScheduledEdition(controller.signal)
            .then(setResult)
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
                setResult(null);
            });
        return () => controller.abort();
    }, []);

    if (result === undefined) {
        return null;
    }

    if (!result) {
        return <Navigate to="/" replace />;
    }

    const { edition, slideshows } = result;
    return (
        <article className="article-layout">
            <div className="mb-8">
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors mb-6">
                    <ArrowLeft size={16} /> BACK TO FEED
                </Link>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-[var(--accent-cyan)] font-mono text-sm">
                            <Calendar size={16} />
                            <time dateTime={edition.date}>{new Date(`${edition.date}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                        </div>
                        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-white/5 text-[var(--text-secondary)] hover:text-white transition-colors" aria-label="Share this edition">
                            <Share2 size={20} />
                        </button>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">{edition.title}</h1>
                    <div className="h-1 w-20 bg-[var(--accent-cyan)] mb-8 rounded-full" />
                </motion.div>
            </div>
            <SponsorAcknowledgement placement="edition" />
            {edition.markdownContent && <div className="space-y-4"><ContentBlock markdown={edition.markdownContent} slideshows={slideshows} /></div>}
            <div className="mt-16 pt-8 border-t border-[var(--glass-border)] text-center">
                <p className="text-[var(--text-secondary)] mb-4">End of Edition</p>
                <Link to="/" className="inline-block px-6 py-3 rounded-full border border-[var(--glass-border)] hover:bg-[var(--accent-cyan)] hover:text-black hover:border-[var(--accent-cyan)] transition-all duration-300 font-medium">Read More Editions</Link>
            </div>
        </article>
    );
};

export default ScheduledEdition;
