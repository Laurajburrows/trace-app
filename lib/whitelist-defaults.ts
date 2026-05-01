export interface WhitelistDefault {
  toolName: string
  displayName: string
  status: 'GREEN' | 'AMBER' | 'RED'
  condition: string | null
  requiresLCT: boolean
}

export const DEFAULT_WHITELIST: WhitelistDefault[] = [
  // GREEN — approved, no conditions
  { toolName: 'adobe firefly', displayName: 'Adobe Firefly', status: 'GREEN', condition: null, requiresLCT: false },
  { toolName: 'davinci neural engine', displayName: 'DaVinci Neural Engine', status: 'GREEN', condition: null, requiresLCT: false },
  { toolName: 'marz', displayName: 'MARZ', status: 'GREEN', condition: null, requiresLCT: false },
  { toolName: 'flawless ai truesync', displayName: 'Flawless AI TrueSync', status: 'GREEN', condition: null, requiresLCT: false },
  { toolName: 'adobe enhanced speech', displayName: 'Adobe Enhanced Speech', status: 'GREEN', condition: null, requiresLCT: false },
  // AMBER — conditional approval
  { toolName: 'eleven labs', displayName: 'Eleven Labs', status: 'AMBER', condition: 'LCT required. Voice synthesis consent must be verified before use.', requiresLCT: true },
  { toolName: 'respeecher', displayName: 'Respeecher', status: 'AMBER', condition: 'LCT required. Voice synthesis consent must be verified before use.', requiresLCT: true },
  { toolName: 'stable diffusion', displayName: 'Stable Diffusion', status: 'AMBER', condition: 'Local deployment only. No cloud upload of production data.', requiresLCT: false },
  { toolName: 'udio', displayName: 'Udio', status: 'AMBER', condition: 'Music/score use only. No dialogue or voice synthesis.', requiresLCT: false },
  { toolName: 'suno', displayName: 'Suno', status: 'AMBER', condition: 'Music/score use only. No dialogue or voice synthesis.', requiresLCT: false },
  { toolName: 'metaphysic', displayName: 'Metaphysic', status: 'AMBER', condition: 'LCT required. Digital replica consent must be verified before use.', requiresLCT: true },
]
