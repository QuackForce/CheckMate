# CheckMate

A modern internal application for managing infrastructure checks for IT managed services clients.

## Features

- 📅 **Smart Scheduling** - Schedule checks with flexible cadence (weekly, bi-weekly, monthly, bi-monthly, quarterly, ad-hoc, custom)
- ✅ **Structured Checklists** - Systems database with customizable check items for Okta, Gmail, Jamf, CrowdStrike, Vanta, and more
- 💬 **Slack Integration** - Post check results directly to client Slack channels with formatted reports and @mentions
- ⏱️ **Time Tracking** - Built-in timer with full Harvest integration (start, pause, resume, stop, sync)
- 📆 **Google Calendar** - Auto-create calendar events for scheduled checks, update on reschedule
- 👥 **Team Management** - Dashboard showing workload, performance metrics, and team assignments
- 🔄 **Notion Sync** - Bi-directional sync with Notion client database (with conflict resolution)
- 📊 **Reports** - View completed checks with statistics and findings summaries
- 🔍 **DMARC Lookup** - Automatic DMARC record checking for client domains
- 🎯 **Client Systems** - Manage systems and check items, link to clients
- 🔐 **Role-Based Access** - Admin, IT Engineer, and Viewer roles with appropriate permissions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Prisma)
- **Authentication**: NextAuth.js with Google OAuth
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React, React Icons

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud like Supabase)
- Google OAuth credentials

### 1. Clone and Install

```bash
git clone https://github.com/QuackForce/CheckMate.git
cd CheckMate
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database (Supabase PostgreSQL or any PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# NextAuth.js - Generate with: openssl rand -base64 32
AUTH_SECRET="your-auth-secret-here"

# Google OAuth (for authentication)
# Get these from: https://console.cloud.google.com/apis/credentials
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# App URL
NEXTAUTH_URL="http://localhost:3000"
```

**Note**: Integration API keys (Notion, Slack, Harvest, Google Calendar) are now stored in the database via Settings > Integrations, not in environment variables.

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
5. Copy Client ID and Client Secret to your `.env`

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── clients/       # Client management
│   │   ├── checks/        # Infrastructure checks
│   │   ├── schedule/      # Scheduling calendar
│   │   ├── reports/       # Check reports
│   │   ├── team/          # Team management
│   │   └── settings/      # Settings & integrations
│   ├── api/               # API routes
│   │   ├── checks/        # Check CRUD operations
│   │   ├── clients/       # Client management
│   │   ├── integrations/  # Integration configs
│   │   ├── slack/         # Slack API
│   │   ├── harvest/       # Harvest API
│   │   ├── calendar/      # Google Calendar API
│   │   └── users/         # User management
│   └── login/             # Authentication
├── components/            # React components
│   ├── layout/           # Layout components (sidebar, header)
│   ├── dashboard/        # Dashboard widgets
│   ├── clients/        # Client-related components
│   ├── checks/           # Check execution components
│   ├── schedule/         # Scheduling components
│   ├── reports/          # Report components
│   ├── team/             # Team components
│   └── ui/               # Reusable UI components
├── lib/                  # Utilities and configurations
│   ├── auth.ts          # NextAuth configuration
│   ├── db.ts            # Prisma client
│   ├── integrations.ts  # Integration config helper
│   ├── notion.ts        # Notion API client
│   ├── dmarc.ts         # DMARC lookup utility
│   └── utils.ts         # Helper functions
└── types/               # TypeScript type definitions
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, manage users, configure integrations, sync Notion, manage systems |
| **IT Engineer** | Create/complete checks, schedule, post to Slack, track time, view reports |
| **Viewer** | View dashboard, clients, checks, and reports (read-only) |

## Integrations

### ✅ Notion (Implemented)
- **Bi-directional sync** with Notion client database
- Sync team members from Notion
- Conflict resolution when data differs
- Configurable via Settings > Integrations

### ✅ Slack (Implemented)
- **Org-wide integration** - Configured by admins
- Post formatted check results to client channels
- @here mentions and @mentions for assigned engineers
- Channel picker for connecting clients to Slack channels
- Auto-sync Slack usernames and user IDs for mentions

### ✅ Harvest (Implemented)
- **Per-user OAuth** - Each user connects their own account
- Built-in timer with start/pause/resume/stop
- Syncs with Harvest in real-time
- Project and task selection
- Manual time entry option
- Configured via Settings > My Integrations

### ✅ Google Calendar (Implemented)
- **Per-user OAuth** - Each user connects their own calendar
- Auto-create events when scheduling checks
- Update events when rescheduling
- Clickable calendar links on check pages
- Configured via Settings > My Integrations

## Key Features

### Systems Database
- Manage reusable systems (Okta, Gmail, Jamf, etc.)
- Define check items for each system
- Link systems to clients
- Track system source (App Created, Notion Imported, Preset)

### Client Management
- Sync from Notion or create manually
- Assign engineers (Primary, Secondary, SE, IT Manager, GRCE)
- Override infra check assignee per client
- DMARC record lookup and display
- Client logos via favicon service
- Website domain display

### Check Execution
- Auto-save with debounce
- Unsaved changes warning
- Add custom check items on the fly
- Mark categories as all good or issues found
- Time tracking integration
- Post to Slack with formatted reports

### Scheduling
- Interactive calendar view
- Click to view, right-click to reschedule
- Time picker for precise scheduling
- Google Calendar event creation
- Filter by status and date range

## Deployment

See `DEPLOYMENT_CHECKLIST.md` for a comprehensive pre-deployment checklist.

See `DEPLOYMENT_COSTS.md` for cost estimates for Vercel, Netlify, and Supabase.

### Quick Deploy to Vercel

1. Push your code to GitHub
2. Import repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with sample data
```

## Contributing

This is an internal tool for Jones IT. Contact the development team for access.

## License

Private - Jones IT Internal Use Only
