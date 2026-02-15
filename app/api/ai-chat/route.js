import { NextResponse } from 'next/server'

// Google Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent'
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY

export async function POST(request) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Prepare messages for Gemini API
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    // Send request to Google Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API Error:', errorText)
      return NextResponse.json(
        { error: 'AI service error' },
        { status: geminiResponse.status }
      )
    }

    const result = await geminiResponse.json()
    console.log('Gemini API Response:', JSON.stringify(result, null, 2))

    // Extract response content from Gemini API
    let responseContent = 'No response received'
    
    if (result && result.candidates && result.candidates[0]) {
      const candidate = result.candidates[0]
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        responseContent = candidate.content.parts[0].text
      }
    } else if (result && result.error) {
      console.error('Gemini API Error:', result.error)
      return NextResponse.json(
        { error: 'AI service error' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      output: responseContent,
      error: null
    })

  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}