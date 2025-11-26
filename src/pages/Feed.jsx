import React from 'react';
import { editions } from '../data/content';
import EditionCard from '../components/EditionCard';
import { motion } from 'framer-motion';

const Feed = () => {
    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-20 text-center pt-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    <span className="inline-block px-3 py-1 mb-6 text-xs font-mono text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 rounded-full border border-[var(--accent-cyan)]/20">
                        BIWEEKLY INTELLIGENCE
                    </span>
                    <h1 className="text-5xl md:text-8xl font-bold mb-6 tracking-tight leading-tight drop-shadow-lg">
                        Intelligence <br />
                        <span className="text-gradient-vibrant">Unleashed</span>
                    </h1>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-[var(--text-secondary)] text-lg md:text-xl max-w-xl mx-auto leading-relaxed"
                >
                    Curated insights into the rapidly evolving world of Artificial Intelligence.
                </motion.p>
            </div>

            <div className="flex flex-col gap-16 relative pb-20">
                <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--glass-border)] to-transparent hidden md:block"></div>
                {editions.map((edition, index) => (
                    <EditionCard key={edition.id} edition={edition} index={index} />
                ))}
            </div>
        </div>
    );
};

export default Feed;
