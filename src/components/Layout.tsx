import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';

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

            <footer role="contentinfo" className="border-t border-[var(--glass-border)] py-12 mt-auto">
                <div className="container text-center">
                    <p className="text-[var(--text-muted)] text-sm">© {new Date().getFullYear()} LongmontAI. Curated by Intelligence.</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
