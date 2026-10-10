import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar } from 'lucide-react';
import { editions, isEditionPublished } from '../articles';
import { scheduledEditionSlug } from '../articles/scheduledEdition';
import ContentBlock from '../components/ContentBlock';
import SponsorAcknowledgement from '../components/SponsorAcknowledgement';
import ScheduledEdition from './ScheduledEdition';
import EditionShare from '../components/EditionShare';
import { useDocumentTitle } from '../lib/documentTitle';

const Edition: React.FC = () => {
    const { id } = useParams();

    const edition = editions.find(e => e.id === id);
    const publishedEdition = edition && isEditionPublished(edition) ? edition : undefined;
    useDocumentTitle(publishedEdition?.title ?? 'Edition');

    // Static promotion always wins over a stale active scheduled pointer.
    if (!edition && id === scheduledEditionSlug) {
        return <ScheduledEdition />;
    }

    if (!publishedEdition) {
        return (
            <section className="article-layout text-center py-20" aria-labelledby="edition-unavailable-title">
                <h1 id="edition-unavailable-title" className="text-3xl md:text-4xl font-bold text-white mb-4">Edition unavailable</h1>
                <p className="text-[var(--text-secondary)] mb-8">This edition could not be found or has not been released.</p>
                <Link to="/" className="inline-block px-6 py-3 rounded-full border border-[var(--glass-border)] hover:bg-[var(--accent-cyan)] hover:text-black hover:border-[var(--accent-cyan)] transition-all duration-300 font-medium">
                    Back to editions
                </Link>
            </section>
        );
    }

    return (
        <article className="article-layout">
            <div className="mb-8">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors mb-6"
                >
                    <ArrowLeft size={16} /> BACK TO FEED
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-[var(--accent-cyan)] font-mono text-sm">
                            <Calendar size={16} />
                            <time dateTime={publishedEdition.date}>
                                {new Date(publishedEdition.date + 'T00:00:00').toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </time>
                        </div>
                        <EditionShare editionId={publishedEdition.id} title={publishedEdition.title} />
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        {publishedEdition.title}
                    </h1>

                    <div className="h-1 w-20 bg-[var(--accent-cyan)] mb-8 rounded-full"></div>
                </motion.div>
            </div>

            <SponsorAcknowledgement placement="edition" />

            <div className="space-y-4">
                {publishedEdition.markdownContent ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <ContentBlock markdown={publishedEdition.markdownContent} />
                    </motion.div>
                ) : publishedEdition.items ? (
                    publishedEdition.items.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                        >
                            <ContentBlock item={item} />
                        </motion.div>
                    ))
                ) : null}
            </div>

            <div className="mt-16 pt-8 border-t border-[var(--glass-border)] text-center">
                <p className="text-[var(--text-secondary)] mb-4">End of Edition</p>
                <Link
                    to="/"
                    className="inline-block px-6 py-3 rounded-full border border-[var(--glass-border)] hover:bg-[var(--accent-cyan)] hover:text-black hover:border-[var(--accent-cyan)] transition-all duration-300 font-medium"
                >
                    Read More Editions
                </Link>
            </div>
        </article>
    );
};

export default Edition;
