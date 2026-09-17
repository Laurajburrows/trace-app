export type Department =
  | 'Development and Writing'
  | 'Production'
  | 'Casting'
  | 'Archive and Research'
  | 'Art Department'
  | 'Construction'
  | 'Camera'
  | 'Lighting'
  | 'Grip'
  | 'Sound'
  | 'Hair and Makeup'
  | 'Costume'
  | 'Continuity'
  | 'Locations'
  | 'Stunts'
  | 'VFX On Set'
  | 'Special Effects'
  | 'Publicity'
  | 'Corporate Responsibility'
  | 'Post Production'
  | 'Editorial'
  | 'VFX Post'
  | 'Colour'
  | 'Sound Post'
  | 'Music'
  | 'Delivery'

export type ToolStatus = 'GREEN' | 'AMBER' | 'YELLOW' | 'RED' | 'UNVERIFIED'

export type ReceiptStatus =
  | 'PENDING_AUTH'
  | 'PENDING_HOD_AUTH'
  | 'PENDING_PRODUCER_AUTH'
  | 'PENDING_EXEC_AUTH'
  | 'AUTH_COMPLETE'
  | 'RECALLED'
  | 'SUPERSEDED'

export type SubmitterRole = 'crew' | 'hod' | 'producer'

export type RoutedToTier = 'hod' | 'producer' | 'exec' | 'self'

export const SUBMITTER_ROLES: { value: SubmitterRole; label: string }[] = [
  { value: 'crew', label: 'Crew member' },
  { value: 'hod', label: 'Head of Department / Lead Creative' },
  { value: 'producer', label: 'Producer' },
]

export const GUILD_OPTIONS: { group: string; options: readonly string[] }[] = [
  {
    group: 'UK Guilds & Unions',
    options: ['BECTU', 'Equity', "Writers' Guild of Great Britain", "Musicians' Union", "Directors' Guild of Great Britain", 'PACT'],
  },
  {
    group: 'US Guilds & Unions',
    options: ['WGA (Writers Guild of America)', 'SAG-AFTRA', 'DGA (Directors Guild of America)', 'IATSE', 'Teamsters'],
  },
  {
    group: 'International',
    options: ['Other'],
  },
  {
    group: '',
    options: ['None / Non-union'],
  },
]

export const ROLE_GUILD_SUGGESTIONS: Record<string, string> = {
  // Development and Writing
  'Writer': "Writers' Guild of Great Britain",
  'Script Editor': "Writers' Guild of Great Britain",
  'Story Editor': "Writers' Guild of Great Britain",
  'Script Coordinator': "Writers' Guild of Great Britain",
  'Script Reader': "Writers' Guild of Great Britain",
  // Direction
  'Director': "Directors' Guild of Great Britain",
  '1st AD': "Directors' Guild of Great Britain",
  '2nd AD': 'BECTU',
  '3rd AD': 'BECTU',
  // Production
  'Executive Producer': 'PACT',
  'Producer': 'PACT',
  'Co-Producer': 'PACT',
  'Line Producer': 'PACT',
  'Production Manager': 'BECTU',
  'Production Coordinator': 'BECTU',
  'Production Secretary': 'BECTU',
  'Production Assistant': 'BECTU',
  // Camera
  'Director of Photography': 'BECTU',
  'Camera Operator': 'BECTU',
  '1st AC': 'BECTU',
  '2nd AC': 'BECTU',
  'DIT': 'BECTU',
  'Aerial DoP': 'BECTU',
  'Underwater Camera': 'BECTU',
  'Additional Camera Operator': 'BECTU',
  // Lighting & Grip
  'Gaffer': 'BECTU',
  'Best Boy Electric': 'BECTU',
  'Electrician': 'BECTU',
  'Generator Operator': 'BECTU',
  'Rigging Gaffer': 'BECTU',
  'Key Grip': 'BECTU',
  'Best Boy Grip': 'BECTU',
  'Grip': 'BECTU',
  'Dolly Grip': 'BECTU',
  'Rigging Grip': 'BECTU',
  // Sound (production)
  'Production Sound Mixer': 'BECTU',
  'Boom Operator': 'BECTU',
  'Sound Assistant': 'BECTU',
  // Art & Construction
  'Production Designer': 'BECTU',
  'Supervising Art Director': 'BECTU',
  'Art Director': 'BECTU',
  'Assistant Art Director': 'BECTU',
  'Set Decorator': 'BECTU',
  'Concept Artist': 'BECTU',
  'Storyboard Artist': 'BECTU',
  'Graphic Designer': 'BECTU',
  'Construction Manager': 'BECTU',
  'Scenic Artist': 'BECTU',
  'Painter': 'BECTU',
  // Hair, Makeup, Costume
  'Hair and Makeup Designer': 'BECTU',
  'Hair and Makeup Artist': 'BECTU',
  'Prosthetics Designer': 'BECTU',
  'Prosthetics Artist': 'BECTU',
  'Costume Designer': 'BECTU',
  'Supervising Costume Designer': 'BECTU',
  'Costume Supervisor': 'BECTU',
  'Costume Standby': 'BECTU',
  'Costume Assistant': 'BECTU',
  'Costume Buyer': 'BECTU',
  // Continuity
  'Script Supervisor': 'BECTU',
  // Post Production management
  'Post Production Supervisor': 'BECTU',
  'Post Production Coordinator': 'BECTU',
  // Editorial
  'Editor': 'BECTU',
  'First Assistant Editor': 'BECTU',
  'Assistant Editor': 'BECTU',
  // VFX Post
  'VFX Supervisor (Post)': 'BECTU',
  'VFX Producer': 'BECTU',
  'Compositor': 'BECTU',
  'VFX Artist': 'BECTU',
  'Roto Artist': 'BECTU',
  'Matchmove Artist': 'BECTU',
  'Matte Painter': 'BECTU',
  // Colour
  'Colourist': 'BECTU',
  'DI Supervisor': 'BECTU',
  'Online Editor': 'BECTU',
  'Conform Editor': 'BECTU',
  // Sound Post
  'Re-recording Mixer': 'BECTU',
  'Facility Mixer': 'BECTU',
  'Dialogue Editor': 'BECTU',
  'Sound Effects Editor': 'BECTU',
  'ADR Supervisor': 'BECTU',
  'ADR Editor': 'BECTU',
  'Foley Artist': 'BECTU',
  'Foley Editor': 'BECTU',
  'Music Editor': 'BECTU',
  'Dubbing Mixer': 'BECTU',
  'Deliveries and M&E Mix': 'BECTU',
  // Music
  'Composer': "Musicians' Union",
  'Music Supervisor': "Musicians' Union",
  'Music Producer': "Musicians' Union",
  'Orchestrator': "Musicians' Union",
  'Arranger': "Musicians' Union",
  // Delivery
  'QC Operator': 'BECTU',
  'Deliverables Coordinator': 'BECTU',
  'Localisation Coordinator': 'BECTU',
}

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

export const DIT_CAMERA_UNITS = [
  'A cam',
  'B cam',
  'C cam',
  'Additional unit',
  'All units',
] as const

export const DIT_PROCESSING_TYPES = [
  'Noise reduction',
  'Colour management',
  'LUT creation',
  'Format conversion',
  'Dailies processing',
  'Other',
] as const

export const DIT_COVERAGES = [
  'Single clip',
  'Roll',
  'Full day\'s footage',
] as const

export const VFX_ASSET_TYPES = [
  'Background replacement',
  'Crowd replication',
  'De-ageing or appearance modification',
  'Object removal',
  'Environment extension',
  'Motion capture processing',
  'Rotoscoping',
  'Upscaling or restoration',
  'Colour or texture generation',
  'Other',
] as const

export const VFX_PROCESSING_LOCATIONS = [
  'Local workstation',
  'Render farm',
  'Cloud service',
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

export const RENDER_PROCESSING_LOCATIONS = [
  'Local workstation',
  'On-premises render farm',
  'Cloud render farm — AWS',
  'Cloud render farm — Google Cloud',
  'Cloud render farm — other',
  'External facility',
  'Unknown',
] as const

export const COLOUR_GRADING_SYSTEMS = [
  'DaVinci Resolve',
  'Baselight',
  'Scratch',
  'Other',
] as const

export const EDITORIAL_EDITING_SYSTEMS = [
  'Avid Media Composer',
  'Adobe Premiere',
  'DaVinci Cut',
  'Other',
] as const

export const EDITORIAL_AI_TOOL_TYPES = [
  'Scene Edit Detection',
  'Text-Based Editing',
  'AI-assisted assembly',
  'AI transcription',
  'Other',
] as const

export const DELIVERY_AI_TOOL_TYPES = [
  'AI-assisted QC',
  'AI upscaling',
  'AI subtitling and captioning',
  'AI dubbing',
  'Other',
] as const

export const DELIVERY_FORMATS = [
  'DCP',
  'ProRes 4444',
  'ProRes 422',
  'H.264',
  'H.265',
  'IMF',
  'Other',
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
  'Development and Writing',
  'Production',
  'Casting',
  'Archive and Research',
  'Art Department',
  'Construction',
  'Camera',
  'Lighting',
  'Grip',
  'Sound',
  'Hair and Makeup',
  'Costume',
  'Continuity',
  'Locations',
  'Stunts',
  'VFX On Set',
  'Special Effects',
  'Publicity',
  'Corporate Responsibility',
  'Post Production',
  'Editorial',
  'VFX Post',
  'Colour',
  'Sound Post',
  'Music',
  'Delivery',
]

export const ROLES_BY_DEPARTMENT: Record<Department, readonly string[]> = {
  'Development and Writing': ['Writer', 'Script Editor', 'Story Editor', 'Script Coordinator', 'Script Reader'],
  'Production': ['Executive Producer', 'Producer', 'Co-Producer', 'Line Producer', 'Production Manager', 'Production Coordinator', 'Production Secretary', 'Production Assistant', 'Director', '1st AD', '2nd AD', '3rd AD'],
  'Casting': ['Casting Director', 'Casting Associate', 'Casting Assistant'],
  'Archive and Research': ['Researcher', 'Archive Producer', 'Archive Coordinator'],
  'Art Department': ['Production Designer', 'Supervising Art Director', 'Art Director', 'Assistant Art Director', 'Set Decorator', 'Buyer', 'Prop Master', 'Props Buyer', 'Props Assistant', 'Standby Props', 'Concept Artist', 'Storyboard Artist', 'Graphic Designer'],
  'Construction': ['Construction Manager', 'Scenic Artist', 'Painter'],
  'Camera': ['Director of Photography', 'Camera Operator', '1st AC', '2nd AC', 'DIT', 'Aerial DoP', 'Underwater Camera', 'Additional Camera Operator'],
  'Lighting': ['Gaffer', 'Best Boy Electric', 'Electrician', 'Generator Operator', 'Rigging Gaffer'],
  'Grip': ['Key Grip', 'Best Boy Grip', 'Grip', 'Dolly Grip', 'Rigging Grip'],
  'Sound': ['Production Sound Mixer', 'Boom Operator', 'Sound Assistant'],
  'Hair and Makeup': ['Hair and Makeup Designer', 'Hair and Makeup Artist', 'Prosthetics Designer', 'Prosthetics Artist'],
  'Costume': ['Costume Designer', 'Supervising Costume Designer', 'Costume Supervisor', 'Costume Standby', 'Costume Assistant', 'Costume Buyer'],
  'Continuity': ['Script Supervisor'],
  'Locations': ['Location Manager', 'Unit Manager', 'Location Scout', 'Location Assistant', 'Security Coordinator', 'Security'],
  'Stunts': ['Stunt Coordinator', 'Stunt Performer'],
  'VFX On Set': ['VFX Supervisor (On Set)', 'VFX Production Manager', 'VFX PA'],
  'Special Effects': ['Special Effects Supervisor', 'Special Effects Technician'],
  'Publicity': ['Unit Publicist', 'Publicity Assistant', 'On Set Publicist', 'Stills Photographer'],
  'Corporate Responsibility': ['Sustainability Coordinator', 'Access Coordinator', 'DEI Manager'],
  'Post Production': ['Post Production Supervisor', 'Post Production Coordinator'],
  'Editorial': ['Editor', 'First Assistant Editor', 'Assistant Editor'],
  'VFX Post': ['VFX Supervisor (Post)', 'VFX Producer', 'Compositor', 'VFX Artist', 'Roto Artist', 'Matchmove Artist', 'Matte Painter'],
  'Colour': ['Colourist', 'DI Supervisor', 'Online Editor', 'Conform Editor'],
  'Sound Post': ['Re-recording Mixer', 'Facility Mixer', 'Dialogue Editor', 'Sound Effects Editor', 'ADR Supervisor', 'ADR Editor', 'Foley Artist', 'Foley Editor', 'Music Editor', 'Dubbing Mixer', 'Deliveries and M&E Mix'],
  'Music': ['Composer', 'Music Supervisor', 'Music Producer', 'Orchestrator', 'Arranger'],
  'Delivery': ['QC Operator', 'Deliverables Coordinator', 'Localisation Coordinator'],
} as const

export interface CustomRole {
  id: string
  role_name: string
  department: string
  created_at: string
}

export interface WhitelistEntry {
  id: string
  toolName: string
  displayName: string
  department: string
  status: 'GREEN' | 'AMBER' | 'RED'
  condition?: string | null
  requiresLCT: boolean
  carbonIntensity?: string | null
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
  tool_carbon_intensity?: string | null
  por_description: string
  sel_output?: string | null
  sel_description: string
  sel_detail?: string | null
  arr_description: string
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
  vfx_sequence?: string | null
  vfx_shot_version?: string | null
  vfx_asset_type?: string | null
  vfx_element_processed?: string | null
  dit_camera_unit?: string | null
  dit_processing_type?: string | null
  dit_coverage?: string | null
  dit_lct_flag?: boolean
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
  colour_grading_system?: string | null
  colour_ai_grading?: boolean
  colour_performer_footage?: boolean
  colour_lct_confirmed?: boolean
  editorial_editing_system?: string | null
  editorial_ai_tool_type?: string | null
  editorial_performer_footage?: boolean
  editorial_lct_confirmed?: boolean
  delivery_ai_tool_type?: string | null
  delivery_format?: string | null
  delivery_no_training_confirmed?: boolean
  facility_name?: string | null
  render_processing_location?: string | null
  facility_ai_policy_confirmed?: boolean
  input_file_version?: string | null
  output_file_version?: string | null
  tool_version?: string | null
  scene_asset_reference?: string | null
  writing_script_reference?: string | null
  writing_scene_number?: string | null
  reel?: string | null
  timecode_range?: string | null
  session_file_reference?: string | null
  deliverable_name?: string | null
  recalled_at?: string | null
  resubmitted_at?: string | null
  supersedes?: string | null
  superseded_by?: string | null
  superseded_at?: string | null
  supersede_reason?: string | null
  is_session?: boolean
  session_tool_entries?: SessionToolEntry[] | null
  writing_consent_confirmed?: boolean
  third_party_asset?: boolean
  third_party_licence_confirmed?: boolean
  additional_tools?: AdditionalToolEntry[] | null
  guild_affiliation?: string | null
  guild_affiliation_other?: string | null
}

export interface AdditionalToolEntry {
  ai_tool_used: string
  tool_status: string
  whitelist_condition?: string | null
  tool_version: string
  por_description: string
  sel_output: string
  sel_description: string
  sel_detail?: string | null
  arr_description: string
}

export interface Production {
  id: string
  name: string
  declaration_briefed: boolean
  declaration_logged: boolean
  declaration_consented: boolean
  declaration_timestamp?: string | null
  activated_at?: string | null
  created_at: string
}

export interface SessionToolEntry {
  ai_tool_used: string
  tool_status: string
  whitelist_condition?: string | null
  tool_version?: string | null
  input_file_version?: string | null
  output_file_version?: string | null
  vfx_software?: string | null
  vfx_data_location?: string | null
  vfx_no_training_confirmed?: boolean
  vfx_input_type?: string | null
  vfx_output_type?: string | null
  vfx_lct_confirmed?: boolean
  colour_grading_system?: string | null
  colour_ai_grading?: boolean
  colour_performer_footage?: boolean
  colour_lct_confirmed?: boolean
  editorial_editing_system?: string | null
  editorial_ai_tool_type?: string | null
  editorial_performer_footage?: boolean
  editorial_lct_confirmed?: boolean
  sound_processing_location?: string | null
  sound_processing_type?: string | null
  sound_performer_audio?: boolean
  sound_no_training_confirmed?: boolean
  delivery_ai_tool_type?: string | null
  delivery_format?: string | null
  delivery_no_training_confirmed?: boolean
}

export interface CrewConsent {
  id: string
  production_name: string
  crew_member_name: string
  crew_role: string
  consented_at: string
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
  crew_consents: CrewConsent[]
  unconsented_crew: string[]
}

export interface ToolEntry {
  tool: string
  status: ToolStatus
  count: number
  departments: string[]
}
