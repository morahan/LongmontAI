import {
  chineseModelReleases,
  type ChineseModelRelease,
} from '../articles/drafts/2026.07.22/chinese-model-releases';
import { modelWatchModels } from './modelWatch';

export const timelineCategories = [
  'Research breakthrough',
  'Paper',
  'Model release',
  'Open weight',
  'Compute',
  'Scientific insight',
  'Forecast',
] as const;

export type TimelineCategory = (typeof timelineCategories)[number];

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  organization: string;
  category: TimelineCategory;
  summary: string;
  source: string;
  sourceUrl?: string;
  openWeight?: boolean;
  notable?: boolean;
}

const historicTimelineEvents: TimelineEvent[] = [
  {
    id: 'turing-computing-machinery', date: '1950-10-01', title: 'Computing Machinery and Intelligence', organization: 'Alan Turing', category: 'Paper',
    summary: 'Turing reframed the question of machine intelligence around an operational imitation game, now commonly called the Turing test.',
    source: 'Mind, 1950', sourceUrl: 'https://academic.oup.com/mind/article/LIX/236/433/986238', notable: true,
  },
  {
    id: 'dartmouth-workshop', date: '1956-06-18', title: 'Dartmouth Summer Research Project', organization: 'John McCarthy, Marvin Minsky, Claude Shannon and Nathaniel Rochester', category: 'Research breakthrough',
    summary: 'The proposal gave artificial intelligence its durable name and set out a research program for learning, language, abstraction and creativity.',
    source: 'Dartmouth proposal archive', sourceUrl: 'http://jmc.stanford.edu/articles/dartmouth/dartmouth.pdf', notable: true,
  },
  {
    id: 'perceptron', date: '1958-07-01', title: 'The Perceptron', organization: 'Frank Rosenblatt', category: 'Research breakthrough',
    summary: 'Rosenblatt described a trainable pattern-recognition system, an early landmark in neural-network learning.',
    source: 'Psychological Review, 1958', sourceUrl: 'https://psycnet.apa.org/record/1959-09865-001', notable: true,
  },
  {
    id: 'backpropagation', date: '1986-10-09', title: 'Back-propagating errors', organization: 'Rumelhart, Hinton and Williams', category: 'Paper',
    summary: 'The paper popularized gradient-based training for multi-layer neural networks and helped make modern deep learning practical.',
    source: 'Nature, 1986', sourceUrl: 'https://www.nature.com/articles/323533a0', notable: true,
  },
  {
    id: 'deep-blue', date: '1997-05-11', title: 'Deep Blue defeats Garry Kasparov', organization: 'IBM', category: 'Research breakthrough',
    summary: 'IBM\'s chess system won a six-game match against the reigning world champion, an early public benchmark for machine performance.',
    source: 'IBM archive', sourceUrl: 'https://www.ibm.com/history/deep-blue', notable: true,
  },
  {
    id: 'kurzweil-age-spiritual-machines', date: '1999-01-01', title: 'The Age of Spiritual Machines', organization: 'Ray Kurzweil', category: 'Forecast',
    summary: 'Kurzweil published a long-range forecast that computers would reach human-level intelligence around 2029. It is a forecast, not a scientific result.',
    source: 'The Age of Spiritual Machines, 1999', sourceUrl: 'https://www.kurzweilai.net/the-age-of-spiritual-machines', notable: true,
  },
  {
    id: 'deep-belief-nets', date: '2006-07-01', title: 'Deep belief nets', organization: 'Geoffrey Hinton, Simon Osindero and Yee-Whye Teh', category: 'Paper',
    summary: 'Layer-wise training renewed practical interest in deep neural networks during a period when the field was often described simply as machine learning.',
    source: 'Neural Computation, 2006', sourceUrl: 'https://www.cs.toronto.edu/~hinton/absps/fastnc.pdf', notable: true,
  },
  {
    id: 'imagenet', date: '2009-06-20', title: 'ImageNet dataset and challenge', organization: 'Fei-Fei Li and collaborators', category: 'Research breakthrough',
    summary: 'A large labeled visual dataset and competition created a common proving ground for image recognition systems.',
    source: 'ImageNet', sourceUrl: 'https://www.image-net.org/', notable: true,
  },
  {
    id: 'alexnet', date: '2012-09-30', title: 'AlexNet wins ImageNet', organization: 'Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton', category: 'Research breakthrough',
    summary: 'A deep convolutional network dramatically improved ImageNet classification, helping trigger the modern deep-learning wave in computer vision.',
    source: 'ImageNet Classification with Deep Convolutional Neural Networks', sourceUrl: 'https://web.stanford.edu/class/cs231m/references/alexnet.pdf', notable: true,
  },
  {
    id: 'gan', date: '2014-06-10', title: 'Generative Adversarial Nets', organization: 'Ian Goodfellow and collaborators', category: 'Paper',
    summary: 'GANs proposed adversarial training between generator and discriminator networks, opening a major line of image generation research.',
    source: 'NeurIPS 2014', sourceUrl: 'https://arxiv.org/abs/1406.2661', notable: true,
  },
  {
    id: 'resnet', date: '2015-12-10', title: 'Deep Residual Learning for Image Recognition', organization: 'Kaiming He and collaborators', category: 'Paper',
    summary: 'Residual connections made much deeper vision networks trainable and became a standard architectural ingredient across machine learning.',
    source: 'CVPR 2016', sourceUrl: 'https://arxiv.org/abs/1512.03385', notable: true,
  },
  {
    id: 'alphago', date: '2016-03-15', title: 'AlphaGo defeats Lee Sedol', organization: 'Google DeepMind', category: 'Research breakthrough',
    summary: 'The 4-1 match win joined deep learning, reinforcement learning and search in a highly visible demonstration of machine game play.',
    source: 'Google DeepMind', sourceUrl: 'https://deepmind.google/research/alphago/', notable: true,
  },
  {
    id: 'attention-is-all-you-need', date: '2017-06-12', title: 'Attention Is All You Need', organization: 'Google Brain and Google Research', category: 'Paper',
    summary: 'The Transformer replaced recurrence with attention, allowing highly parallel sequence modeling and becoming the core architecture behind most modern language models.',
    source: 'NeurIPS 2017', sourceUrl: 'https://research.google/pubs/attention-is-all-you-need/', notable: true,
  },
  {
    id: 'bert', date: '2018-10-11', title: 'BERT released', organization: 'Google', category: 'Open weight',
    summary: 'Bidirectional Transformer models and pretrained weights were released for broad reuse, rapidly reshaping language-understanding practice.',
    source: 'Google AI Blog', sourceUrl: 'https://research.google/blog/open-sourcing-bert-state-of-the-art-pre-training-for-natural-language-processing/', openWeight: true, notable: true,
  },
  {
    id: 'gpt-2', date: '2019-11-05', title: 'GPT-2 full model released', organization: 'OpenAI', category: 'Open weight',
    summary: 'OpenAI released the full GPT-2 model and source after a staged rollout, making a large generative language model broadly downloadable.',
    source: 'OpenAI', sourceUrl: 'https://openai.com/index/gpt-2-1-5b-release/', openWeight: true, notable: true,
  },
  {
    id: 'gpt-3', date: '2020-06-11', title: 'GPT-3 API announced', organization: 'OpenAI', category: 'Model release',
    summary: 'A large autoregressive language model became available through an API, helping establish the modern platform model for hosted foundation models.',
    source: 'OpenAI', sourceUrl: 'https://openai.com/index/openai-api/', notable: true,
  },
  {
    id: 'alphafold-2', date: '2020-11-30', title: 'AlphaFold 2 at CASP14', organization: 'Google DeepMind', category: 'Scientific insight',
    summary: 'AlphaFold demonstrated a major leap in protein-structure prediction, a signal that learned systems could produce useful scientific infrastructure.',
    source: 'Google DeepMind', sourceUrl: 'https://deepmind.google/blog/alphafold-a-solution-to-a-50-year-old-grand-challenge-in-biology/', notable: true,
  },
  {
    id: 'stable-diffusion', date: '2022-08-22', title: 'Stable Diffusion public release', organization: 'Stability AI, CompVis and LAION', category: 'Open weight',
    summary: 'Text-to-image weights enabled local and community deployment at a scale that helped define the open generative-image ecosystem.',
    source: 'Stability AI', sourceUrl: 'https://stability.ai/news/stable-diffusion-public-release', openWeight: true, notable: true,
  },
  {
    id: 'chatgpt', date: '2022-11-30', title: 'ChatGPT research preview', organization: 'OpenAI', category: 'Model release',
    summary: 'A conversational interface put instruction-following language models directly in front of a mass audience.',
    source: 'OpenAI', sourceUrl: 'https://openai.com/index/chatgpt/', notable: true,
  },
  {
    id: 'gpt-4', date: '2023-03-14', title: 'GPT-4 released', organization: 'OpenAI', category: 'Model release',
    summary: 'OpenAI introduced a large-scale multimodal model with stronger reasoning and instruction-following capabilities.',
    source: 'OpenAI', sourceUrl: 'https://openai.com/index/gpt-4-research/', notable: true,
  },
  {
    id: 'llama', date: '2023-02-24', title: 'LLaMA research model', organization: 'Meta AI', category: 'Open weight',
    summary: 'Meta released foundation-model research weights to qualified researchers, catalyzing a new generation of openly available language-model work.',
    source: 'Meta AI', sourceUrl: 'https://ai.meta.com/blog/large-language-model-llama-meta-ai/', openWeight: true, notable: true,
  },
  {
    id: 'h100', date: '2022-03-22', title: 'NVIDIA H100 Hopper announced', organization: 'NVIDIA', category: 'Compute',
    summary: 'Hopper introduced the H100 and a Transformer Engine, creating a new compute platform for large-scale model training and inference.',
    source: 'NVIDIA', sourceUrl: 'https://blogs.nvidia.com/blog/ai-factories-hopper-h100-nvidia-ceo-jensen-huang/', notable: true,
  },
  {
    id: 'gemini-1', date: '2023-12-06', title: 'Gemini 1.0 introduced', organization: 'Google', category: 'Model release',
    summary: 'Google introduced a multimodal model family spanning Ultra, Pro and Nano, with product and developer availability rolling out afterward.',
    source: 'Google', sourceUrl: 'https://blog.google/technology/ai/google-gemini-ai/', notable: true,
  },
  {
    id: 'mistral-7b', date: '2023-09-27', title: 'Mistral 7B released', organization: 'Mistral AI', category: 'Open weight',
    summary: 'A permissively licensed 7B model from a new European lab became a widely used compact open-weight baseline.',
    source: 'Mistral AI', sourceUrl: 'https://mistral.ai/news/announcing-mistral-7b/', openWeight: true, notable: true,
  },
  {
    id: 'alphageometry', date: '2024-01-17', title: 'AlphaGeometry announced', organization: 'Google DeepMind', category: 'Scientific insight',
    summary: 'A neuro-symbolic system combined language-model pattern proposals with a symbolic engine to solve Olympiad-level geometry problems.',
    source: 'Google DeepMind', sourceUrl: 'https://deepmind.google/blog/alphageometry-an-olympiad-level-ai-system-for-geometry/', notable: true,
  },
  {
    id: 'claude-3', date: '2024-03-04', title: 'Claude 3 model family', organization: 'Anthropic', category: 'Model release',
    summary: 'Anthropic released Opus, Sonnet and Haiku, a multi-tier frontier model family with vision capability.',
    source: 'Anthropic', sourceUrl: 'https://www.anthropic.com/news/claude-3-family', notable: true,
  },
  {
    id: 'blackwell', date: '2024-03-18', title: 'NVIDIA Blackwell platform', organization: 'NVIDIA', category: 'Compute',
    summary: 'NVIDIA announced the Blackwell architecture and GB200 systems to increase training and inference scale for trillion-parameter-era workloads.',
    source: 'NVIDIA', sourceUrl: 'https://www.nvidia.com/en-us/data-center/blackwell-platform/', notable: true,
  },
  {
    id: 'llama-3', date: '2024-04-18', title: 'Llama 3 released', organization: 'Meta AI', category: 'Open weight',
    summary: 'Meta published 8B and 70B model weights under its community license, expanding the practical capability of openly distributed language models.',
    source: 'Meta AI', sourceUrl: 'https://ai.meta.com/blog/meta-llama-3/', openWeight: true, notable: true,
  },
  {
    id: 'alphafold-3', date: '2024-05-08', title: 'AlphaFold 3 announced', organization: 'Google DeepMind and Isomorphic Labs', category: 'Scientific insight',
    summary: 'AlphaFold 3 extended molecular-structure prediction to interactions involving proteins, DNA, RNA and small molecules.',
    source: 'Google DeepMind', sourceUrl: 'https://deepmind.google/discover/blog/alphafold-3-predicting-the-structure-and-interactions-of-all-lifes-molecules/', notable: true,
  },
  {
    id: 'gpt-4o', date: '2024-05-13', title: 'GPT-4o introduced', organization: 'OpenAI', category: 'Model release',
    summary: 'OpenAI introduced a natively multimodal flagship model designed for text, vision and audio interaction.',
    source: 'OpenAI', sourceUrl: 'https://openai.com/index/hello-gpt-4o/', notable: true,
  },
  {
    id: 'gemini-1-5', date: '2024-02-15', title: 'Gemini 1.5 and one-million-token context', organization: 'Google', category: 'Model release',
    summary: 'Google previewed Gemini 1.5 Pro with a mixture-of-experts architecture and long-context capability.',
    source: 'Google', sourceUrl: 'https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/', notable: true,
  },
  {
    id: 'deepseek-r1', date: '2025-01-20', title: 'DeepSeek-R1 released', organization: 'DeepSeek', category: 'Open weight',
    summary: 'DeepSeek released reasoning-model weights and technical details, intensifying attention on reinforcement learning, inference-time reasoning and Chinese open-weight labs.',
    source: 'DeepSeek', sourceUrl: 'https://github.com/deepseek-ai/DeepSeek-R1', openWeight: true, notable: true,
  },
  {
    id: 'grok-3', date: '2025-02-17', title: 'Grok 3 introduced', organization: 'xAI', category: 'Model release',
    summary: 'xAI introduced its Grok 3 model family and reasoning-oriented variants for its product and API ecosystem.',
    source: 'xAI', sourceUrl: 'https://x.ai/news/grok-3', notable: true,
  },
  {
    id: 'claude-3-7', date: '2025-02-24', title: 'Claude 3.7 Sonnet', organization: 'Anthropic', category: 'Model release',
    summary: 'Anthropic released a hybrid-reasoning model that let users choose between a faster response and extended thinking.',
    source: 'Anthropic', sourceUrl: 'https://www.anthropic.com/news/claude-3-7-sonnet', notable: true,
  },
  {
    id: 'gemini-2-5', date: '2025-03-25', title: 'Gemini 2.5 Pro preview', organization: 'Google', category: 'Model release',
    summary: 'Google introduced a reasoning model positioned for advanced coding, science and multimodal tasks.',
    source: 'Google', sourceUrl: 'https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/', notable: true,
  },
  {
    id: 'qwen-3', date: '2025-04-29', title: 'Qwen3 open-weight family', organization: 'Alibaba / Qwen', category: 'Open weight',
    summary: 'Alibaba released a broad Qwen3 family including dense and mixture-of-experts models with permissive availability for research and development.',
    source: 'Qwen', sourceUrl: 'https://qwenlm.github.io/blog/qwen3/', openWeight: true, notable: true,
  },
  {
    id: 'thinking-machines-lab', date: '2025-02-18', title: 'Thinking Machines Lab launches', organization: 'Thinking Machines Lab', category: 'Research breakthrough',
    summary: 'Former OpenAI researchers announced a new lab focused on making AI systems more understandable, customizable and broadly capable.',
    source: 'Thinking Machines Lab', sourceUrl: 'https://thinkingmachines.ai/', notable: false,
  },
];

const westernModelWatchProviders = new Set([
  'OpenAI',
  'Anthropic',
  'Google DeepMind',
  'Mistral AI',
  'xAI',
]);

const westernModelWatch2026Events: TimelineEvent[] = modelWatchModels
  .filter((model) => (
    model.releaseDateSort?.startsWith('2026-')
    && westernModelWatchProviders.has(model.provider)
    && model.id !== 'grok-4-5'
  ))
  .map((model) => ({
    id: `model-watch-${model.id}`,
    date: model.releaseDateSort!,
    title: model.name,
    organization: model.provider,
    category: model.lane.toLowerCase().includes('open-weight') ? 'Open weight' : 'Model release',
    summary: `${model.name} entered LongmontAI's 2026 Model Watch as a ${model.lane.toLowerCase()} release.`,
    source: model.sourceLabel,
    sourceUrl: model.sourceUrl,
    openWeight: model.lane.toLowerCase().includes('open-weight'),
    notable: true,
  }));

const additional2026ReleaseEvents: TimelineEvent[] = [
  {
    id: 'cursor-composer-2', date: '2026-03-19', title: 'Composer 2', organization: 'Cursor', category: 'Model release',
    summary: 'Cursor released Composer 2, an in-product coding model aimed at long-horizon software-engineering tasks, with standard and fast variants.',
    source: 'Cursor changelog', sourceUrl: 'https://cursor.com/changelog/composer-2', notable: true,
  },
  {
    id: 'cursor-composer-2-5', date: '2026-05-18', title: 'Composer 2.5', organization: 'Cursor', category: 'Model release',
    summary: 'Cursor updated its coding model with stronger long-horizon agent behavior and larger-scale reinforcement-learning training.',
    source: 'Cursor Composer announcements', sourceUrl: 'https://cursor.com/composer', notable: true,
  },
  {
    id: 'eleven-v3-ga', date: '2026-02-02', title: 'Eleven v3 generally available', organization: 'ElevenLabs', category: 'Model release',
    summary: 'ElevenLabs made its advanced text-to-speech model generally available, with improvements to stability and pronunciation of numbers and notation.',
    source: 'ElevenLabs', sourceUrl: 'https://elevenlabs.io/blog/eleven-v3-is-now-generally-available', notable: true,
  },
  {
    id: 'eleven-music-v2', date: '2026-05-26', title: 'Music v2', organization: 'ElevenLabs', category: 'Model release',
    summary: 'ElevenLabs released an updated music-generation model with stronger vocal, instrumental and multilingual control.',
    source: 'ElevenLabs', sourceUrl: 'https://elevenlabs.io/blog/introducing-music-v2', notable: true,
  },
  {
    id: 'grok-4-5', date: '2026-07-16', title: 'Grok 4.5', organization: 'xAI', category: 'Model release',
    summary: 'xAI released Grok 4.5 for coding, agentic tasks and knowledge work, with availability in Grok Build, Cursor and the API.',
    source: 'xAI', sourceUrl: 'https://x.ai/news/grok-4-5', notable: true,
  },
];

function chineseReleaseToTimelineEvent(release: ChineseModelRelease): TimelineEvent {
  return {
    id: `chinese-${release.date}-${release.provider}-${release.release}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    date: release.date,
    title: release.release,
    organization: release.provider,
    category: 'Open weight',
    summary: 'Tracked in LongmontAI\'s Chinese model release dataset. This release-series entry preserves the current editorial timeline data for continued weekly expansion.',
    source: release.source,
    openWeight: true,
    notable: true,
  };
}

export const timelineEvents = [
  ...historicTimelineEvents,
  ...westernModelWatch2026Events,
  ...additional2026ReleaseEvents,
  ...chineseModelReleases.map(chineseReleaseToTimelineEvent),
]
  .sort((left, right) => left.date.localeCompare(right.date));

export const timelineOrganizations = Array.from(new Set(timelineEvents.map((event) => event.organization))).sort();
