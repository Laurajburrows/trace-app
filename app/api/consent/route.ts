export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const production_name = searchParams.get('production_name')
  const crew_member_name = searchParams.get('crew_member_name')

  if (!production_name || !crew_member_name) {
    return NextResponse.json({ error: 'production_name and crew_member_name required' }, { status: 400 })
  }

  const consent = await prisma.crewConsent.findUnique({
    where: {
      production_name_crew_member_name: { production_name, crew_member_name },
    },
  })

  return NextResponse.json({ consented: Boolean(consent), consent })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { production_name, crew_member_name, crew_role } = body

  if (!production_name || !crew_member_name || !crew_role) {
    return NextResponse.json(
      { error: 'production_name, crew_member_name, and crew_role are required' },
      { status: 400 }
    )
  }

  const consent = await prisma.crewConsent.upsert({
    where: {
      production_name_crew_member_name: { production_name, crew_member_name },
    },
    create: { production_name, crew_member_name, crew_role },
    update: {},
  })

  return NextResponse.json(consent, { status: 201 })
}
