import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── DATA ────────────────────────────────────────────────────────────────────

type InputType = string;
type OutputType = string;

interface Tool { name: string; url?: string; openWeight?: boolean; }
type Matrix = Record<string, Record<string, Tool[]>>;

const INPUTS: InputType[] = [
  'Text', 'Image', 'Video', 'Audio', 'Music', '3D Models', '3D Printable', 'Laser Cutting',
  'Code', 'Mobile Apps', 'Websites', 'Edge Computing Devices'
];

const OUTPUTS: OutputType[] = [
  'Text', 'Image', 'Video', 'Audio', 'Music', '3D Models', '3D Printable', 'Laser Cutting',
  'Code', 'Mobile Apps', 'Websites', 'Edge Computing Devices'
];

// ─── MATRIX ─────────────────────────────────────────────────────────────────

const MATRIX: Matrix = {
  Text: {
    Text: [{ name: 'Grok 4.5', url: 'https://x.ai/grok' }, { name: 'Claude Fable 5', url: 'https://anthropic.com/claude' }, { name: 'GPT-5.6 Sol', url: 'https://openai.com/gpt-5-6' }, { name: 'Gemini 3.1 Pro', url: 'https://deepmind.google/gemini' }],
    'Image': [{ name: 'Grok Imagine', url: 'https://x.ai/grok-imagine' }, { name: 'Midjourney v7', url: 'https://midjourney.com' }, { name: 'Nano Banana Pro (Gemini 3 Pro Image)', url: 'https://deepmind.google/gemini' }, { name: 'GPT Image 1', url: 'https://openai.com/index/gpt-image-1/' }, { name: 'Ideogram', url: 'https://ideogram.ai' }, { name: 'Leonardo.ai', url: 'https://leonardo.ai' }, { name: 'Adobe Firefly', url: 'https://adobe.com/firefly' }],
    Video: [{ name: 'Runway Gen-5', url: 'https://runwayml.com' }, { name: 'Google Veo 3.1', url: 'https://deepmind.google/veo' }, { name: 'Kling AI', url: 'https://klingai.com' }, { name: 'Luma Dream Machine', url: 'https://lumalabs.ai/dream-machine' }, { name: 'Sora 2', url: 'https://openai.com/sora' }],
    Audio: [{ name: 'ElevenLabs (text-to-speech)', url: 'https://elevenlabs.io' }, { name: 'OpenAI Audio', url: 'https://openai.com/index/introducing-our-next-generation-audio-models/' }, { name: 'Gemini Audio', url: 'https://deepmind.google/gemini' }],
    Music: [{ name: 'Suno', url: 'https://suno.com' }, { name: 'Udio', url: 'https://www.udio.com' }, { name: 'MiniMax Music 2.5', url: 'https://www.minimax.io/news/minimax-music-25' }, { name: 'Gemini Lyria 3', url: 'https://gemini.google/gp/overview/music-generation/' }, { name: 'Alibaba Fun-Music', url: 'https://www.alibabacloud.com/help/en/model-studio/fun-music/' }],
    '3D Models': [{ name: 'Meshy.ai', url: 'https://meshy.ai' }, { name: 'Tripo3D', url: 'https://tripo3d.ai' }, { name: '3D AI Studio', url: 'https://3daistudio.ai' }, { name: 'Luma Genie', url: 'https://lumalabs.ai/genie' }, { name: 'Sloyd.ai', url: 'https://sloyd.ai' }],
    '3D Printable': [{ name: 'Meshy.ai (print export)', url: 'https://meshy.ai' }, { name: 'Tripo3D (print export)', url: 'https://tripo3d.ai' }],
    'Laser Cutting': [{ name: 'Recraft.ai', url: 'https://recraft.ai' }, { name: 'SVGMaker', url: 'https://svgmaker.ai' }, { name: 'Vector Witch', url: 'https://vectorwitch.com' }, { name: 'Cuttle.xyz', url: 'https://cuttle.xyz' }],
    Code: [{ name: 'Cursor', url: 'https://cursor.com' }, { name: 'GitHub Copilot', url: 'https://github.com/features/copilot' }, { name: 'Claude Code', url: 'https://anthropic.com/claude-code' }, { name: 'Aider', url: 'https://aider.chat' }, { name: 'Grok 4.5', url: 'https://x.ai/grok' }],
    'Mobile Apps': [{ name: 'FlutterFlow AI', url: 'https://flutterflow.io' }, { name: 'Lovable.dev', url: 'https://lovable.dev' }, { name: 'Replit Agent', url: 'https://replit.com/agent' }, { name: 'Bolt.new', url: 'https://bolt.new' }, { name: 'Bubble + AI', url: 'https://bubble.io' }],
    Websites: [{ name: 'Framer AI', url: 'https://framer.com/ai' }, { name: 'Bolt.new', url: 'https://bolt.new' }, { name: 'Lovable.dev', url: 'https://lovable.dev' }, { name: 'Hostinger AI Builder', url: 'https://hostinger.com/ai-builder' }, { name: 'v0.dev', url: 'https://v0.dev' }],
    'Edge Computing Devices': [{ name: 'Grok 4.5 / Claude Fable 5 → Python/GPIO scripts', url: 'https://x.ai/grok' }, { name: 'Edge Impulse', url: 'https://edgeimpulse.com' }, { name: 'Balena.io', url: 'https://balena.io' }],
  },
  Image: {
    Text: [{ name: 'GPT-5.6 Sol vision', url: 'https://openai.com/gpt-5-6' }, { name: 'Claude Fable 5', url: 'https://anthropic.com/claude' }, { name: 'Grok 4.5 vision', url: 'https://x.ai/grok' }, { name: 'Gemini 3.1 Pro', url: 'https://deepmind.google/gemini' }],
    'Image': [{ name: 'Stable Diffusion (ComfyUI)', url: 'https://comfy.org', openWeight: true }, { name: 'Midjourney Remix', url: 'https://midjourney.com' }, { name: 'Firefly inpainting', url: 'https://adobe.com/firefly' }, { name: 'Grok Imagine (img2img)', url: 'https://x.ai/grok-imagine' }],
    Video: [{ name: 'Runway Gen-5 (img→vid)', url: 'https://runwayml.com' }, { name: 'Kling', url: 'https://klingai.com' }, { name: 'Luma Dream Machine', url: 'https://lumalabs.ai/dream-machine' }, { name: 'Leonardo.ai', url: 'https://leonardo.ai' }],
    '3D Models': [{ name: 'Meshy.ai', url: 'https://meshy.ai' }, { name: 'Tripo3D', url: 'https://tripo3d.ai' }, { name: '3D AI Studio', url: 'https://3daistudio.ai' }, { name: 'Rodin AI', url: 'https://hyper3d.ai' }, { name: 'Hunyuan3D-Swift', url: 'https://github.com/ZimengXiong/Hunyuan3D-Swift', openWeight: true }],
    '3D Printable': [{ name: 'Meshy.ai (print export)', url: 'https://meshy.ai' }, { name: 'Tripo3D (print export)', url: 'https://tripo3d.ai' }, { name: '3D AI Studio (print export)', url: 'https://3daistudio.ai' }],
    'Laser Cutting': [{ name: 'Recraft.ai', url: 'https://recraft.ai' }, { name: 'Vector Witch', url: 'https://vectorwitch.com' }, { name: 'Vectorizer AI', url: 'https://vectorizer.ai' }, { name: 'SVGMaker', url: 'https://svgmaker.ai' }],
    Code: [{ name: 'GPT-5.6 Sol / Claude Fable 5 vision → code', url: 'https://openai.com/gpt-5-6' }, { name: 'UI → React Native', url: 'https://reactnative.dev' }],
    'Mobile Apps': [{ name: 'FlutterFlow AI (img→app)', url: 'https://flutterflow.io' }, { name: 'v0.dev + Expo', url: 'https://v0.dev' }],
    Websites: [{ name: 'Framer AI', url: 'https://framer.com/ai' }, { name: 'v0.dev', url: 'https://v0.dev' }, { name: 'Dora AI (img→site)', url: 'https://dora.ai' }],
    'Edge Computing Devices': [{ name: 'Edge Impulse (image datasets → TinyML)', url: 'https://edgeimpulse.com' }, { name: 'Grok 4.5 → Pi camera scripts', url: 'https://x.ai/grok' }],
  },
  Video: {
    Text: [{ name: 'GPT-5.6 Sol video', url: 'https://openai.com/gpt-5-6' }, { name: 'Claude Fable 5', url: 'https://anthropic.com/claude' }, { name: 'Grok 4.5 vision', url: 'https://x.ai/grok' }, { name: 'Whisper + LLM summary', url: 'https://openai.com/whisper' }],
    'Image': [{ name: 'Runway (video→image)', url: 'https://runwayml.com' }, { name: 'Luma', url: 'https://lumalabs.ai' }, { name: 'Kling frame extractor', url: 'https://klingai.com' }],
    Video: [{ name: 'Runway Gen-5 (video-to-video)', url: 'https://runwayml.com' }, { name: 'Kling', url: 'https://klingai.com' }, { name: 'Descript Overdub', url: 'https://descript.com' }],
    '3D Models': [{ name: 'Luma (video→3D)', url: 'https://lumalabs.ai' }, { name: 'Meshy video upload', url: 'https://meshy.ai' }, { name: 'Polycam AI', url: 'https://poly.cam' }],
    'Laser Cutting': [{ name: 'Recraft.ai video→vector', url: 'https://recraft.ai' }],
    Code: [{ name: 'GPT-5.6 Sol / Claude Fable 5 (video analysis → code)', url: 'https://openai.com/gpt-5-6' }],
    'Mobile Apps': [{ name: 'FlutterFlow / Lovable (video demo → app)', url: 'https://flutterflow.io' }, { name: 'Cursor (video demo → project)', url: 'https://cursor.com' }],
    Websites: [{ name: 'Framer AI / Lovable (video landing page)', url: 'https://framer.com/ai' }],
    'Edge Computing Devices': [{ name: 'Edge Impulse (video datasets → edge ML)', url: 'https://edgeimpulse.com' }, { name: 'Balena', url: 'https://balena.io' }],
  },
  Music: {
    Video: [{ name: 'Neural Frames (music-to-video)', url: 'https://www.neuralframes.com/' }],
  },
  '3D Models': {
    Text: [{ name: 'GPT-5.6 Sol / Claude Fable 5 (describe model)', url: 'https://openai.com/gpt-5-6' }],
    'Image': [{ name: 'Meshy.ai / Tripo3D renderers', url: 'https://meshy.ai' }, { name: 'Luma / Meshy (3D animation export)', url: 'https://lumalabs.ai' }],
    Video: [{ name: 'Luma / Meshy (3D animation export)', url: 'https://lumalabs.ai' }],
    '3D Models': [{ name: 'Meshy.ai editor', url: 'https://meshy.ai' }, { name: 'Blender + AI plugins', url: 'https://blender.org' }, { name: 'Tripo3D', url: 'https://tripo3d.ai' }],
    '3D Printable': [{ name: 'Blender (mesh cleanup / STL export)', url: 'https://blender.org' }, { name: 'Meshy.ai (print export)', url: 'https://meshy.ai' }, { name: 'Tripo3D (print export)', url: 'https://tripo3d.ai' }],
    'Laser Cutting': [{ name: 'Meshy / Blender → SVG slices', url: 'https://blender.org' }, { name: 'Cuttle.xyz (import)', url: 'https://cuttle.xyz' }],
    Code: [{ name: 'Blender Python API + LLM', url: 'https://blender.org' }],
    'Mobile Apps': [{ name: 'FlutterFlow / Unity (3D model viewer apps)', url: 'https://unity.com' }],
    Websites: [{ name: 'Spline.ai (3D web export)', url: 'https://spline.ai' }, { name: 'Framer 3D', url: 'https://framer.com' }],
    'Edge Computing Devices': [{ name: 'Balena + OctoPrint / Klipper (RPi 3D printer host)', url: 'https://balena.io' }],
  },
  '3D Printable': {
    Text: [{ name: 'GPT-5.6 Sol / Claude Fable 5 (describe printable model)', url: 'https://openai.com/gpt-5-6' }],
    'Image': [{ name: 'Meshy.ai / Tripo3D renderers', url: 'https://meshy.ai' }, { name: 'Luma / Meshy (3D animation export)', url: 'https://lumalabs.ai' }],
    Video: [{ name: 'Luma / Meshy (3D animation export)', url: 'https://lumalabs.ai' }],
    '3D Models': [{ name: 'Blender (STL / 3MF import)', url: 'https://blender.org' }, { name: 'Meshy.ai editor', url: 'https://meshy.ai' }],
    '3D Printable': [{ name: 'Blender (print preparation)', url: 'https://blender.org' }, { name: 'Meshy.ai editor', url: 'https://meshy.ai' }, { name: 'Tripo3D', url: 'https://tripo3d.ai' }],
    'Laser Cutting': [{ name: 'Meshy / Blender to SVG slices', url: 'https://blender.org' }, { name: 'Cuttle.xyz (import)', url: 'https://cuttle.xyz' }],
    Code: [{ name: 'Blender Python API + LLM', url: 'https://blender.org' }],
    'Mobile Apps': [{ name: 'FlutterFlow / Unity (3D model viewer apps)', url: 'https://unity.com' }],
    Websites: [{ name: 'Spline.ai (3D web export)', url: 'https://spline.ai' }, { name: 'Framer 3D', url: 'https://framer.com' }],
    'Edge Computing Devices': [{ name: 'Balena + OctoPrint / Klipper (RPi 3D printer host)', url: 'https://balena.io' }],
  },
  'Laser Cutting': {
    Text: [{ name: 'GPT-5.6 Sol / Claude Fable 5 (describe vector)', url: 'https://openai.com/gpt-5-6' }],
    'Image': [{ name: 'Recraft.ai / Vector Witch (SVG→raster)', url: 'https://recraft.ai' }, { name: 'Runway / Kling (SVG animation)', url: 'https://runwayml.com' }, { name: 'Meshy / Blender (vector → 3D extrusion)', url: 'https://blender.org' }],
    Video: [{ name: 'Runway / Kling (SVG animation)', url: 'https://runwayml.com' }],
    '3D Models': [{ name: 'Meshy / Blender (vector → 3D extrusion)', url: 'https://blender.org' }],
    '3D Printable': [{ name: 'Blender (vector to printable extrusion)', url: 'https://blender.org' }],
    'Laser Cutting': [{ name: 'LightBurn', url: 'https://lightburnsoftware.com' }, { name: 'LaserGRBL', url: 'https://lasergrbl.com' }, { name: 'Cuttle.xyz (native)', url: 'https://cuttle.xyz' }],
    Code: [{ name: 'LLM → G-code / SVG generators', url: 'https://github.com' }],
    'Mobile Apps': [{ name: 'Mobile app builders that import SVG', url: 'https://bubbles.io' }],
    Websites: [{ name: 'Framer / Webflow (SVG import)', url: 'https://framer.com' }],
    'Edge Computing Devices': [{ name: 'Balena + LaserGRBL on RPi', url: 'https://balena.io' }, { name: 'Edge Impulse', url: 'https://edgeimpulse.com' }],
  },
  Code: {
    Text: [{ name: 'Grok 4.5 / Claude Fable 5 / GPT-5.6 Sol (code → docs)', url: 'https://x.ai/grok' }],
    'Image': [{ name: 'v0.dev, Lovable (code → UI images)', url: 'https://v0.dev' }, { name: 'Midjourney (prompt from code)', url: 'https://midjourney.com' }],
    Video: [{ name: 'Runway / Luma (code-generated video)', url: 'https://runwayml.com' }],
    '3D Models': [{ name: 'Meshy / Sloyd (code → 3D via Three.js/Blender scripts)', url: 'https://sloyd.ai' }],
    '3D Printable': [{ name: 'Blender Python (printable mesh generation)', url: 'https://blender.org' }],
    'Laser Cutting': [{ name: 'Recraft / SVGMaker (code → SVG)', url: 'https://recraft.ai' }],
    Code: [{ name: 'Cursor', url: 'https://cursor.com' }, { name: 'Copilot', url: 'https://github.com/features/copilot' }, { name: 'Aider (refactoring)', url: 'https://aider.chat' }],
    'Mobile Apps': [{ name: 'FlutterFlow / Expo + LLM code', url: 'https://flutterflow.io' }, { name: 'Replit Agent', url: 'https://replit.com/agent' }],
    Websites: [{ name: 'v0.dev, Lovable.dev, Bolt.new', url: 'https://v0.dev' }],
    'Edge Computing Devices': [{ name: 'Balena CLI + LLM', url: 'https://balena.io' }, { name: 'Edge Impulse (code export to RPi)', url: 'https://edgeimpulse.com' }],
  },
  'Mobile Apps': {
    Text: [{ name: 'GPT-5.6 Sol / Claude Fable 5 (app → spec/docs)', url: 'https://openai.com/gpt-5-6' }],
    'Image': [{ name: 'App screenshots → Midjourney / Grok Imagine', url: 'https://midjourney.com' }],
    Video: [{ name: 'App demo video → Runway / Luma', url: 'https://runwayml.com' }],
    '3D Models': [{ name: '3D model viewer apps (Meshy export)', url: 'https://meshy.ai' }],
    '3D Printable': [{ name: '3D model viewer apps (printable-model import)', url: 'https://unity.com' }],
    'Laser Cutting': [{ name: 'SVG export from app UI', url: 'https://figma.com' }],
    Code: [{ name: 'Cursor / Claude (app → backend code)', url: 'https://cursor.com' }],
    'Mobile Apps': [{ name: 'FlutterFlow', url: 'https://flutterflow.io' }, { name: 'Adalo', url: 'https://adalo.com' }, { name: 'Bubble', url: 'https://bubble.io' }, { name: 'Lovable', url: 'https://lovable.dev' }],
    Websites: [{ name: 'Capacitor / Ionic (mobile → web)', url: 'https://capacitorjs.com' }],
    'Edge Computing Devices': [{ name: 'Balena (mobile → edge deployment scripts)', url: 'https://balena.io' }],
  },
  Websites: {
    Text: [{ name: 'GPT-5.6 Sol / Claude Fable 5 (site → content)', url: 'https://openai.com/gpt-5-6' }],
    'Image': [{ name: 'Screenshot → Grok Imagine / Midjourney', url: 'https://midjourney.com' }],
    Video: [{ name: 'Runway / Luma (site demo video)', url: 'https://runwayml.com' }],
    '3D Models': [{ name: 'Spline / Meshy (3D web export)', url: 'https://spline.ai' }],
    '3D Printable': [{ name: 'Meshy (printable-model export)', url: 'https://meshy.ai' }],
    'Laser Cutting': [{ name: 'SVG export from Figma/Framer', url: 'https://figma.com' }],
    Code: [{ name: 'Cursor / Claude (site → full-stack code)', url: 'https://cursor.com' }],
    'Mobile Apps': [{ name: 'Capacitor / Ionic (PWA → mobile)', url: 'https://capacitorjs.com' }],
    Websites: [{ name: 'Framer AI', url: 'https://framer.com/ai' }, { name: 'Lovable.dev', url: 'https://lovable.dev' }, { name: 'Bolt.new', url: 'https://bolt.new' }, { name: 'Webflow AI', url: 'https://webflow.com' }],
    'Edge Computing Devices': [{ name: 'Balena (web → RPi-hosted dashboard)', url: 'https://balena.io' }],
  },
  'Edge Computing Devices': {
    Text: [{ name: 'Grok 4.5 / Claude Fable 5 (RPi project brief)', url: 'https://x.ai/grok' }],
    'Image': [{ name: 'Edge Impulse (camera images)', url: 'https://edgeimpulse.com' }],
    Video: [{ name: 'Edge Impulse video datasets', url: 'https://edgeimpulse.com' }],
    '3D Printable': [{ name: 'OctoPrint / Klipper (3D printer control)', url: 'https://octoprint.org' }],
    'Laser Cutting': [{ name: 'LaserGRBL on RPi', url: 'https://lasergrbl.com' }],
    Code: [{ name: 'Cursor / Grok 4.5 → Python/Rust for GPIO', url: 'https://cursor.com' }],
    'Mobile Apps': [{ name: 'Flutter / React Native → RPi kiosk mode', url: 'https://reactnative.dev' }],
    Websites: [{ name: 'Balena-hosted web dashboard', url: 'https://balena.io' }],
    'Edge Computing Devices': [{ name: 'Balena.io', url: 'https://balena.io' }, { name: 'Edge Impulse', url: 'https://edgeimpulse.com' }, { name: 'OctoPrint', url: 'https://octoprint.org' }, { name: 'Home Assistant on RPi', url: 'https://home-assistant.io' }],
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const cellIntensity = (count: number): string => {
  if (count === 0) return 'bg-transparent';
  if (count <= 2) return 'bg-emerald-500/10 hover:bg-emerald-500/20';
  if (count <= 4) return 'bg-cyan-500/15 hover:bg-cyan-500/25';
  return 'bg-purple-500/20 hover:bg-purple-500/35';
};

const cellDot = (count: number): string => {
  if (count === 0) return 'text-zinc-800';
  if (count <= 2) return 'text-emerald-400';
  if (count <= 4) return 'text-cyan-400';
  return 'text-purple-400';
};

const isAudioSubset = (axis: string): boolean => axis === 'Music';

// ─── CELL ────────────────────────────────────────────────────────────────────

const Cell: React.FC<{
  input: InputType;
  output: OutputType;
  count: number;
  onHover: (input: InputType | null, output: string | null) => void;
  isHighlighted: boolean;
  onClick: () => void;
}> = ({ input, output, count, onHover, isHighlighted, onClick }) => (
  <div
    className={`
      relative p-1 cursor-pointer transition-all duration-150
      ${count > 0 ? cellIntensity(count) : 'bg-transparent hover:bg-white/[0.02]'}
      ${isHighlighted ? 'ring-1 ring-cyan-400/50 z-10' : ''}
    `}
    onMouseEnter={() => count > 0 && onHover(input, output)}
    onMouseLeave={() => onHover(null, null)}
    onClick={onClick}
    title={count > 0 ? `${count} tool${count !== 1 ? 's' : ''}` : '—'}
  >
    {count > 0 ? (
      <div className="flex items-center justify-center gap-1">
        <span className={`text-xs font-mono font-semibold ${cellDot(count)}`}>{count}</span>
      </div>
    ) : (
      <div className="flex items-center justify-center text-zinc-700">—</div>
    )}
  </div>
);

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────

const Tooltip: React.FC<{
  input: InputType;
  output: OutputType;
  tools: Tool[];
  onClose: () => void;
}> = ({ input, output, tools, onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: -4 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72"
  >
    <div className="bg-[#0d0d1a] border border-cyan-400/30 rounded-2xl p-5 shadow-2xl shadow-cyan-900/20">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
          {input} → {output}
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {tools.map((t, i) => (
          <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-0">
            <span className="text-sm text-white font-medium">{t.name}</span>
            {t.url && (
              <a href={t.url} target="_blank" rel="noopener noreferrer"
                className="text-zinc-500 hover:text-cyan-400 transition-colors flex-shrink-0"
                onClick={(e) => e.stopPropagation()}>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-white/5 text-xs text-zinc-600 text-right">
        {tools.length} tool{tools.length !== 1 ? 's' : ''} · hover for more
      </div>
    </div>
    <div className="w-3 h-3 bg-[#0d0d1a] border-l border-b border-cyan-400/30 rotate-45 mx-auto -mt-1.5" />
  </motion.div>
);

// ─── DETAIL PANEL ────────────────────────────────────────────────────────────

const DetailPanel: React.FC<{
  input: InputType;
  output: OutputType;
  tools: Tool[];
  onClose: () => void;
}> = ({ input, output, tools, onClose }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="w-80 flex-shrink-0 bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden"
  >
    <div className="p-5 border-b border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">Input → Output</div>
          <div className="text-white font-bold text-lg">{input} → {output}</div>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
          <X size={16} />
        </button>
      </div>
    </div>
    <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
      {tools.map((t, i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
          <div>
            <div className="text-sm text-white font-medium">{t.name}</div>
          </div>
          {t.url ? (
            <a href={t.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-white transition-colors">
              <ExternalLink size={12} /> Open
            </a>
          ) : (
            <span className="text-xs text-zinc-600">—</span>
          )}
        </div>
      ))}
    </div>
    <div className="px-5 py-3 border-t border-white/5 text-xs text-zinc-600 text-center">
      {tools.length} tool{tools.length !== 1 ? 's' : ''}
    </div>
  </motion.div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const ToolsPage: React.FC = () => {
  const [hovered, setHovered] = useState<{ input: InputType; output: OutputType } | null>(null);
  const [selected, setSelected] = useState<{ input: InputType; output: OutputType } | null>(null);
  const [openWeightOnly, setOpenWeightOnly] = useState(false);
  const getVisibleTools = (input: InputType, output: OutputType) =>
    (MATRIX[input]?.[output] ?? []).filter(tool => !openWeightOnly || tool.openWeight);
  const hoveredTools = hovered ? getVisibleTools(hovered.input, hovered.output) : [];
  const selectedTools = selected ? getVisibleTools(selected.input, selected.output) : [];
  const filledCells = INPUTS.reduce((sum, inp) =>
    sum + OUTPUTS.filter(out => getVisibleTools(inp, out).length > 0).length, 0
  );
  const totalTools = INPUTS.reduce((sum, input) =>
    sum + OUTPUTS.reduce((rowSum, output) => rowSum + getVisibleTools(input, output).length, 0), 0
  );

  return (
    <div className="max-w-7xl mx-auto">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
            Longmont AI · Feb 2026
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-cyan-400/40 to-transparent" />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
          AI Capabilities{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Matrix
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Every AI tool for every input × output combination. Hover any cell to explore. Click to pin details.
          Built from the Longmont AI February 2026 meetup research.
        </p>
        <div className="flex flex-wrap items-center gap-8 mt-6">
          <div>
            <div className="text-3xl font-bold text-white">{totalTools}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Visible Tools</div>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <div className="text-3xl font-bold text-cyan-400">{filledCells}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Connections</div>
          </div>
          <label className="ml-auto inline-flex items-center gap-3 cursor-pointer select-none">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Open-weight models</span>
            <input
              type="checkbox"
              checked={openWeightOnly}
              onChange={(event) => setOpenWeightOnly(event.target.checked)}
              className="peer sr-only"
            />
            <span className="relative h-5 w-9 rounded-full bg-zinc-700 transition-colors peer-checked:bg-cyan-500">
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
            </span>
          </label>
        </div>
      </div>

      {/* ── Mixture of Agents ──────────────────────────────────────────── */}
      <section className="mb-12" aria-labelledby="moa-heading">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-mono uppercase tracking-widest text-fuchsia-300">
            New pattern · MoA
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-fuchsia-300/40 to-transparent" />
        </div>
        <div className="glass-panel p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="max-w-3xl">
              <h2 id="moa-heading" className="text-3xl md:text-4xl font-bold mb-3">
                Mixture of Agents
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                Ask several AI models the same question, let them compare perspectives,
                and use their agreements, disagreements, and unique points to build a
                more trustworthy answer. theMultiplicity.ai is a practical example of
                this collective-intelligence pattern, with shared conversations and
                structured <code className="text-fuchsia-200">/rank</code> and{' '}
                <code className="text-fuchsia-200">/estimate</code> workflows.
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
                <span className="px-3 py-1.5 rounded-full bg-fuchsia-400/10 border border-fuchsia-300/20">Multiple models</span>
                <span className="px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-300/20">Cross-checking</span>
                <span className="px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-300/20">Consensus signals</span>
              </div>
            </div>
            <a
              href="https://themultiplicity.ai/about"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-fuchsia-200 hover:text-white transition-colors"
            >
              Explore theMultiplicity.ai
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Matrix + Detail ─────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* Matrix */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[640px]">

            {/* Column headers */}
            <div className="grid gap-0 mb-1" style={{ gridTemplateColumns: `180px repeat(${OUTPUTS.length}, 1fr)` }}>
              <div className="p-3 text-xs font-mono text-zinc-600 uppercase tracking-wider">From → To</div>
              {OUTPUTS.map((out) => (
                <div key={out} className="p-3 text-center">
                  <div className={`text-xs font-mono font-semibold leading-tight ${isAudioSubset(out) ? 'text-fuchsia-300/80' : 'text-cyan-400/80'}`}>
                    {isAudioSubset(out) && <span className="mr-1 text-zinc-600">Audio /</span>}
                    {out}
                  </div>
                </div>
              ))}
            </div>

            {/* Rows */}
            {INPUTS.map((input) => (
              <div key={input} className="grid gap-0 mb-0.5" style={{ gridTemplateColumns: `180px repeat(${OUTPUTS.length}, 1fr)` }}>
                {/* Row label */}
                <div className="p-3 flex items-center">
                  <span className={`text-xs font-mono leading-tight ${isAudioSubset(input) ? 'pl-4 text-fuchsia-200' : 'text-zinc-300'}`}>
                    {isAudioSubset(input) && <span className="mr-1 text-zinc-600">Audio /</span>}
                    {input}
                  </span>
                </div>
                {/* Cells */}
                {OUTPUTS.map((output) => {
                  const count = getVisibleTools(input, output).length;
                  const isHov = hovered?.input === input && hovered?.output === output;
                  return (
                    <div key={output} className="relative">
                      <Cell
                        input={input}
                        output={output}
                        count={count}
                        onHover={(inp, out) => inp ? setHovered({ input: inp as InputType, output: out as OutputType }) : setHovered(null)}
                        isHighlighted={isHov}
                        onClick={() => setSelected(
                          selected?.input === input && selected?.output === output ? null : { input, output }
                        )}
                      />
                      <AnimatePresence>
                        {isHov && hoveredTools.length > 0 && (
                          <Tooltip
                            input={input}
                            output={output}
                            tools={hoveredTools}
                            onClose={() => setHovered(null)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/5">
              <span className="text-xs text-zinc-600 font-mono uppercase tracking-wider">Density</span>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-500/20" />
                <span className="text-xs text-zinc-500">1–2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-cyan-500/15 border border-cyan-500/30" />
                <span className="text-xs text-zinc-500">3–4</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/40" />
                <span className="text-xs text-zinc-500">5+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selected && selectedTools.length > 0 && (
            <DetailPanel
              input={selected.input}
              output={selected.output}
              tools={selectedTools}
              onClose={() => setSelected(null)}
            />
          )}
        </AnimatePresence>

      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-white/5 text-center">
        <p className="text-sm text-zinc-600">
          Longmont AI Meetup · February 2026 ·{' '}
          <Link to="/" className="text-cyan-400 hover:underline">
            ← Back to editions
          </Link>
        </p>
      </div>

    </div>
  );
};

export default ToolsPage;
