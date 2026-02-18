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
            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-4 font-mono">
                <Calendar size={14} />
                <time dateTime={edition.date}>{formatDate(edition.date)}</time>
            </div>

            <h2 id={headingId} className="text-2xl font-bold mb-3 text-white group-hover:text-[#818cf8] group-focus-within:text-[#818cf8] transition-colors">
                {edition.title}
            </h2>

            <p className="text-[var(--text-secondary)] mb-6 line-clamp-3">
                {edition.summary}
            </p>

            <Link
                to={`/edition/${edition.id}`}
                aria-label={`Read full edition: ${edition.title}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-[var(--accent-cyan)] hover:underline focus-visible:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
            >
                READ EDITION <ArrowRight size={16} className="group-hover:translate-x-1 group-focus-within:translate-x-1 transition-transform" />
            </Link>
        </motion.article>
    );
};

export default EditionCard;
