import Groq from 'groq-sdk'

const GROQ_API_KEY = process.env.GROQ_API_KEY

let groqClient: Groq | null = null

function getGroq(): Groq {
  if (!groqClient && GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: GROQ_API_KEY })
  }
  if (!groqClient) throw new Error('Groq API key not configured')
  return groqClient
}

export async function generateWithGroq(prompt: string): Promise<string> {
  const client = getGroq()
  const completion = await client.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  })
  return completion.choices[0]?.message?.content ?? '{}'
}

export function isGroqConfigured(): boolean {
  return Boolean(GROQ_API_KEY)
}
