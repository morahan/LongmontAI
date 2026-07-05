import React from 'react';
import { editions } from '../articles';
import EditionCard from '../components/EditionCard';
import SpaceNeuralBackground from '../components/SpaceNeuralBackground';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const heroFadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
});

const Feed: React.FC = () => {
    // Get the 3 latest editions
    const latestEditions = editions.slice(0, 3);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Hero Section with Space Neural Network Animation */}
            <section className="home-hero relative h-[60vh] min-h-[500px] rounded-2xl overflow-hidden mb-16 bg-[#050508] border border-white/5 shadow-2xl">
                <SpaceNeuralBackground />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent pointer-events-none" />
                
                <div className="home-hero-copy absolute bottom-0 left-0 right-0 p-8 md:p-12 z-10">
                    <motion.div {...heroFadeUp(0.25)} className="flex items-center gap-2 mb-4">
                        <Sparkles size={16} className="text-[var(--accent-cyan)]" />
                        <span className="text-xs font-mono text-[var(--accent-cyan)] uppercase tracking-wider">
                            Neural Universe
                        </span>
                    </motion.div>
                    <motion.h1 {...heroFadeUp(0.43)} className="text-4xl md:text-6xl font-bold mb-4 tracking-tight leading-tight text-white">
                        Intelligence <span className="text-gradient-vibrant">Unleashed</span>
                    </motion.h1>
                    <motion.p {...heroFadeUp(0.61)} className="text-[var(--text-secondary)] text-lg md:text-xl max-w-xl">
                        Curated insights into the rapidly evolving world of Artificial Intelligence.
                    </motion.p>
                </div>
            </section>

            {/* Meetup Banner */}
            <div className="mb-12 p-4 text-center bg-[var(--accent-cyan)]/10 rounded-lg border border-[var(--accent-cyan)]/20">
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
            <section className="mb-16">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">Latest Editions</h2>
                    <Link 
                        to="/" 
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        View all <ArrowRight size={14} />
                    </Link>
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
                                        <span className="text-xs text-[var(--text-muted)]">Read more</span>
                                        <ArrowRight size={14} className="text-[var(--accent-cyan)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </article>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* All Editions */}
            <section className="flex flex-col gap-8 relative pb-20">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">All Editions</h2>
                </div>
                {editions.map((edition, index) => (
                    <EditionCard key={edition.id} edition={edition} index={index} />
                ))}
            </section>
        </div>
    );
};

export default Feed;
