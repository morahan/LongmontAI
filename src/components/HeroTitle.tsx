import React from 'react';

type Translation = {
    text: string;
    lang: string;
    dir: 'ltr' | 'rtl';
    script: 'latin' | 'cjk' | 'arabic' | 'hebrew' | 'devanagari';
    color: string;
};

const translations: Translation[] = [
    { text: 'Intelligence Age', lang: 'en', dir: 'ltr', script: 'latin', color: '#93c5fd' },
    { text: 'La era de la inteligencia', lang: 'es', dir: 'ltr', script: 'latin', color: '#a5b4fc' },
    { text: 'L’ère de l’intelligence', lang: 'fr', dir: 'ltr', script: 'latin', color: '#c4b5fd' },
    { text: '知能の時代', lang: 'ja', dir: 'ltr', script: 'cjk', color: '#7dd3fc' },
    { text: 'عصر الذكاء', lang: 'ar', dir: 'rtl', script: 'arabic', color: '#67e8f9' },
    { text: 'बुद्धिमत्ता का युग', lang: 'hi', dir: 'ltr', script: 'devanagari', color: '#a7f3d0' },
    { text: 'עידן הבינה', lang: 'he', dir: 'rtl', script: 'hebrew', color: '#bfdbfe' },
    { text: 'Intelligence Age', lang: 'en', dir: 'ltr', script: 'latin', color: '#93c5fd' },
];

function reducedMotionIsPreferred(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const HeroTitle: React.FC = () => {
    const [translationIndex, setTranslationIndex] = React.useState(0);
    const [reducedMotion, setReducedMotion] = React.useState(reducedMotionIsPreferred);
    const [pageVisible, setPageVisible] = React.useState(
        () => typeof document === 'undefined' || document.visibilityState === 'visible'
    );

    React.useEffect(() => {
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handlePreferenceChange = (event: MediaQueryListEvent) => {
            setReducedMotion(event.matches);
            if (event.matches) {
                setTranslationIndex(0);
            }
        };

        preference.addEventListener('change', handlePreferenceChange);
        return () => preference.removeEventListener('change', handlePreferenceChange);
    }, []);

    React.useEffect(() => {
        const handleVisibilityChange = () => setPageVisible(document.visibilityState === 'visible');
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    React.useEffect(() => {
        if (reducedMotion || !pageVisible || translationIndex >= translations.length - 1) {
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            setTranslationIndex((currentIndex) => Math.min(currentIndex + 1, translations.length - 1));
        }, 4800);

        return () => window.clearTimeout(timeout);
    }, [pageVisible, reducedMotion, translationIndex]);

    const translation = reducedMotion ? translations[0] : translations[translationIndex];

    return (
        <h1 className="home-hero-title text-4xl md:text-6xl font-bold mb-4 tracking-tight leading-tight text-white">
            <span className="sr-only">Navigating the Intelligence Age</span>
            <span className="hero-title-visual" aria-hidden="true">
                <span className="hero-title-navigation">
                    <span className="hero-title-navigating">Navigating</span>
                    <svg
                        className="hero-title-route"
                        viewBox="0 0 430 34"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path d="M5 24 C72 6, 128 31, 196 17 S318 7, 424 19" pathLength="1" />
                        <circle cx="5" cy="24" r="3" />
                        <circle cx="196" cy="17" r="3" />
                        <circle cx="424" cy="19" r="3" />
                    </svg>
                    <span className="hero-title-the">the</span>
                </span>
                <span className="hero-title-translation-stage">
                    <bdi
                        key={`${translation.lang}-${translationIndex}`}
                        className={`hero-title-translation hero-title-script-${translation.script}`}
                        lang={translation.lang}
                        dir={translation.dir}
                        style={{ color: translation.color }}
                    >
                        {translation.text}
                    </bdi>
                </span>
            </span>
        </h1>
    );
};

export default HeroTitle;
