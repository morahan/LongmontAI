import React from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { articleDocuments } from '../articles/documents';

interface DocumentEmbedProps {
    documentId: string;
}

const DocumentEmbed: React.FC<DocumentEmbedProps> = ({ documentId }) => {
    const document = articleDocuments[documentId];

    if (!document) {
        return (
            <div className="document-panel document-panel-missing">
                Missing document: {documentId}
            </div>
        );
    }

    const titleId = `document-title-${document.id}`;

    return (
        <section className="document-panel" aria-labelledby={titleId}>
            <div className="document-header">
                <div>
                    <p className="document-eyebrow">
                        <FileText size={14} aria-hidden="true" />
                        Document
                    </p>
                    <h3 id={titleId}>{document.title}</h3>
                    <p>{document.description}</p>
                </div>
                <div className="document-actions">
                    <a
                        href={document.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-action"
                        title={`Open ${document.title}`}
                    >
                        <ExternalLink size={16} aria-hidden="true" />
                        <span>Open PDF</span>
                    </a>
                    <a
                        href={document.src}
                        download
                        className="document-action"
                        title={`Download ${document.title}`}
                    >
                        <Download size={16} aria-hidden="true" />
                        <span>Download</span>
                    </a>
                </div>
            </div>

            <a
                href={document.src}
                target="_blank"
                rel="noopener noreferrer"
                className="document-preview"
                aria-label={`Open ${document.title} PDF`}
            >
                <img src={document.previewSrc} alt={`${document.title} cover preview`} loading="eager" />
            </a>

            <details className="document-reader">
                <summary>View embedded PDF</summary>
                <div className="document-frame">
                    <iframe
                        src={`${document.src}#toolbar=1&navpanes=0`}
                        title={`${document.title} embedded PDF`}
                        loading="lazy"
                    />
                </div>
            </details>
        </section>
    );
};

export default DocumentEmbed;
