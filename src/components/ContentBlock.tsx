import React from 'react';

import { ExternalLink, Code, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ContentItem } from '../data/content';

interface ContentBlockProps {
    item: ContentItem;
}

const ContentBlock: React.FC<ContentBlockProps> = ({ item }) => {
    switch (item.type) {
        case 'text':
        case 'markdown':
            return (
                <div className="prose prose-invert prose-lg max-w-none mb-8 text-[var(--text-secondary)]">
                    <ReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-white mt-16 mb-6" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-white mt-12 mb-5" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-[var(--accent-cyan)] mt-10 mb-4" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-6 leading-relaxed" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-6 space-y-2" {...props} />,
                            li: ({ node, ...props }) => <li className="text-[var(--text-secondary)]" {...props} />,
                            strong: ({ node, ...props }) => <strong className="text-white font-semibold" {...props} />,
                        }}
                    >
                        {item.content}
                    </ReactMarkdown>
                </div>
            );

        case 'image':
            return (
                <figure className="mb-8">
                    <div className="rounded-xl overflow-hidden border border-[var(--glass-border)] bg-black/20">
                        <img
                            src={item.url}
                            alt={item.caption}
                            className="w-full max-h-[600px] object-contain mx-auto hover:scale-[1.02] transition-transform duration-700"
                        />
                    </div>
                    {item.caption && (
                        <figcaption className="mt-3 text-sm text-[var(--text-secondary)] text-center font-mono">
                            {item.caption}
                        </figcaption>
                    )}
                </figure>
            );

        case 'video':
            return (
                <div className="mb-8 rounded-xl overflow-hidden border border-[var(--glass-border)] aspect-video bg-black flex items-center justify-center relative group cursor-pointer">
                    {/* Placeholder for actual video player implementation */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-[var(--accent-cyan)] flex items-center justify-center text-black pl-1 shadow-[0_0_20px_var(--accent-glow)] group-hover:scale-110 transition-transform">
                            <Play fill="currentColor" size={24} />
                        </div>
                    </div>
                    <span className="absolute bottom-4 right-4 text-xs font-mono bg-black/60 px-2 py-1 rounded text-white">
                        VIDEO PLAYER
                    </span>
                </div>
            );

        case 'link':
            return (
                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-8 glass-panel p-6 hover:border-[var(--accent-cyan)] transition-colors group"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--accent-cyan)] transition-colors">
                                {item.title}
                            </h3>
                            <p className="text-[var(--text-secondary)] text-sm">
                                {item.description}
                            </p>
                        </div>
                        <ExternalLink size={20} className="text-[var(--text-secondary)] group-hover:text-white transition-colors" />
                    </div>
                </a>
            );

        case 'code':
            return (
                <div className="mb-8 rounded-xl overflow-hidden border border-[var(--glass-border)] bg-[#0f0f0f]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)] bg-[#1a1a1a]">
                        <span className="text-xs font-mono text-[var(--text-secondary)] uppercase">{item.language}</span>
                        <Code size={14} className="text-[var(--text-secondary)]" />
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm font-mono text-[var(--text-secondary)]">
                        <code>{item.content}</code>
                    </pre>
                </div>
            );

        default:
            return null;
    }
};

export default ContentBlock;
