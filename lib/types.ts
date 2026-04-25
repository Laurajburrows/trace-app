export type Department =
  | 'Access'
  | 'Animals'
  | 'Armoury'
  | 'Camera'
  | 'Cast'
  | 'Directors'
  | 'Editorial'
  | 'Grip'
  | 'Hair'
  | 'Health & Safety'
  | 'HR'
  | 'Lighting'
  | 'Locations'
  | 'Makeup'
  | 'Mental Health'
  | 'Picture Post'
  | 'Picture Vehicles'
  | 'Producers'
  | 'Production'
  | 'Property'
  | 'Publicity'
  | 'Set Construction'
  | 'Set Design'
  | 'Set Dressing'
  | 'SFX'
  | 'Sound'
  | 'Sound Post'
  | 'Stunts'
  | 'Sustainability'
  | 'VFX'
  | 'Wardrobe'
  | 'Writing'

export type ToolStatus = 'GREEN' | 'YELLOW' | 'RED'

export const DEPARTMENTS: Department[] = [
  'Access',
  'Animals',
  'Armoury',
  'Camera',
  'Cast',
  'Directors',
  'Editorial',
  'Grip',
  'Hair',
  'Health & Safety',
  'HR',
  'Lighting',
  'Locations',
  'Makeup',
  'Mental Health',
  'Picture Post',
  'Picture Vehicles',
  'Producers',
  'Production',
  'Property',
  'Publicity',
  'Set Construction',
  'Set Design',
  'Set Dressing',
  'SFX',
  'Sound',
  'Sound Post',
  'Stunts',
  'Sustainability',
  'VFX',
  'Wardrobe',
  'Writing',
]

export const TOOL_STATUSES: ToolStatus[] = ['GREEN', 'YELLOW', 'RED']

export interface Receipt {
  id: string
  production_name: string
  date: string
  department: Department
  crew_member_name: string
  crew_role: string
  scene_usid: string
  script_date: string
  ai_tool_used: string
  tool_status: ToolStatus
  por_description: string
  sel_description: string
  adj_description: string
  auth_signer: string
  auth_timestamp: string
  lct_required: boolean
  lct_reference?: string | null
  notes?: string | null
  twin_lock_hash?: string | null
  created_at: string
}

export interface ReportData {
  production_name: string
  receipts: Receipt[]
  generated_at: string
  date_range: { from: string; to: string }
  by_department: Record<string, number>
  by_tool: ToolEntry[]
  auth_signed_count: number
  green_pct: number
  lct_receipts: Receipt[]
  all_signers: string[]
  filter_description?: string | null
}

export interface ToolEntry {
  tool: string
  status: ToolStatus
  count: number
  departments: string[]
}
