import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

export interface GalleryImage {
    src: string;
    alt: string;
}

interface ImageGalleryProps {
    images: GalleryImage[];
}

// Inline slideshow for a run of article images: one image at a time, expandable to fullscreen.
const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
    const [index, setIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Overlay fallback for browsers without the element Fullscreen API (e.g. iPhone Safari).
    const [isOverlay, setIsOverlay] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const count = images.length;
    const image = images[index];
    const expanded = isFullscreen || isOverlay;

    function step(delta: number): void {
        setIndex((current) => (current + delta + count) % count);
    }

    function toggleExpanded(): void {
        if (isOverlay) {
            setIsOverlay(false);
        } else if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else if (frameRef.current?.requestFullscreen) {
            frameRef.current.requestFullscreen().catch(() => setIsOverlay(true));
        } else {
            setIsOverlay(true);
        }
    }

    useEffect(() => {
        function onChange(): void {
            setIsFullscreen(document.fullscreenElement === frameRef.current);
        }
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    // While expanded, arrow keys page through images anywhere; Escape closes the overlay fallback.
    useEffect(() => {
        if (!expanded) return undefined;
        const previousOverflow = document.body.style.overflow;
        if (isOverlay) document.body.style.overflow = 'hidden';

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'ArrowLeft') setIndex((current) => (current - 1 + count) % count);
            else if (event.key === 'ArrowRight') setIndex((current) => (current + 1) % count);
            else if (event.key === 'Escape' && isOverlay) setIsOverlay(false);
            else return;
            event.preventDefault();
        }

        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [expanded, isOverlay, count]);

    function onFrameKey(event: React.KeyboardEvent): void {
        if (expanded) return;
        if (event.key === 'ArrowLeft') step(-1);
        else if (event.key === 'ArrowRight') step(1);
        else return;
        event.preventDefault();
    }

    const frame = (
        <div
            ref={frameRef}
            className={`slideshow-frame article-gallery-frame${expanded ? ' is-expanded' : ''}${isOverlay ? ' is-overlay' : ''}`}
            tabIndex={0}
            onKeyDown={onFrameKey}
            aria-roledescription="carousel"
            aria-label={`Image ${index + 1} of ${count}`}
        >
            <img src={image.src} alt={image.alt} loading="lazy" />
            {expanded && <p className="article-gallery-caption">{index + 1} / {count} · {image.alt}</p>}
            <button
                type="button"
                className="slideshow-expand"
                onClick={toggleExpanded}
                aria-label={expanded ? 'Exit full screen' : `View image ${index + 1} full screen`}
                title={expanded ? 'Exit full screen' : 'View full screen'}
            >
                {expanded ? <Minimize2 size={19} aria-hidden="true" /> : <Maximize2 size={19} aria-hidden="true" />}
            </button>
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
        </div>
    );

    return (
        <section className="slideshow-panel article-gallery-panel">
            {isOverlay ? createPortal(frame, document.body) : frame}
            <div className="slideshow-footer">
                <p>Image {index + 1} of {count}: {image.alt}</p>
                {count <= 12 && (
                    <div className="slideshow-dots" aria-label="Image picker">
                        {images.map((item, itemIndex) => (
                            <button
                                key={item.src}
                                type="button"
                                className={itemIndex === index ? 'is-active' : ''}
                                onClick={() => setIndex(itemIndex)}
                                aria-label={`Show image ${itemIndex + 1}`}
                                aria-current={itemIndex === index ? 'true' : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ImageGallery;
