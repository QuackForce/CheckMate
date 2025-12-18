import type { 
  User, 
  Client, 
  InfraCheck, 
  CheckTemplate,
  TemplateCategory,
  TemplateItem,
  CategoryResult,
  ItemResult,
  CheckComment,
  TimerSession,
  UserRole,
  ClientStatus,
  CheckCadence,
  CheckStatus,
} from '@prisma/client'

// Re-export Prisma types
export type {
  User,
  Client,
  InfraCheck,
  CheckTemplate,
  TemplateCategory,
  TemplateItem,
  CategoryResult,
  ItemResult,
  CheckComment,
  TimerSession,
}

export { UserRole, ClientStatus, CheckCadence, CheckStatus }

// Extended types with relations
export type ClientWithRelations = Client & {
  assignedEngineers: User[]
  checks: InfraCheck[]
  template: CheckTemplate | null
}

export type InfraCheckWithRelations = InfraCheck & {
  client: Client
  assignedEngineer: User
  completedBy: User | null
  template: CheckTemplate
  categoryResults: (CategoryResult & {
    items: ItemResult[]
  })[]
  comments: (CheckComment & {
    author: User
  })[]
  timerSessions: TimerSession[]
}

export type CheckTemplateWithRelations = CheckTemplate & {
  categories: (TemplateCategory & {
    items: TemplateItem[]
  })[]
}

// Dashboard stats type
export type DashboardStats = {
  overdueCount: number
  todayCount: number
  thisWeekCount: number
  completedThisMonth: number
  totalClients: number
  activeClients: number
}

// Form types
export type CreateClientInput = {
  name: string
  status?: ClientStatus
  slackChannelId?: string
  slackChannelName?: string
  defaultCadence?: CheckCadence
  assignedEngineerIds?: string[]
  templateId?: string
  notes?: string
}

export type CreateCheckInput = {
  clientId: string
  assignedEngineerId: string
  templateId: string
  scheduledDate: Date
  cadence: CheckCadence
}

export type UpdateCheckItemInput = {
  checkId: string
  categoryResultId: string
  itemResultId: string
  checked: boolean
  notes?: string
}

// Navigation types
export type NavItem = {
  title: string
  href: string
  icon: string
  badge?: number
}










