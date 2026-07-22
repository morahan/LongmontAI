import { ExternalLink } from 'lucide-react';

type SponsorAcknowledgementProps = {
    placement: 'edition' | 'home';
};

const sponsor = {
    name: '1023.digital',
    url: 'https://1023.digital',
};

const SponsorAcknowledgement = ({ placement }: SponsorAcknowledgementProps) => {
    const isEdition = placement === 'edition';

    return (
        <aside className={`sponsor-acknowledgement sponsor-acknowledgement-${placement}`} aria-label="Sponsor acknowledgement">
            <span className="sponsor-acknowledgement-label">
                {isEdition ? 'Made possible by' : 'With thanks to'}
            </span>
            <a
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="sponsor-acknowledgement-link"
            >
                <span>{sponsor.name}</span>
                <ExternalLink size={13} aria-hidden="true" />
            </a>
            {isEdition && (
                <p>
                    LongmontAI is grateful for their support of independent conversations about the future of AI.
                </p>
            )}
        </aside>
    );
};

export default SponsorAcknowledgement;
