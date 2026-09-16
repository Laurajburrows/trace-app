export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const roles = await prisma.customRole.findMany({ orderBy: { created_at: 'asc' } })
  return NextResponse.json(roles)
}

export async function POST(req: NextRequest) {
  const { role_name, department } = await req.json()
  if (!role_name?.trim() || !department?.trim()) {
    return NextResponse.json({ error: 'role_name and department are required' }, { status: 400 })
  }
  try {
    const role = await prisma.customRole.create({ data: { role_name: role_name.trim(), department: department.trim() } })
    return NextResponse.json(role, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Role already exists' }, { status: 409 })
  }
}
