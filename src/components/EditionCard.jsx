import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';

const EditionCard = ({ edition, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel p-8 hover:border-[var(--accent-cyan)] transition-colors duration-300 group"
        >
            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-3 font-mono">
                <Calendar size={14} />
                <span>{edition.date}</span>
            </div>

            <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-[var(--accent-cyan)] transition-colors">
                {edition.title}
            </h2>

            <p className="text-[var(--text-secondary)] mb-6 line-clamp-3">
                {edition.summary}
            </p>

            <Link
                to={`/edition/${edition.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-[var(--accent-cyan)] transition-colors"
            >
                READ EDITION <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
        </motion.div>
    );
};

export default EditionCard;
