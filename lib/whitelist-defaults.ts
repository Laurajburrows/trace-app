export interface WhitelistDefault {
  toolName: string
  displayName: string
  department: string
  status: 'GREEN' | 'AMBER' | 'RED'
  condition: string | null
  requiresLCT: boolean
}

export const DEFAULT_WHITELIST: WhitelistDefault[] = []
