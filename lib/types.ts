export type Department =
  | 'Access'
  | 'Animals'
  | 'Armoury'
  | 'Art Department'
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

export type ToolStatus = 'GREEN' | 'AMBER' | 'YELLOW' | 'RED' | 'UNVERIFIED'

export const SEL_REASONS = [
  'Creative direction — style, tone, aesthetic fit',
  'Technical quality — resolution, accuracy, detail',
  'Brief compliance — closest to the original instruction',
  'Least adjustment needed — most efficient to work with',
  'Combination of the above',
  'Other',
] as const

export type SelReason = typeof SEL_REASONS[number]

export const DEPARTMENTS: Department[] = [
  'Access',
  'Animals',
  'Armoury',
  'Art Department',
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

export interface WhitelistEntry {
  id: string
  toolName: string
  displayName: string
  status: 'GREEN' | 'AMBER' | 'RED'
  condition?: string | null
  requiresLCT: boolean
  createdAt: string
  updatedAt: string
}

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
  whitelist_condition?: string | null
  por_description: string
  sel_output?: string | null
  sel_description: string
  sel_detail?: string | null
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
