import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar } from 'lucide-react';
import { ScheduledEditionResponse } from '../articles/types';
import { watchScheduledEdition } from '../articles/scheduledEdition';
import type { ScheduledEditionPhase } from '../lib/scheduledEditionState';
import { useDocumentTitle } from '../lib/documentTitle';
import ContentBlock from '../components/ContentBlock';
import SponsorAcknowledgement from '../components/SponsorAcknowledgement';
import EditionShare from '../components/EditionShare';

const ScheduledEdition: React.FC = () => {
    const [result, setResult] = useState<ScheduledEditionResponse | undefined>(undefined);
    const [phase, setPhase] = useState<ScheduledEditionPhase>('checking');

    useEffect(() => watchScheduledEdition(setResult, setPhase), []);
    useDocumentTitle(result?.edition.title ?? 'Edition');

    if (result === undefined) {
        const waiting = phase === 'waiting';
        return (
            <section className="article-layout text-center py-20" aria-labelledby="scheduled-edition-status-title">
                <div role="status" aria-live="polite">
                    <h1 id="scheduled-edition-status-title" className="text-3xl md:text-4xl font-bold text-white mb-4">
                        {waiting ? 'Edition not available yet' : 'Checking edition availability'}
                    </h1>
                    <p className="text-[var(--text-secondary)] mb-8">
                        {waiting
                            ? 'This edition has not been released. Please check back later.'
                            : 'The edition is temporarily unavailable. We will keep checking.'}
                    </p>
                </div>
                <Link to="/" className="inline-block px-6 py-3 rounded-full border border-[var(--glass-border)] hover:bg-[var(--accent-cyan)] hover:text-black hover:border-[var(--accent-cyan)] transition-all duration-300 font-medium">
                    Back to editions
                </Link>
            </section>
        );
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
                        <EditionShare editionId={edition.id} title={edition.title} />
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
