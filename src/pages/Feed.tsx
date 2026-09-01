import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { editionSummaries, type EditionSummary } from '../articles/editionSummaries';
import { isEditionPublished } from '../articles/types';
import { watchScheduledEdition } from '../articles/scheduledEdition';
import { ScheduledEditionResponse } from '../articles/types';
import SpaceNeuralBackground from '../components/SpaceNeuralBackground';
import { ArrowRight, Calendar, Mail, Search, Sparkles, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import SponsorAcknowledgement from '../components/SponsorAcknowledgement';
import HeroTitle from '../components/HeroTitle';

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function editionMatchesQuery(edition: EditionSummary, query: string): boolean {
    if (!query) {
        return true;
    }

    const haystack = `${edition.title} ${edition.summary} ${edition.date}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
}

const revealVariants: Variants = {
    hidden: { opacity: 0, y: 28 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
    },
};

const staggerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.11, delayChildren: 0.08 } },
};

const Feed: React.FC = () => {
    const prefersReducedMotion = useReducedMotion();
    const revealInitial = prefersReducedMotion ? false : 'hidden';
    const [archiveQuery, setArchiveQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');
    const [scheduledEdition, setScheduledEdition] = useState<ScheduledEditionResponse | null>(null);

    const [publicationNow, setPublicationNow] = useState(() => Date.now());
    const publishedEditions = useMemo(() => {
        const editionsById = new Map(editionSummaries.map((edition) => [edition.id, edition]));
        if (scheduledEdition && !editionsById.has(scheduledEdition.edition.id)) {
            editionsById.set(scheduledEdition.edition.id, scheduledEdition.edition);
        }

        return Array.from(editionsById.values())
            .filter((edition) => isEditionPublished(edition, publicationNow))
            .sort((left, right) => {
                const leftTime = Date.parse(left.publishAt ?? `${left.date}T00:00:00`);
                const rightTime = Date.parse(right.publishAt ?? `${right.date}T00:00:00`);
                return rightTime - leftTime;
            });
    }, [publicationNow, scheduledEdition]);

    React.useEffect(() => watchScheduledEdition((response) => {
        setScheduledEdition(response);
        setPublicationNow(Date.now());
    }), []);

    React.useEffect(() => {
        const nextPublishTime = editionSummaries
            .map((edition) => edition.publishAt ? Date.parse(edition.publishAt) : Number.POSITIVE_INFINITY)
            .filter((publishTime) => Number.isFinite(publishTime) && publishTime > publicationNow)
            .sort((left, right) => left - right)[0];

        if (!nextPublishTime) {
            return undefined;
        }

        const timeout = window.setTimeout(() => setPublicationNow(Date.now()), nextPublishTime - publicationNow);
        return () => window.clearTimeout(timeout);
    }, [publicationNow]);

    // Get the 3 latest editions that have reached their scheduled publication time.
    const latestEditions = publishedEditions.slice(0, 3);
    const archiveYears = useMemo(
        () => Array.from(new Set(publishedEditions.map((edition) => edition.date.slice(0, 4)))),
        [publishedEditions]
    );
    const filteredEditions = useMemo(
        () => publishedEditions.filter((edition) => {
            const matchesYear = selectedYear === 'all' || edition.date.startsWith(selectedYear);
            return matchesYear && editionMatchesQuery(edition, archiveQuery.trim());
        }),
        [archiveQuery, selectedYear, publishedEditions]
    );
    const hasActiveArchiveFilter = archiveQuery.trim().length > 0 || selectedYear !== 'all';

    return (
        <div className="home-feed max-w-5xl mx-auto">
            <div className="home-hero-scene" aria-hidden="true">
                <SpaceNeuralBackground />
                <div className="home-hero-shade" />
            </div>

            {/* Hero Section with Space Neural Network Animation */}
            <section className="home-hero">
                <div className="home-hero-copy">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={16} className="text-[var(--accent-cyan)]" />
                        <span className="text-xs font-mono text-[var(--accent-cyan)] uppercase tracking-wider">
                            Deep in the Latent Space
                        </span>
                    </div>
                    <HeroTitle />
                    <p className="home-hero-subtitle text-[var(--text-secondary)] text-lg md:text-xl max-w-xl">
                        Charting frontier models, agents, and the ideas reshaping everything — one edition at a time.
                    </p>
                    <div className="home-hero-actions">
                        <a
                            href="https://www.meetup.com/longmontai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="home-hero-action home-hero-action-primary"
                        >
                            <Users size={17} aria-hidden="true" />
                            <span>Join the Meetup</span>
                        </a>
                        <a
                            href="mailto:sponsors@longmontai.com?subject=LongmontAI%20event%20sponsorship"
                            className="home-hero-action home-hero-action-secondary"
                        >
                            <Mail size={17} aria-hidden="true" />
                            <span>Sponsors</span>
                        </a>
                    </div>
                </div>
            </section>

            <motion.section
                className="home-orbit-passage"
                aria-label="Continue to the latest LongmontAI briefings"
                initial={revealInitial}
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={revealVariants}
            >
                <div className="home-orbit-track" aria-hidden="true">
                    <span className="home-orbit-ring home-orbit-ring-outer" />
                    <span className="home-orbit-ring home-orbit-ring-inner" />
                    <span className="home-orbit-probe" />
                </div>
                <a className="home-scroll-cue" href="#latest">
                    <span>Enter the briefing</span>
                    <span className="home-scroll-cue-line" aria-hidden="true" />
                </a>
            </motion.section>

            <div className="home-feed-content">
                <motion.div
                    className="home-reveal home-sponsor-reveal"
                    initial={revealInitial}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={revealVariants}
                >
                    <SponsorAcknowledgement placement="home" />
                </motion.div>

            {/* Meetup Banner */}
            <motion.div
                className="home-meetup-banner home-reveal mb-12 p-4 text-center bg-[var(--accent-cyan)]/10 rounded-lg border border-[var(--accent-cyan)]/20"
                initial={revealInitial}
                whileInView="visible"
                viewport={{ once: true, amount: 0.25 }}
                variants={revealVariants}
            >
                <p className="text-[var(--text-primary)]">
                    Welcome to Longmont AI. To join our next meetup in 2026 check out{' '}
                    <a
                        href="https://www.meetup.com/longmontai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-cyan)] hover:underline"
                    >
                        meetup.com/longmontai
                    </a>
                </p>
            </motion.div>

            {/* Featured Blog Posts Section */}
            <motion.section
                id="latest"
                className="home-latest home-reveal mb-16"
                initial={revealInitial}
                whileInView="visible"
                viewport={{ once: true, amount: 0.12 }}
                variants={staggerVariants}
            >
                <motion.div className="home-latest-header flex items-center justify-between mb-8" variants={revealVariants}>
                    <h2 className="text-2xl font-bold">Latest Editions</h2>
                    <a
                        href="#archive"
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        View all <ArrowRight size={14} />
                    </a>
                </motion.div>
                
                <motion.div className="home-latest-grid grid md:grid-cols-3 gap-8" variants={staggerVariants}>
                    {latestEditions.map((edition) => (
                        <motion.div className="home-latest-card-wrap" key={edition.id} variants={revealVariants}>
                            <Link
                                to={`/edition/${edition.id}`}
                                className="home-latest-card-link block group"
                            >
                                <article className="home-latest-card bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl overflow-hidden hover:border-[var(--accent-cyan)]/50 transition-all duration-300">
                                    <div className="home-latest-card-body p-5">
                                    <span className="text-xs font-mono text-[var(--accent-cyan)] mb-2 block">
                                        {edition.date}
                                    </span>
                                    <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-2">
                                        {edition.title}
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)] line-clamp-3">
                                        {edition.summary}
                                    </p>
                                </div>
                                    <div className="home-latest-card-footer px-5 py-3 border-t border-[var(--glass-border)] flex items-center justify-between">
                                        <span className="text-xs text-[var(--accent-cyan)]">Read edition</span>
                                        <ArrowRight size={14} className="text-[var(--accent-cyan)] latest-card-arrow" />
                                    </div>
                                </article>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.section>

            {/* All Editions */}
            <motion.section
                id="archive"
                className="home-archive home-reveal relative pb-20"
                aria-labelledby="archive-heading"
                initial={revealInitial}
                whileInView="visible"
                viewport={{ once: true, amount: 0.08 }}
                variants={revealVariants}
            >
                <div className="home-archive-header">
                    <div>
                        <span className="home-archive-eyebrow">Archive</span>
                        <h2 id="archive-heading" className="text-2xl font-bold">All Editions</h2>
                    </div>
                    <p>
                        {filteredEditions.length} of {publishedEditions.length} editions
                    </p>
                </div>

                <div className="home-archive-controls" aria-label="Filter editions">
                    <label className="home-archive-search">
                        <Search size={16} aria-hidden="true" />
                        <span className="sr-only">Search editions</span>
                        <input
                            type="search"
                            value={archiveQuery}
                            onChange={(event) => setArchiveQuery(event.target.value)}
                            placeholder="Search editions"
                        />
                    </label>

                    <div className="home-archive-years" aria-label="Filter by year">
                        <button
                            type="button"
                            aria-pressed={selectedYear === 'all'}
                            className={selectedYear === 'all' ? 'is-active' : ''}
                            onClick={() => setSelectedYear('all')}
                        >
                            All years
                        </button>
                        {archiveYears.map((year) => (
                            <button
                                key={year}
                                type="button"
                                aria-pressed={selectedYear === year}
                                className={selectedYear === year ? 'is-active' : ''}
                                onClick={() => setSelectedYear(year)}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredEditions.length > 0 ? (
                    <div className="home-archive-list">
                        {filteredEditions.map((edition) => (
                            <Link key={edition.id} to={`/edition/${edition.id}`} className="home-archive-row">
                                <time dateTime={edition.date}>
                                    <Calendar size={14} aria-hidden="true" />
                                    {formatDate(edition.date)}
                                </time>
                                <div>
                                    <h3>{edition.title}</h3>
                                    <p>{edition.summary}</p>
                                </div>
                                <span aria-hidden="true">
                                    <ArrowRight size={16} />
                                </span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="home-archive-empty">
                        <h3>No editions found</h3>
                        <p>Try a broader search or clear the current filters.</p>
                        {hasActiveArchiveFilter && (
                            <button
                                type="button"
                                onClick={() => {
                                    setArchiveQuery('');
                                    setSelectedYear('all');
                                }}
                            >
                                <X size={14} aria-hidden="true" />
                                Clear filters
                            </button>
                        )}
                    </div>
                )}

                {hasActiveArchiveFilter && filteredEditions.length > 0 && (
                    <div className="home-archive-clear">
                        <button
                            type="button"
                            onClick={() => {
                                setArchiveQuery('');
                                setSelectedYear('all');
                            }}
                        >
                            <X size={14} aria-hidden="true" />
                            Clear filters
                        </button>
                    </div>
                )}
            </motion.section>
            </div>
        </div>
    );
};

export default Feed;
