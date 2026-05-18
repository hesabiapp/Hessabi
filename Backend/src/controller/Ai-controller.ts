import { Request, Response } from 'express'

const callClaude = async (system: string, messages: { role: string; content: string }[]) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 1000,
            system,
            messages,
        }),
    })
    const data = await res.json()
    return data.content?.map((c: any) => c.text).join('') ?? ''
}

// POST /ai/insight  — auto summary on page load
export const getInsight = async (req: Request, res: Response) => {
    const { context } = req.body
    if (!context) return res.status(400).json({ message: 'Context is required.' })

    try {
        const reply = await callClaude('', [{
            role: 'user',
            content: `You are a business analyst. Here is the business data:\n\n${context}\n\nWrite a concise executive summary (3-4 sentences) highlighting: overall performance, biggest strength, biggest concern, and one actionable recommendation. Be specific with numbers. Keep it professional but conversational.`,
        }])
        return res.status(200).json({ reply })
    } catch (err) {
        console.error('AI insight error:', err)
        return res.status(500).json({ message: 'AI request failed.' })
    }
}

// POST /ai/chat  — ongoing conversation
export const chat = async (req: Request, res: Response) => {
    const { context, messages } = req.body
    if (!context || !messages) return res.status(400).json({ message: 'Context and messages are required.' })

    try {
        const system = `You are a helpful business analyst assistant for a retail business. You have access to their complete sales and expenses data. Answer questions accurately using the data provided. Be concise and specific with numbers. Always use BHD (Bahraini Dinar) for currency.\n\nBusiness Data:\n${context}`
        const reply = await callClaude(system, messages)
        return res.status(200).json({ reply })
    } catch (err) {
        console.error('AI chat error:', err)
        return res.status(500).json({ message: 'AI request failed.' })
    }
}
