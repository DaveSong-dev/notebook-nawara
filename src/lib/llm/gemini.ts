import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI && GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  }
  if (!genAI) throw new Error('Gemini API key not configured')
  return genAI
}

export async function generateWithGeminiFlash(prompt: string): Promise<string> {
  const ai = getGenAI()
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function generateWithGeminiLite(prompt: string): Promise<string> {
  const ai = getGenAI()
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export function isGeminiConfigured(): boolean {
  return Boolean(GEMINI_API_KEY)
}
