import { Edition } from './types';

export const edition_2025_11_20: Edition = {
  id: 'edition-2025-11-20-ai-tools',
  date: '2025-11-20',
  title: 'AI Tools Used to create this site',
  summary: 'A transparent look at the generative and non-generative AI tools that powered the creation of this platform.',
  items: [
    {
      type: 'image',
      url: '/images/ai-tools-header.png',
      caption: 'Generated with Midjourney using prompt: "futuristic digital infrastructure, glowing nodes, network connections, blue and purple neon colors, high tech, 8k resolution"'
    },
    {
      type: 'markdown',
      content: `## Generative AI Tools
The following advanced AI systems were instrumental in building this website:

*   **Gemini**: Google's multimodal AI model.
*   **Antigravity**: An advanced agentic coding assistant.
*   **Cursor**: An AI-powered code editor.
*   **Claude Opus 4.5**: Anthropic's high-capability model.
*   **Midjourney**: For generating high-quality imagery.
*   **Claude Code**: Anthropic's coding assistant.`
    },
    {
      type: 'markdown',
      content: `## Non-Generative Tools
*Disclosure: The following tools were used for infrastructure, runtime, and development support but are not generative AI.*

*   **React**
*   **Vite**
*   **TypeScript**
*   **Vercel**
*   **Github**
*   **Godaddy**
*   **World Wide Web**
*   **HTTPS**
*   **TCPIP**
*   **Nanobannan**
*   **etc.**

---
*last updated: 2025.11.26*`
    }
  ]
};
