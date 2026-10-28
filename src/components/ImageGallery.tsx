import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';

export interface GalleryImage {
    src: string;
    alt: string;
}

interface ImageGalleryProps {
    images: GalleryImage[];
}

// Thumbnail grid that opens a full-viewport carousel (arrow keys, Escape, browser fullscreen).
const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const indexRef = useRef<number | null>(null);
    const count = images.length;
    const isOpen = openIndex !== null;
    indexRef.current = openIndex;

    function close(): void {
        if (document.fullscreenElement) void document.exitFullscreen();
        const returnTo = indexRef.current;
        setOpenIndex(null);
        if (returnTo !== null) thumbRefs.current[returnTo]?.focus();
    }

    function step(delta: number): void {
        setOpenIndex((current) => (current === null ? current : (current + delta + count) % count));
    }

    useEffect(() => {
        if (!isOpen) return undefined;
        closeRef.current?.focus();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'ArrowLeft') step(-1);
            else if (event.key === 'ArrowRight') step(1);
            else if (event.key === 'Escape' && !document.fullscreenElement) close();
            else return;
            event.preventDefault();
        }

        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    const current = openIndex === null ? null : images[openIndex];

    return (
        <>
            <div className="article-gallery">
                {images.map((image, index) => (
                    <button
                        key={image.src}
                        ref={(element) => { thumbRefs.current[index] = element; }}
                        type="button"
                        className="article-gallery-thumb"
                        onClick={() => setOpenIndex(index)}
                        aria-label={`Open image ${index + 1} of ${count} in a carousel: ${image.alt}`}
                        title="Open in carousel"
                    >
                        <img src={image.src} alt={image.alt} loading="lazy" />
                    </button>
                ))}
            </div>

            {current && openIndex !== null && createPortal(
                <div
                    ref={overlayRef}
                    className="gallery-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Image ${openIndex + 1} of ${count}`}
                    onClick={(event) => { if (event.target === event.currentTarget) close(); }}
                >
                    <div className="gallery-lightbox-bar">
                        <span>{openIndex + 1} / {count}</span>
                        <div>
                            <button
                                type="button"
                                onClick={() => void overlayRef.current?.requestFullscreen()}
                                aria-label="View full screen"
                                title="View full screen"
                            >
                                <Maximize2 size={19} aria-hidden="true" />
                            </button>
                            <button ref={closeRef} type="button" onClick={close} aria-label="Close carousel" title="Close (Esc)">
                                <X size={22} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <img src={current.src} alt={current.alt} />
                    <p className="gallery-lightbox-caption">{current.alt}</p>
                    <button
                        type="button"
                        className="slideshow-nav slideshow-nav-left"
                        onClick={() => step(-1)}
                        aria-label="Previous image"
                        title="Previous (←)"
                    >
                        <ChevronLeft size={22} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="slideshow-nav slideshow-nav-right"
                        onClick={() => step(1)}
                        aria-label="Next image"
                        title="Next (→)"
                    >
                        <ChevronRight size={22} aria-hidden="true" />
                    </button>
                </div>,
                document.body,
            )}
        </>
    );
};

export default ImageGallery;
