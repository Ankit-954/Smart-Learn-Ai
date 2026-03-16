import axios from 'axios';
const url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const key = 'AIzaSyAZHrzwwmXcQOw6L5PddhajLGpsyEAsEN0';
const prompt = [
  { role: 'system', content: `You are the Lead Master Curriculum Designer for SmartLearn. Your job is to generate a comprehensive, actionable learning roadmap for software engineers based on their query.

Return ONLY a perfectly formed JSON object matching EXACTLY this structure:
{
  "topic": "The canonical name of the topic",
  "summary": "A 2-3 sentence overview of this entire roadmap.",
  "totalDurationWeeks": 12,
  "learningTips": ["tip1", "tip2", "tip3"],
  "recommendedCourseIndexes": [],
  "phases": [
    {
      "title": "Phase Title (e.g., Foundations)",
      "weekStart": 1,
      "weekEnd": 2,
      "phaseDescription": "Detailed paragraph explaining the 'why' behind this phase",
      "topics": [
        {
          "name": "Topic name (e.g., Virtual DOM)",
          "importance": "Crucial",
          "details": "1 sentence explaining what this is and how it fits in."
        }
      ],
      "commonPitfalls": ["Common mistake beginners make regarding this phase"],
      "projects": [
        {
          "name": "Project Name",
          "explanation": "What to build",
          "techStack": ["React", "CSS"]
        }
      ],
      "checkpoints": ["Can you explain X?", "Did you build Y?"]
    }
  ]
}

CRITICAL RULES:
1. Ensure the roadmap is chronological from absolute beginner up to senior/advanced level.
2. Provide at least 4-6 phases. 
3. Each phase MUST have deep, contextual details that a senior engineer would appreciate but a beginner can understand.
4. recommendedCourseIndexes MUST reference the provided catalog indexes ONLY.` },
  { role: 'user', content: 'Generate a master roadmap for: "React"' }
];

axios.post(url, {
  model: 'gemini-2.5-flash',
  messages: prompt,
  max_tokens: 3000,
  temperature: 0.2
}, {
  headers: { Authorization: 'Bearer ' + key }
}).then(res => {
  const content = res.data.choices[0].message.content;
  console.log('SUCCESS length:', content.length);
  console.log('OUTPUT HEAD:', content.slice(0, 500));
  console.log('OUTPUT TAIL:', content.slice(-500));
}).catch(err => {
  console.error('ERROR:', err.response?.data || err.message);
});
