import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { editions } from '../articles';
import ContentBlock from '../components/ContentBlock';

const Edition: React.FC = () => {
    const { id } = useParams();
    const edition = editions.find(e => e.id === id);

    if (!edition) {
        return <Navigate to="/" replace />;
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
                            <span>{edition.date}</span>
                        </div>
                        <button className="text-[var(--text-secondary)] hover:text-white transition-colors">
                            <Share2 size={20} />
                        </button>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        {edition.title}
                    </h1>

                    <div className="h-1 w-20 bg-[var(--accent-cyan)] mb-8 rounded-full"></div>
                </motion.div>
            </div>

            <div className="space-y-4">
                {edition.items.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                        <ContentBlock item={item} />
                    </motion.div>
                ))}
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
