import React, { useMemo, useState } from 'react';
import { Edition, editions } from '../articles';
import SpaceNeuralBackground from '../components/SpaceNeuralBackground';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Mail, Search, Sparkles, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import SponsorAcknowledgement from '../components/SponsorAcknowledgement';

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function editionMatchesQuery(edition: Edition, query: string): boolean {
    if (!query) {
        return true;
    }

    const haystack = `${edition.title} ${edition.summary} ${edition.date}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
}

const Feed: React.FC = () => {
    const [archiveQuery, setArchiveQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');

    // Get the 3 latest editions
    const latestEditions = editions.slice(0, 3);
    const archiveYears = useMemo(
        () => Array.from(new Set(editions.map((edition) => edition.date.slice(0, 4)))),
        []
    );
    const filteredEditions = useMemo(
        () => editions.filter((edition) => {
            const matchesYear = selectedYear === 'all' || edition.date.startsWith(selectedYear);
            return matchesYear && editionMatchesQuery(edition, archiveQuery.trim());
        }),
        [archiveQuery, selectedYear]
    );
    const hasActiveArchiveFilter = archiveQuery.trim().length > 0 || selectedYear !== 'all';

    return (
        <div className="max-w-5xl mx-auto">
            {/* Hero Section with Space Neural Network Animation */}
            <section className="home-hero relative h-[60vh] min-h-[500px] rounded-2xl overflow-hidden mb-16 bg-[#050508] border border-white/5 shadow-2xl">
                <SpaceNeuralBackground />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent pointer-events-none" />
                
                <div className="home-hero-copy absolute bottom-0 left-0 right-0 p-8 md:p-12 z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={16} className="text-[var(--accent-cyan)]" />
                        <span className="text-xs font-mono text-[var(--accent-cyan)] uppercase tracking-wider">
                            Deep in the Latent Space
                        </span>
                    </div>
                    <h1 className="home-hero-title text-4xl md:text-6xl font-bold mb-4 tracking-tight leading-tight text-white">
                        Navigating the <span className="text-gradient-vibrant">Intelligence Age</span>
                    </h1>
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

            <SponsorAcknowledgement placement="home" />

            {/* Meetup Banner */}
            <div className="home-meetup-banner mb-12 p-4 text-center bg-[var(--accent-cyan)]/10 rounded-lg border border-[var(--accent-cyan)]/20">
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
            </div>

            {/* Featured Blog Posts Section */}
            <section id="latest" className="mb-16">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">Latest Editions</h2>
                    <a
                        href="#archive"
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        View all <ArrowRight size={14} />
                    </a>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                    {latestEditions.map((edition, index) => (
                        <motion.div
                            key={edition.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index, duration: 0.5 }}
                        >
                            <Link 
                                to={`/edition/${edition.id}`}
                                className="block group"
                            >
                                <article className="bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl overflow-hidden hover:border-[var(--accent-cyan)]/50 transition-all duration-300">
                                    <div className="p-5">
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
                                    <div className="px-5 py-3 border-t border-[var(--glass-border)] flex items-center justify-between">
                                        <span className="text-xs text-[var(--accent-cyan)]">Read edition</span>
                                        <ArrowRight size={14} className="text-[var(--accent-cyan)] latest-card-arrow" />
                                    </div>
                                </article>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* All Editions */}
            <section id="archive" className="home-archive relative pb-20" aria-labelledby="archive-heading">
                <div className="home-archive-header">
                    <div>
                        <span className="home-archive-eyebrow">Archive</span>
                        <h2 id="archive-heading" className="text-2xl font-bold">All Editions</h2>
                    </div>
                    <p>
                        {filteredEditions.length} of {editions.length} editions
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
            </section>
        </div>
    );
};

export default Feed;
