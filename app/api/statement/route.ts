export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { DEPARTMENTS } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const production = searchParams.get('production')

  if (!production) {
    return NextResponse.json({ error: 'production required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured on this server.' }, { status: 500 })
  }

  const receipts = await prisma.receipt.findMany({
    where: { production_name: production, status: { not: 'SUPERSEDED' } },
    select: { department: true, ai_tool_used: true, tool_status: true },
  })

  if (receipts.length === 0) {
    return NextResponse.json({ error: 'No receipts found for this production.' }, { status: 404 })
  }

  const departmentsWithAI = Array.from(new Set(receipts.map((r) => r.department))).sort()
  const toolsUsed = Array.from(new Set(receipts.map((r) => r.ai_tool_used))).sort()
  const departmentsWithoutAI = DEPARTMENTS.filter((d) => !departmentsWithAI.includes(d))

  const prompt = `You are writing a Production AI Statement for a film or television production's end credits or legal disclosure pack.

Based on the following AI usage summary for the production "${production}", write a plain-language Production AI Statement covering exactly three points, in this order:

1. Where AI was used — which departments and which specific tools
2. Where AI was not used — which departments had no AI activity logged
3. Human accountability — that all AI-assisted creative decisions were made under documented human authorial control via the TRACE© Artist Receipt system

Rules:
- Write exactly three statements, separated by a blank line
- Each statement should be 1–3 sentences
- Formal, professional language appropriate for screen credits or legal disclosure
- Do not use bullet points, numbers, or headers — plain prose only
- Do not invent details beyond what is provided below

Production AI Usage Data:
Production: ${production}
Total TRACE Artist Receipts logged: ${receipts.length}
Departments using AI: ${departmentsWithAI.join(', ')}
AI tools used: ${toolsUsed.join(', ')}
Departments with no AI activity logged: ${departmentsWithoutAI.length > 0 ? departmentsWithoutAI.join(', ') : 'All departments logged AI activity'}`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const statement = (message.content[0] as { type: string; text: string }).text ?? ''

  return NextResponse.json({ statement })
}
