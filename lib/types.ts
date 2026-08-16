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

export type ReceiptStatus =
  | 'PENDING_AUTH'
  | 'PENDING_HOD_AUTH'
  | 'PENDING_PRODUCER_AUTH'
  | 'PENDING_EXEC_AUTH'
  | 'AUTH_COMPLETE'

export type SubmitterRole = 'crew' | 'hod' | 'producer'

export type RoutedToTier = 'hod' | 'producer' | 'exec' | 'self'

export const SUBMITTER_ROLES: { value: SubmitterRole; label: string }[] = [
  { value: 'crew', label: 'Crew member' },
  { value: 'hod', label: 'Head of Department / Lead Creative' },
  { value: 'producer', label: 'Producer' },
]

export const VFX_DATA_LOCATIONS = [
  'On-premises facility',
  'UK cloud server',
  'US cloud server',
  'EU cloud server',
  'Unknown',
] as const

export const VFX_INPUT_TYPES = [
  'Plate footage containing performers',
  'Plate footage no performers',
  'Reference image',
  'Audio',
  'Script',
  'Other',
] as const

export const VFX_OUTPUT_TYPES = [
  'Background plate',
  'Rotoscope mask',
  'De-aged face',
  'Voice synthesis',
  'Upscaled image',
  'Composite',
  'Other',
] as const

export const SOUND_PROCESSING_LOCATIONS = [
  'Local software — not uploaded',
  'UK cloud server',
  'US cloud server',
  'EU cloud server',
  'Unknown',
] as const

export const SOUND_PROCESSING_TYPES = [
  'Noise reduction',
  'Dialogue isolation',
  'Breath removal',
  'De-reverberation',
  'Voice enhancement',
  'Combination of the above',
  'Other',
] as const

export const WRITING_STAGES = [
  'Development',
  'Treatment',
  'First draft',
  'Revision',
  'Writers room session',
  'Polish',
  'Production rewrite',
] as const

export const WRITING_SUBMITTED_MATERIALS = [
  'Story concept only — no script text',
  'Treatment excerpt',
  'Scene outline',
  'Script pages',
  'Dialogue excerpt',
  'Full script draft',
  'Research material only',
  'Nothing submitted — AI generated from prompt only',
  'Other',
] as const

export const WRITING_PROCESSING_LOCATIONS = [
  'Local software — not uploaded',
  'UK cloud server',
  'US cloud server',
  'EU cloud server',
  'Unknown',
] as const

export const WRITING_GUILD_STATUSES = [
  'WGA',
  'WGGB',
  'Neither',
  'Unknown',
] as const

export const WGA_SCRIPT_REGISTRATION_STATUSES = [
  'Registered with WGA Registry',
  'Not yet registered',
  'Not applicable',
] as const

export const WGGB_WRITING_CONTEXTS = [
  'Working alone',
  'Writers room',
  'With script editor',
  'Other',
] as const

export const WRITING_AI_CONTRIBUTIONS = [
  'Brainstorming and ideas only — no text used',
  'Structural suggestions',
  'Draft text substantially rewritten by writer',
  'Draft text partially used',
  'Draft text used with minor changes',
] as const

export const LCT_AGE_BRACKETS = [
  'Under 13',
  '13–15',
  '16–17',
] as const

export const SEL_REASONS = [
  'Creative direction',
  'Technical quality',
  'Brief compliance',
  'Least adjustment needed',
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
  status: ReceiptStatus
  crew_confirmed_at?: string | null
  auth_signer?: string | null
  auth_timestamp?: string | null
  lct_required: boolean
  lct_reference?: string | null
  lct_child_performer?: boolean
  lct_child_age_bracket?: string | null
  lct_guardian_name?: string | null
  lct_guardian_consent_ref?: string | null
  lct_performance_licence_ref?: string | null
  notes?: string | null
  twin_lock_hash?: string | null
  submitter_role?: string | null
  routed_to_tier?: string | null
  created_at: string
  vfx_software?: string | null
  vfx_data_location?: string | null
  vfx_no_training_confirmed?: boolean
  vfx_input_type?: string | null
  vfx_output_type?: string | null
  vfx_lct_confirmed?: boolean
  sound_processing_location?: string | null
  sound_processing_type?: string | null
  sound_performer_audio?: boolean
  sound_no_training_confirmed?: boolean
  writing_stage?: string | null
  writing_submitted_material?: string | null
  writing_processing_location?: string | null
  writing_guild_status?: string | null
  writing_ai_contribution?: string | null
  writing_no_training_confirmed?: boolean
  writing_authorship_declared?: boolean
  writing_wga_writers_count?: number | null
  writing_wga_registration?: string | null
  writing_wggb_context?: string | null
  writing_wggb_paternity?: boolean
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
