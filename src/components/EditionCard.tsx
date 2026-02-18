import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';
import { Edition } from '../articles';

interface EditionCardProps {
    edition: Edition;
    index: number;
}

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

const EditionCard: React.FC<EditionCardProps> = ({ edition, index }) => {
    const navigate = useNavigate();
    const headingId = `edition-heading-${edition.id}`;

    return (
        <motion.article
            aria-labelledby={headingId}
            tabIndex={0}
            role="link"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: index * 0.15,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1]
            }}
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate(`/edition/${edition.id}`)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/edition/${edition.id}`);
                }
            }}
            className="glass-panel p-8 hover:border-[var(--accent-cyan)] transition-all duration-300 group cursor-pointer"
        >
            {/* Edition number badge */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
                        EDITION
                    </span>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-mono">
                        <Calendar size={14} />
                        <time dateTime={edition.date}>{formatDate(edition.date)}</time>
                    </div>
                </div>
            </div>

            <h2 id={headingId} className="text-2xl md:text-3xl font-bold mb-4 text-white group-hover:text-[#818cf8] group-focus-within:text-[#818cf8] transition-colors leading-tight">
                {edition.title}
            </h2>

            {/* Accent divider */}
            <div className="h-0.5 w-12 bg-gradient-to-r from-[var(--color-blue)] to-[var(--color-purple)] mb-4 rounded-full group-hover:w-20 transition-all duration-500" />

            <p className="text-[var(--text-secondary)] mb-8 line-clamp-3 text-base leading-relaxed">
                {edition.summary}
            </p>

            <Link
                to={`/edition/${edition.id}`}
                aria-label={`Read full edition: ${edition.title}`}
                className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white hover:text-[var(--accent-cyan)] hover:underline focus-visible:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
            >
                Read Edition <ArrowRight size={16} className="group-hover:translate-x-1 group-focus-within:translate-x-1 transition-transform" />
            </Link>
        </motion.article>
    );
};

export default EditionCard;
