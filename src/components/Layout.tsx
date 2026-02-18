import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, ExternalLink, Users } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Skip to main content — first focusable element */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:right-0 focus:z-[100] focus:bg-[var(--accent-cyan)] focus:text-black focus:text-center focus:py-3 focus:px-4 focus:font-semibold focus:text-sm"
            >
                Skip to main content
            </a>

            {/* Background Elements */}
            <div className="bg-mesh" />

            <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 header-glass">
                <nav aria-label="Main navigation" className="container h-20 flex flex-row items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors border border-white/5">
                            <BrainCircuit size={20} className="text-[var(--accent-cyan)]" />
                        </div>
                        <span className="font-bold tracking-tight text-lg">LongmontAI</span>
                    </Link>
                </nav>
            </header>

            <main id="main-content" className="flex-grow pt-32 pb-20">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="container"
                >
                    {children}
                </motion.div>
            </main>

            <footer role="contentinfo" className="border-t border-[var(--glass-border)] bg-[#09090b] py-12 mt-auto">
                <div className="container">
                    {/* Top section: Brand + Tagline */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 mb-10">
                        {/* Brand */}
                        <div className="md:max-w-xs">
                            <Link to="/" className="flex items-center gap-3 group mb-3">
                                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors border border-white/5">
                                    <BrainCircuit size={20} className="text-[var(--accent-cyan)]" />
                                </div>
                                <span className="font-bold tracking-tight text-lg">LongmontAI</span>
                            </Link>
                            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                Curated insights into the rapidly evolving world of AI.
                            </p>
                        </div>

                        {/* Footer Navigation */}
                        <nav aria-label="Footer navigation" className="flex flex-col sm:flex-row gap-10 sm:gap-16">
                            {/* Quick Links */}
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">
                                    Quick Links
                                </h3>
                                <ul className="space-y-2.5">
                                    <li>
                                        <Link to="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                            Home
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                            Latest Edition
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/about" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                            About / Tools Used
                                        </Link>
                                    </li>
                                    <li>
                                        <a
                                            href="https://www.meetup.com/longmont-ai-for-business-owners-and-creators"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm inline-flex items-center gap-1.5"
                                        >
                                            Meetup Page
                                            <ExternalLink size={12} className="opacity-60" />
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Connect */}
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">
                                    Connect
                                </h3>
                                <ul className="flex gap-3">
                                    <li>
                                        <a
                                            href="https://www.meetup.com/longmont-ai-for-business-owners-and-creators"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Join us on Meetup"
                                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            <Users size={16} />
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </nav>
                    </div>

                    {/* Bottom copyright */}
                    <div className="border-t border-[var(--glass-border)] pt-6">
                        <p className="text-[var(--text-muted)] text-sm text-center">
                            © {new Date().getFullYear()} LongmontAI. Curated by Intelligence.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
