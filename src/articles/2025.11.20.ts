import { Edition } from './types';

export const edition_2025_11_20: Edition = {
  id: 'edition-1',
  date: '2025-11-20',
  title: 'The Dawn of Agentic AI',
  summary: 'Exploring the shift from chat-based AI to autonomous agents capable of complex reasoning and task execution.',
  items: [
    {
      type: 'text',
      content: 'Agentic AI represents a fundamental shift in how we interact with artificial intelligence. Instead of just answering questions, these systems can actively plan, execute, and verify tasks.'
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop',
      caption: 'Neural networks visualizing complex decision paths.'
    },
    {
      type: 'link',
      url: 'https://deepmind.google/technologies/gemini/',
      title: 'Google DeepMind - Gemini',
      description: 'Learn more about the multimodal capabilities of Gemini.'
    },
    {
      type: 'code',
      language: 'python',
      content: `def autonomous_agent(task):
    plan = create_plan(task)
    while not plan.is_complete():
        action = plan.next_step()
        result = execute(action)
        plan.update(result)
    return plan.outcome`
    }
  ]
};
