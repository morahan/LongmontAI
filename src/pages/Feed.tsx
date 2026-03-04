import React, { useState, useEffect } from 'react';
import { editions } from '../articles';
import EditionCard from '../components/EditionCard';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const heroImages = [
    '/images/hero/hero-1.png',
    '/images/hero/hero-2.png',
];

const Feed: React.FC = () => {
    const [currentHero, setCurrentHero] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentHero((prev) => (prev + 1) % heroImages.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    // Get the 3 latest editions
    const latestEditions = editions.slice(0, 3);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Hero Section with AI Art */}
            <section className="relative h-[60vh] min-h-[500px] rounded-2xl overflow-hidden mb-16">
                <motion.div
                    key={currentHero}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0"
                >
                    <img 
                        src={heroImages[currentHero]} 
                        alt="Longmont AI Hero"
                        className="w-full h-full object-cover"
                    />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/50 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles size={16} className="text-[var(--accent-cyan)]" />
                            <span className="text-xs font-mono text-[var(--accent-cyan)] uppercase tracking-wider">
                                AI-Generated Art
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight leading-tight">
                            Intelligence <span className="text-gradient-vibrant">Unleashed</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] text-lg md:text-xl max-w-xl">
                            Curated insights into the rapidly evolving world of Artificial Intelligence.
                        </p>
                    </motion.div>
                </div>

                {/* Hero Navigation Dots */}
                <div className="absolute bottom-8 right-8 flex gap-2">
                    {heroImages.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentHero(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${
                                idx === currentHero 
                                    ? 'bg-[var(--accent-cyan)] w-6' 
                                    : 'bg-white/30 hover:bg-white/50'
                            }`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </section>

            {/* Meetup Banner */}
            <div className="mb-12 p-4 text-center bg-[var(--accent-cyan)]/10 rounded-lg border border-[var(--accent-cyan)]/20">
                <p className="text-[var(--text-primary)]">
                    Welcome to Longmont AI. To join our next meetup in 2026 check out{' '}
                    <a
                        href="https://www.meetup.com/longmont-ai-for-business-owners-and-creators"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-cyan)] hover:underline"
                    >
                        meetup.com/longmont-ai-for-business-owners-and-creators
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
                
                <div className="grid md:grid-cols-3 gap-6">
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
            <section className="flex flex-col gap-[100px] relative pb-20">
                <div className="text-center mb-8">
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
