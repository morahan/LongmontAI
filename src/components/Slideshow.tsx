import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { slideshowDecks } from '../articles/slideshows';

interface SlideshowProps {
    deckId: string;
}

const Slideshow: React.FC<SlideshowProps> = ({ deckId }) => {
    const deck = slideshowDecks[deckId];
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        setCurrentSlide(0);
    }, [deckId]);

    if (!deck) {
        return (
            <div className="slideshow-panel slideshow-panel-missing">
                Missing slideshow: {deckId}
            </div>
        );
    }

    const slide = deck.slides[currentSlide];
    const slideCount = deck.slides.length;
    const titleId = `slideshow-title-${deck.id}`;

    function goToPrevious(): void {
        setCurrentSlide((current) => (current - 1 + slideCount) % slideCount);
    }

    function goToNext(): void {
        setCurrentSlide((current) => (current + 1) % slideCount);
    }

    return (
        <section className="slideshow-panel" aria-labelledby={titleId}>
            <div className="slideshow-header">
                <div>
                    <p className="slideshow-eyebrow">Slideshow</p>
                    <h3 id={titleId}>{deck.title}</h3>
                    <p>{deck.description}</p>
                </div>
                <a
                    href={deck.sourceUrl}
                    download
                    className="slideshow-download"
                    title={`Download ${deck.title}`}
                >
                    <Download size={16} aria-hidden="true" />
                    <span>Download PPTX</span>
                </a>
            </div>

            <div className="slideshow-frame">
                <img
                    src={slide.src}
                    alt={`${deck.title}: ${slide.title}`}
                    loading="lazy"
                />
                <button
                    type="button"
                    className="slideshow-nav slideshow-nav-left"
                    onClick={goToPrevious}
                    aria-label={`Previous slide in ${deck.title}`}
                    title="Previous slide"
                >
                    <ChevronLeft size={22} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className="slideshow-nav slideshow-nav-right"
                    onClick={goToNext}
                    aria-label={`Next slide in ${deck.title}`}
                    title="Next slide"
                >
                    <ChevronRight size={22} aria-hidden="true" />
                </button>
            </div>

            <div className="slideshow-footer">
                <p>
                    Slide {currentSlide + 1} of {slideCount}: {slide.title}
                </p>
                <div className="slideshow-dots" aria-label={`${deck.title} slide picker`}>
                    {deck.slides.map((deckSlide, index) => (
                        <button
                            key={deckSlide.src}
                            type="button"
                            className={index === currentSlide ? 'is-active' : ''}
                            onClick={() => setCurrentSlide(index)}
                            aria-label={`Show slide ${index + 1}: ${deckSlide.title}`}
                            aria-current={index === currentSlide ? 'true' : undefined}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Slideshow;
