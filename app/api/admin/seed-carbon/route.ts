export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const RULES: { keywords: string[]; intensity: string }[] = [
  { keywords: ['runway', 'sora', 'pika', 'gen-2', 'gen2', 'kling', 'luma', 'hailuo', 'emu video', 'lumiere'], intensity: 'High' },
  { keywords: ['midjourney', 'firefly', 'dall-e', 'dalle', 'stable diffusion', 'leonardo', 'ideogram', 'imagen', 'adobe firefly', 'nightcafe', 'artbreeder'], intensity: 'Medium' },
  { keywords: ['claude', 'chatgpt', 'gpt', 'whisper', 'transcri', 'otter', 'trint', 'descript', 'eleven', 'speech', 'voiceover', 'voice ai', 'soundraw', 'mubert', 'loudly', 'notion ai', 'jasper', 'copy.ai'], intensity: 'Low' },
]

function inferIntensity(toolName: string): string {
  const lower = toolName.toLowerCase()
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.intensity
  }
  return 'Medium'
}

export async function POST() {
  const entries = await prisma.whitelistEntry.findMany({ select: { id: true, toolName: true, displayName: true } })

  const updates = await Promise.all(
    entries.map((e) => {
      const intensity = inferIntensity(e.displayName || e.toolName)
      return prisma.whitelistEntry.update({
        where: { id: e.id },
        data: { carbonIntensity: intensity },
      })
    })
  )

  return NextResponse.json({ seeded: updates.length, entries: updates.map((u) => ({ id: u.id, displayName: u.displayName, carbonIntensity: u.carbonIntensity })) })
}
