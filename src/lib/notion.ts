/**
 * Notion Integration Service
 * Handles syncing client data from Notion to our database
 */

import { db as prisma } from './db';
import { ClientStatus, CheckCadence, Priority, ClientEngineerRole } from '@prisma/client';
import { lookupTrustCenter } from './trustlists';
import { invalidateTeamCache, CACHE_KEYS } from './cache';

// Cache for Notion config (refreshed on each sync)
let notionConfigCache: {
  apiKey: string;
  clientDbId: string;
  teamDbId: string;
} | null = null;

// Get Notion configuration from database or env (cached)
async function getNotionConfig(): Promise<{ apiKey: string; clientDbId: string; teamDbId: string }> {
  // Return cached if available
  if (notionConfigCache) {
    return notionConfigCache;
  }
  
  let apiKey = process.env.NOTION_API_KEY || '';
  let clientDbId = process.env.NOTION_CLIENT_DATABASE_ID || '';
  let teamDbId = process.env.NOTION_TEAM_MEMBERS_DATABASE_ID || '';
  
  try {
    const integration = await prisma.integrationSettings.findUnique({
      where: { provider: 'notion' },
      select: { apiKey: true, enabled: true, config: true },
    });
    
    if (integration?.enabled && integration.apiKey) {
      apiKey = integration.apiKey;
    }
    
    if (integration?.config) {
      try {
        const config = JSON.parse(integration.config);
        if (config.clientDatabaseId) clientDbId = config.clientDatabaseId;
        if (config.teamMembersDatabaseId) teamDbId = config.teamMembersDatabaseId;
      } catch {
        // Invalid JSON, use env fallback
      }
    }
  } catch (error) {
    // Use env fallback
  }
  
  // Cache the config
  notionConfigCache = { apiKey, clientDbId, teamDbId };
  return notionConfigCache;
}

// Clear cache (call after updating integration settings)
export function clearNotionConfigCache() {
  notionConfigCache = null;
}

interface NotionPage {
  id: string;
  properties: Record<string, any>;
  created_time: string;
  last_edited_time: string;
}

interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

/**
 * Fetch all pages from the Notion database
 */
async function fetchAllNotionClients(): Promise<NotionPage[]> {
  const config = await getNotionConfig();
  
  if (!config.apiKey || !config.clientDbId) {
    throw new Error('Notion API key or database ID not configured');
  }
  
  const allPages: NotionPage[] = [];
  let hasMore = true;
  let nextCursor: string | null = null;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (nextCursor) {
      body.start_cursor = nextCursor;
    }

    const response = await fetch(
      `https://api.notion.com/v1/databases/${config.clientDbId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Notion API error: ${error.message}`);
    }

    const data: NotionQueryResponse = await response.json();
    allPages.push(...data.results);
    hasMore = data.has_more;
    nextCursor = data.next_cursor;
  }

  return allPages;
}

/**
 * Extract property value from Notion page property
 */
function getPropertyValue(property: any): any {
  if (!property) return null;

  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || null;
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || null;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select?.map((s: any) => s.name) || [];
    case 'people':
      return property.people?.map((p: any) => ({ id: p.id, name: p.name, email: p.person?.email })) || [];
    case 'date':
      return property.date?.start ? new Date(property.date.start) : null;
    case 'checkbox':
      return property.checkbox || false;
    case 'url':
      return property.url || null;
    case 'email':
      return property.email || null;
    case 'phone_number':
      return property.phone_number || null;
    case 'number':
      return property.number;
    case 'status':
      return property.status?.name || null;
    case 'relation':
      return property.relation?.map((r: any) => r.id) || [];
    default:
      return null;
  }
}

// Cache for team member contacts (pageId -> { name, email })
let teamMemberCache: Map<string, { name: string | null; email: string | null }> = new Map();

// Cache for vendor names (pageId -> name)
let vendorCache: Map<string, string> = new Map();

// Cache for compliance framework names (pageId -> name)
let complianceFrameworkCache: Map<string, string> = new Map();

/**
 * Get compliance frameworks - handles both multi_select and relation types
 */
async function getComplianceFrameworks(property: any): Promise<string[]> {
  if (!property) return [];
  
  // Handle multi_select type
  if (property.type === 'multi_select') {
    return property.multi_select?.map((s: any) => s.name) || [];
  }
  
  // Handle relation type - need to look up the page titles
  if (property.type === 'relation') {
    const relationIds = property.relation?.map((r: any) => r.id) || [];
    if (relationIds.length === 0) return [];
    
    const config = await getNotionConfig();
    if (!config.apiKey) return [];
    
    const frameworks: string[] = [];
    
    for (const pageId of relationIds) {
      // Check cache first
      if (complianceFrameworkCache.has(pageId)) {
        frameworks.push(complianceFrameworkCache.get(pageId)!);
        continue;
      }
      
      try {
        const response = await fetch(
          `https://api.notion.com/v1/pages/${pageId}`,
          {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Notion-Version': '2022-06-28',
            },
          }
        );
        
        if (response.ok) {
          const page = await response.json();
          // Try to get the title from common property names
          const props = page.properties;
          let name = null;
          
          // Try different property names for the title
          for (const propName of ['Name', 'Title', 'Framework', 'Compliance']) {
            if (props[propName]) {
              name = getPropertyValue(props[propName]);
              if (name) break;
            }
          }
          
          // Fallback: find any title property
          if (!name) {
            for (const prop of Object.values(props) as any[]) {
              if (prop.type === 'title') {
                name = prop.title?.[0]?.plain_text;
                if (name) break;
              }
            }
          }
          
          if (name) {
            complianceFrameworkCache.set(pageId, name);
            frameworks.push(name);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch compliance framework ${pageId}:`, error);
      }
    }
    
    return frameworks;
  }
  
  return [];
}

// System relation columns in Notion -> our SystemCategoryType
const SYSTEM_RELATION_COLUMNS: Record<string, string> = {
  'IDP': 'IDENTITY',
  'Email': 'IDENTITY',
  'MDM': 'MDM',
  'AV/EDR': 'AV_EDR',
  'Password Manager': 'PASSWORD',
  'GRC': 'GRC',
  'Security Training': 'SECURITY_TRAINING',
  'Workspace Backups': 'BACKUP',
  'Endpoint Backup': 'BACKUP',
  'Email Filter': 'EMAIL_SECURITY',
};

/**
 * Fetch all team members and cache their names
 */
async function loadTeamMemberCache(): Promise<void> {
  const config = await getNotionConfig();
  
  if (!config.teamDbId) {
    return;
  }

  teamMemberCache = new Map();
  
  let hasMore = true;
  let nextCursor: string | null = null;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (nextCursor) body.start_cursor = nextCursor;

    const response = await fetch(
      `https://api.notion.com/v1/databases/${config.teamDbId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    
    for (const page of data.results) {
      let name: string | null = null;
      let email: string | null = null;

      for (const [propName, prop] of Object.entries(page.properties)) {
        const p = prop as any;
        if (p.type === 'title' && p.title?.[0]?.plain_text) {
          name = p.title[0].plain_text;
        }
        if (p.type === 'email' && p.email) {
          email = p.email;
        }
        // Fallback: if property name includes 'email' and is rich_text or title, grab text
        if (!email && /email/i.test(propName)) {
          if (p.type === 'rich_text' && p.rich_text?.[0]?.plain_text) {
            email = p.rich_text[0].plain_text;
          }
          if (p.type === 'title' && p.title?.[0]?.plain_text) {
            email = p.title[0].plain_text;
          }
        }
      }

      teamMemberCache.set(page.id, { name, email });
    }

    hasMore = data.has_more;
    nextCursor = data.next_cursor;
  }
}

/**
 * Fetch all vendors and cache their names
 */
async function loadVendorCache(): Promise<void> {
  const config = await getNotionConfig();
  const VENDORS_DB = process.env.NOTION_VENDORS_DATABASE_ID; // Still using env for vendors (not in integration settings yet)
  
  if (!VENDORS_DB) {
    return;
  }

  vendorCache = new Map();
  
  let hasMore = true;
  let nextCursor: string | null = null;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (nextCursor) body.start_cursor = nextCursor;

    const response = await fetch(
      `https://api.notion.com/v1/databases/${VENDORS_DB}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    
    for (const page of data.results) {
      // Find the Name/Vendor property (title)
      for (const [, prop] of Object.entries(page.properties)) {
        const p = prop as any;
        if (p.type === 'title' && p.title?.[0]?.plain_text) {
          vendorCache.set(page.id, p.title[0].plain_text);
          break;
        }
      }
    }

    hasMore = data.has_more;
    nextCursor = data.next_cursor;
  }
}

/**
 * Get vendor name from cache by page ID
 */
function getVendorName(pageId: string): string | null {
  return vendorCache.get(pageId) || null;
}

/**
 * Get vendor names for multiple relation IDs
 */
function getVendorNames(relationIds: string[]): string[] {
  return relationIds
    .map(id => getVendorName(id))
    .filter((name): name is string => name !== null);
}

/**
 * Get team member contact from cache by page ID
 */
function getTeamMemberContact(pageId: string): { name: string | null; email: string | null } | null {
  return teamMemberCache.get(pageId) || null;
}

/**
 * Get contacts for multiple relation IDs
 */
function getTeamMemberContacts(relationIds: string[]): { name: string | null; email: string | null }[] {
  return relationIds
    .map(id => getTeamMemberContact(id))
    .filter((c): c is { name: string | null; email: string | null } => !!c);
}

function getTeamMemberNames(relationIds: string[]): string[] {
  return getTeamMemberContacts(relationIds)
    .map(c => c.name)
    .filter((name): name is string => name !== null);
}

/**
 * Map Notion status to our ClientStatus enum
 */
function mapNotionStatus(notionStatus: string | null): ClientStatus {
  if (!notionStatus) return 'ACTIVE';
  
  const statusMap: Record<string, ClientStatus> = {
    'active': 'ACTIVE',
    'new - active': 'ACTIVE',
    'exiting': 'OFFBOARDING',
    'on-hold due to no payment': 'ON_HOLD',
    'ip closing': 'OFFBOARDING',
    'as needed': 'AS_NEEDED',
    'deactivate': 'INACTIVE',
  };

  const normalized = notionStatus.toLowerCase();
  return statusMap[normalized] || 'ACTIVE';
}

/**
 * Map Notion IT Syncs frequency to CheckCadence
 */
function mapCadence(frequency: string | null): CheckCadence {
  if (!frequency) return 'MONTHLY';
  
  const cadenceMap: Record<string, CheckCadence> = {
    'weekly': 'WEEKLY',
    'bi-weekly': 'BIWEEKLY',
    'biweekly': 'BIWEEKLY',
    'monthly': 'MONTHLY',
    'adhoc': 'ADHOC',
    'not needed': 'ADHOC',
  };

  const normalized = frequency.toLowerCase();
  return cadenceMap[normalized] || 'MONTHLY';
}

/**
 * Map Priority
 */
function mapPriority(priority: string | null): Priority | null {
  if (!priority) return null;
  
  const priorityMap: Record<string, Priority> = {
    'p1': 'P1',
    'p2': 'P2',
    'p3': 'P3',
    'p4': 'P4',
  };

  return priorityMap[priority.toLowerCase()] || null;
}

/**
 * Extract system vendor names from Notion page
 */
function extractSystemVendorsFromPage(page: NotionPage): string[] {
  const props = page.properties;
  const vendorNames: string[] = [];
  
  for (const [columnName] of Object.entries(SYSTEM_RELATION_COLUMNS)) {
    const relationIds = getPropertyValue(props[columnName]) || [];
    const names = getVendorNames(relationIds);
    vendorNames.push(...names);
  }
  
  return Array.from(new Set(vendorNames)); // Deduplicate
}

/**
 * Link systems to a client based on vendor names
 */
async function linkSystemsToClient(clientId: string, vendorNames: string[]): Promise<number> {
  if (vendorNames.length === 0) return 0;
  
  // Get all systems from our database
  const allSystems = await prisma.system.findMany({
    select: { id: true, name: true },
  });
  
  // Create a map for case-insensitive matching
  const systemMap = new Map<string, string>();
  for (const system of allSystems) {
    systemMap.set(system.name.toLowerCase(), system.id);
  }
  
  // Common name mappings (Notion vendor name -> Our system name)
  // This handles variations in naming between Notion and our Systems database
  const nameAliases: Record<string, string> = {
    // Identity / IDP
    'google workspace': 'Google Workspace',
    'google': 'Google Workspace',
    'okta': 'Okta',
    'azure ad': 'Azure AD',
    'azure': 'Azure AD',
    'entra id': 'Azure AD',
    'microsoft entra id': 'Azure AD',
    'jumpcloud': 'JumpCloud',
    'onelogin': 'OneLogin',
    
    // MDM
    'kandji': 'Kandji',
    'addigy': 'Addigy',
    'jamf': 'Jamf',
    'intune': 'Intune',
    'microsoft intune': 'Intune',
    'hexnode': 'Hexnode',
    'mosyle': 'Mosyle',
    'simplemdm': 'SimpleMDM',
    'mobileiron': 'MobileIron',
    'ibm maas360': 'IBM MaaS360',
    'maas360': 'IBM MaaS360',
    'scalefusion': 'Scalefusion',
    'miradore': 'Miradore',
    'workspace one': 'Workspace One',
    'vmware workspace one': 'Workspace One',
    'apple business essentials': 'Apple Business Essentials',
    
    // AV/EDR
    'crowdstrike': 'CrowdStrike',
    'sophos': 'Sophos',
    'sentinelone': 'SentinelOne',
    'huntress': 'Huntress',
    'windows defender': 'Windows Defender',
    'microsoft defender': 'Microsoft Defender',
    'defender': 'Windows Defender',
    'malwarebytes': 'Malwarebytes',
    'arctic wolf': 'Arctic Wolf',
    'cylance': 'Cylance',
    'trend micro': 'Trend Micro',
    'webroot': 'Webroot',
    'norton': 'Norton',
    'eset': 'ESET',
    'bitdefender': 'Bitdefender',
    'avira': 'Avira',
    'cortex': 'Cortex',
    'covalence': 'Covalence',
    
    // Password Manager
    '1password': '1Password',
    'bitwarden': 'Bitwarden',
    'lastpass': 'LastPass',
    'dashlane': 'Dashlane',
    'keeper': 'Keeper',
    
    // GRC
    'vanta': 'Vanta',
    'drata': 'Drata',
    'secureframe': 'Secureframe',
    'sprinto': 'Sprinto',
    'thoropass': 'Thoropass',
    'hyperproof': 'Hyperproof',
    'apptega': 'Apptega',
    'onetrust': 'OneTrust',
    'delve': 'Delve',
    
    // Security Training
    'knowbe4': 'KnowBe4',
    'curricula': 'Curricula',
    'ninjio': 'Ninjio',
    'easyllama': 'EasyLlama',
    'bullphish': 'Bullphish',
    
    // Backup
    'backupify': 'Backupify',
    'spanning': 'Spanning',
    'cloudally': 'CloudAlly',
    'dropsuite': 'Dropsuite',
    'spinone': 'SpinOne',
    'backblaze': 'Backblaze',
    
    // Email Security
    'abnormal': 'Abnormal Security',
    'abnormal security': 'Abnormal Security',
    'proofpoint': 'Proofpoint',
    'checkpoint harmony email & collaboration': 'CheckPoint Harmony',
    'checkpoint harmony': 'CheckPoint Harmony',
    'valimail': 'Valimail',
    'cisco umbrella': 'Cisco Umbrella',
    'umbrella': 'Cisco Umbrella',
    'dnsfilter': 'DNSFilter',
  };
  
  let linkedCount = 0;
  
  for (const vendorName of vendorNames) {
    // Try direct match first
    let systemId = systemMap.get(vendorName.toLowerCase());
    
    // Try alias mapping
    if (!systemId) {
      const aliasKey = vendorName.toLowerCase();
      const mappedName = nameAliases[aliasKey];
      if (mappedName) {
        systemId = systemMap.get(mappedName.toLowerCase());
      }
    }
    
    if (systemId) {
      try {
        // Upsert the client-system link
        await prisma.clientSystem.upsert({
          where: {
            clientId_systemId: { clientId, systemId },
          },
          create: { clientId, systemId },
          update: {}, // No update needed, just ensure it exists
        });
        linkedCount++;
      } catch (error) {
        // Ignore errors (e.g., if already exists)
      }
    }
  }
  
  return linkedCount;
}

/**
 * Transform Notion page to client data (uses cached team member names)
 */
async function transformNotionPageToClient(page: NotionPage) {
  const props = page.properties;
  
  // Get engineer names from relations using cache
        const seRelations = getPropertyValue(props['SE']) || [];
        const primaryConsultantRelations = getPropertyValue(props['Primary Consultant']) || [];
        const secondariesRelations = getPropertyValue(props['Secondaries']) || [];
        const grceRelations = getPropertyValue(props['GRCE']) || [];
        const itManagerPeople = getPropertyValue(props['IT Manager']) || [];
  
  // Get names from cache (instant lookup)
  const seNames = getTeamMemberNames(seRelations);
  const primaryNames = getTeamMemberNames(primaryConsultantRelations);
  const secondaryNames = getTeamMemberNames(secondariesRelations);
  const grceNames = getTeamMemberNames(grceRelations);
  
  return {
    notionPageId: page.id,
    name: getPropertyValue(props['Client']) || 'Unknown Client',
    status: mapNotionStatus(getPropertyValue(props['Status'])),
    priority: mapPriority(getPropertyValue(props['Priority'])),
    
    // Engineer Assignments (from Notion relations)
    systemEngineerName: seNames[0] || null,
    primaryConsultantName: primaryNames[0] || null,
    secondaryConsultantNames: secondaryNames,
    itManagerName: itManagerPeople[0]?.name || null,
    grceEngineerName: grceNames[0] || null,
    
    // Contact & Location
    pocEmail: getPropertyValue(props['POC Email']),
    officeAddress: getPropertyValue(props['Office Address']),
    
    // Service Levels
    hoursPerMonth: getPropertyValue(props['HPM']),
    itSyncsFrequency: getPropertyValue(props['IT Syncs']),
    onsitesFrequency: getPropertyValue(props['Onsites']),
    defaultCadence: mapCadence(getPropertyValue(props['IT Syncs'])),
    
    // Security & Compliance
    complianceFrameworks: await getComplianceFrameworks(props['Compliance']),
    dmarc: getPropertyValue(props['DMARC']),
    accessRequests: getPropertyValue(props['Access Requests']),
    userAccessReviews: getPropertyValue(props['User Access Reviews']),
    acceptedPasswordPolicy: getPropertyValue(props['Accepted Password Policy?']),
    
    // Teams & HR
    teams: getPropertyValue(props['Team(s)']) || [],
    hrProcesses: getPropertyValue(props['HR Processes']) || [],
    policies: getPropertyValue(props['Policies']) || [],
    
    // URLs
    itGlueUrl: getPropertyValue(props['IT Glue']),
    zendeskUrl: getPropertyValue(props['Zendesk']),
    trelloUrl: getPropertyValue(props['Trello']),
    onePasswordUrl: getPropertyValue(props['1Password']),
    sharedDriveUrl: getPropertyValue(props['Shared Drive']),
    websiteUrl: getPropertyValue(props['Website']),
    
    // Dates & Time
    startDate: getPropertyValue(props['Start Date']),
    estimation: getPropertyValue(props['Estimation']),
    
    // Metadata
    notionLastSynced: new Date(),
  };
}

/**
 * Sync all clients from Notion to our database
 */
export async function syncClientsFromNotion(): Promise<{
  synced: number;
  created: number;
  updated: number;
  systemsLinked: number;
  errors: string[];
}> {
  const result = {
    synced: 0,
    created: 0,
    updated: 0,
    systemsLinked: 0,
    errors: [] as string[],
  };

  try {
    
    // Load caches first
    await loadTeamMemberCache();
    await loadVendorCache();

    // Preload users for contact->id resolution (supports Notion email and name)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        notionTeamMemberName: true,
        email: true,
      },
    });

    const normalizeName = (s: string) =>
      s
        .toLowerCase()
        .replace(/\s*\(.*?\)\s*/g, ' ') // drop parenthetical like "(TL - SE)"
        .replace(/\s+/g, ' ')
        .trim();

    const resolveUserId = (name?: string | null, email?: string | null): string | null => {
      // Prefer email match (case-insensitive)
      if (email) {
        const targetEmail = email.trim().toLowerCase();
        const match = users.find(u => u.email && u.email.toLowerCase() === targetEmail);
        if (match) return match.id;
      }
      // Fall back to notionTeamMemberName exact (case-insensitive)
      if (name) {
        const targetRaw = name.trim();
        const targetNorm = normalizeName(targetRaw);
        if (targetNorm) {
          const match = users.find(
            (u) => u.notionTeamMemberName && normalizeName(u.notionTeamMemberName) === targetNorm
          );
          if (match) return match.id;
          const matchName = users.find(
            (u) => u.name && normalizeName(u.name) === targetNorm
          );
          if (matchName) return matchName.id;
        }
      }
      return null;
    };
    
    const notionPages = await fetchAllNotionClients();

    for (const page of notionPages) {
      try {
        // Extract relation IDs for assignments
        const seRelations = getPropertyValue(page.properties['SE']) || [];
        const primaryConsultantRelations = getPropertyValue(page.properties['Primary Consultant']) || [];
        const secondariesRelations = getPropertyValue(page.properties['Secondaries']) || [];
        const grceRelations = getPropertyValue(page.properties['GRCE']) || [];
        const itManagerPeople = getPropertyValue(page.properties['IT Manager']) || [];

        const clientData = await transformNotionPageToClient(page);
        
        // Check if client already exists (use findFirst since notionPageId is no longer unique)
        const existing = await prisma.client.findFirst({
          where: { notionPageId: page.id },
        });

        let client;
        if (existing) {
          // Update existing client (use id since notionPageId is no longer unique)
          client = await prisma.client.update({
            where: { id: existing.id },
            data: clientData,
          });
          result.updated++;
        } else {
          // Create new client
          client = await prisma.client.create({
            data: clientData,
          });
          result.created++;
        }

        // Resolve multi-assignments from Notion (multiple SE/GRCE/etc.)
        const seContacts = getTeamMemberContacts(seRelations);
        const primaryContacts = getTeamMemberContacts(primaryConsultantRelations);
        const secondaryContacts = getTeamMemberContacts(secondariesRelations);
        const grceContacts = getTeamMemberContacts(grceRelations);
        const itManagerContacts = getTeamMemberContacts(itManagerPeople);

        const assignments: { userId: string; role: ClientEngineerRole }[] = [];

        const addAssignments = (contacts: { name: string | null; email: string | null }[], role: ClientEngineerRole) => {
          for (const c of contacts) {
            const uid = resolveUserId(c.name ?? undefined, c.email ?? undefined);
            if (uid) assignments.push({ userId: uid, role });
          }
        };

        addAssignments(seContacts, ClientEngineerRole.SE);
        addAssignments(primaryContacts.slice(0, 1), ClientEngineerRole.PRIMARY); // keep primary as first only
        addAssignments(secondaryContacts, ClientEngineerRole.SECONDARY);
        addAssignments(grceContacts, ClientEngineerRole.GRCE);
        addAssignments(itManagerContacts, ClientEngineerRole.IT_MANAGER);

        // Fallback: also attempt to resolve by the stored names (in case relations missed emails)
        // BUT: Only use name fallback if email-based matching didn't find anyone for that role
        // AND: Only use name fallback if the name actually exists (not null/empty)
        const addNameAssignments = (names: (string | null | undefined)[], role: ClientEngineerRole) => {
          // Check if we already have assignments for this role from email-based matching
          const hasEmailBasedMatch = assignments.some(a => a.role === role);
          
          // Only use name fallback if:
          // 1. Email matching didn't find anyone for this role
          // 2. We have actual names to match (not null/empty)
          if (!hasEmailBasedMatch && names.some(n => n && n.trim())) {
            for (const n of names) {
              if (!n || !n.trim()) continue; // Skip null, undefined, or empty strings
              const uid = resolveUserId(n, undefined);
              if (uid) assignments.push({ userId: uid, role });
            }
          }
        };

        addNameAssignments([clientData.systemEngineerName], ClientEngineerRole.SE);
        addNameAssignments([clientData.primaryConsultantName], ClientEngineerRole.PRIMARY);
        addNameAssignments(clientData.secondaryConsultantNames || [], ClientEngineerRole.SECONDARY);
        addNameAssignments([clientData.grceEngineerName], ClientEngineerRole.GRCE);

        // Update legacy single-id fields for backward compatibility (only first)
        const assignmentUpdate: any = {};
        const firstSeId = assignments.find(a => a.role === ClientEngineerRole.SE)?.userId;
        const firstPrimaryId = assignments.find(a => a.role === ClientEngineerRole.PRIMARY)?.userId;
        const firstSecondaryId = assignments.find(a => a.role === ClientEngineerRole.SECONDARY)?.userId;
        const firstGrceId = assignments.find(a => a.role === ClientEngineerRole.GRCE)?.userId;
        if (firstSeId && (!client.systemEngineerId || client.systemEngineerId === firstSeId)) {
          assignmentUpdate.systemEngineerId = firstSeId;
          // Don't automatically set primaryEngineerId to SE - only set it if there's an actual Primary Consultant
        }
        if (firstPrimaryId && (!client.primaryEngineerId || client.primaryEngineerId === firstPrimaryId)) {
          assignmentUpdate.primaryEngineerId = firstPrimaryId;
        }
        if (firstSecondaryId && !client.secondaryEngineerId) {
          assignmentUpdate.secondaryEngineerId = firstSecondaryId;
        }
        if (firstGrceId && !client.grceEngineerId) {
          assignmentUpdate.grceEngineerId = firstGrceId;
        }

        if (Object.keys(assignmentUpdate).length > 0) {
          try {
            await prisma.client.update({
              where: { id: client.id },
              data: assignmentUpdate,
            });
          } catch (assignError: any) {
            result.errors.push(`Assign error for client ${client.id}: ${assignError.message}`);
          }
        }

        // Persist multi-assignments in dedicated table
        try {
          await prisma.clientEngineerAssignment.deleteMany({
            where: { clientId: client.id },
          });

          const uniqueKey = new Set<string>();
          const data = assignments.filter(a => {
            const key = `${client.id}:${a.userId}:${a.role}`;
            if (uniqueKey.has(key)) return false;
            uniqueKey.add(key);
            return true;
          }).map(a => ({
            clientId: client.id,
            userId: a.userId,
            role: a.role,
          }));

          if (data.length > 0) {
            await prisma.clientEngineerAssignment.createMany({
              data,
              skipDuplicates: true,
            });
          }
        } catch (assignTableError: any) {
          result.errors.push(`Assign table error for client ${client.id}: ${assignTableError.message}`);
        }
        
        // Extract and link systems from Notion vendor relations
        const vendorNames = extractSystemVendorsFromPage(page);
        if (vendorNames.length > 0) {
          const linked = await linkSystemsToClient(client.id, vendorNames);
          result.systemsLinked += linked;
        }
        
        // Look up trust center from TrustLists API
        if (clientData.websiteUrl) {
          try {
            const trustCenter = await lookupTrustCenter(clientData.websiteUrl);
            if (trustCenter.found) {
              await prisma.client.update({
                where: { id: client.id },
                data: {
                  trustCenterUrl: trustCenter.trustCenterUrl,
                  trustCenterPlatform: trustCenter.platform,
                },
              });
            }
          } catch (error) {
            // Silently fail trust center lookup - don't block the sync
            console.error(`Failed to lookup trust center for ${client.name}:`, error);
          }
        }
        
        result.synced++;
        
        // Log progress every 10 clients
      } catch (error: any) {
        const clientName = getPropertyValue(page.properties['Client']) || page.id;
        result.errors.push(`Error syncing "${clientName}": ${error.message}`);
      }
    }
    
  } catch (error: any) {
    result.errors.push(`Sync failed: ${error.message}`);
  }

  // Invalidate team cache so counts refresh after sync
  try {
    await invalidateTeamCache();
  } catch (cacheError) {
    result.errors.push(`Cache invalidate error: ${(cacheError as any).message}`);
  }

  return result;
}

/**
 * Get sync status
 */
export async function getNotionSyncStatus() {
  const config = await getNotionConfig();
  
  const totalClients = await prisma.client.count();
  const syncedClients = await prisma.client.count({
    where: { notionPageId: { not: null } },
  });
  const lastSync = await prisma.client.findFirst({
    where: { notionLastSynced: { not: null } },
    orderBy: { notionLastSynced: 'desc' },
    select: { notionLastSynced: true },
  });

  return {
    totalClients,
    syncedClients,
    lastSyncedAt: lastSync?.notionLastSynced || null,
    notionDatabaseId: config.clientDbId,
    isConfigured: !!config.apiKey && !!config.clientDbId,
  };
}

/**
 * Sync a single client by Notion page ID
 */
export async function syncSingleClient(notionPageId: string) {
  const config = await getNotionConfig();
  
  if (!config.apiKey) {
    throw new Error('Notion API key not configured');
  }
  
  // Load caches for team member and vendor lookups
  await loadTeamMemberCache();
  await loadVendorCache();
  
  const response = await fetch(
    `https://api.notion.com/v1/pages/${notionPageId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Notion API error: ${error.message}`);
  }

  const page = await response.json();
  const clientData = await transformNotionPageToClient(page);

  const existing = await prisma.client.findFirst({
    where: { notionPageId },
  });

  let client;
  if (existing) {
    client = await prisma.client.update({
      where: { id: existing.id },
      data: clientData,
    });
  } else {
    client = await prisma.client.create({
      data: clientData,
    });
  }
  
  // Extract and link systems from Notion vendor relations
  const vendorNames = extractSystemVendorsFromPage(page);
  let systemsLinked = 0;
  if (vendorNames.length > 0) {
    systemsLinked = await linkSystemsToClient(client.id, vendorNames);
  }
  
  // Look up trust center from TrustLists API
  let trustCenterFound = false;
  if (clientData.websiteUrl) {
    const trustCenter = await lookupTrustCenter(clientData.websiteUrl);
    if (trustCenter.found) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          trustCenterUrl: trustCenter.trustCenterUrl,
          trustCenterPlatform: trustCenter.platform,
        },
      });
      trustCenterFound = true;
    }
  }
  
  return {
    client,
    trustCenterFound,
    systemsLinked,
    isNew: !existing,
  };
}

