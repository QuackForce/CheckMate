# CheckMate

A modern internal application for managing infrastructure checks for IT managed services clients.

![Dashboard Preview](docs/dashboard-preview.png)

## Features

- 📅 **Smart Scheduling** - Schedule checks with flexible cadence (weekly, bi-weekly, monthly, bi-monthly)
- ✅ **Structured Checklists** - Pre-built templates for Okta, Gmail, Jamf, CrowdStrike, and Vanta
- 💬 **Slack Integration** - Post check results directly to client Slack channels
- ⏱️ **Time Tracking** - Built-in timer with Harvest integration support
- 👥 **Team Management** - Dashboard showing workload and performance metrics
- 🔄 **Notion Sync** - Keep client database in sync with Notion (coming soon)
- 📊 **Reports** - View completed checks and generate reports

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Prisma)
- **Authentication**: NextAuth.js with Google OAuth
- **UI Components**: Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud like Supabase)
- Google OAuth credentials

### 1. Clone and Install

```bash
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

# Google OAuth
# Get these from: https://console.cloud.google.com/apis/credentials
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# App URL
NEXTAUTH_URL="http://localhost:3000"

# Optional: Integrations (add when ready)
# SLACK_BOT_TOKEN=""
# NOTION_API_KEY=""
# HARVEST_ACCESS_TOKEN=""
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to your `.env`

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
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
│   │   └── team/          # Team management
│   ├── api/               # API routes
│   └── login/             # Authentication
├── components/            # React components
│   ├── layout/           # Layout components (sidebar, header)
│   ├── dashboard/        # Dashboard widgets
│   ├── clients/          # Client-related components
│   ├── checks/           # Check execution components
│   ├── schedule/         # Scheduling components
│   ├── reports/          # Report components
│   └── team/             # Team components
├── lib/                  # Utilities and configurations
│   ├── auth.ts          # NextAuth configuration
│   ├── db.ts            # Prisma client
│   └── utils.ts         # Helper functions
└── types/               # TypeScript type definitions
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, manage users, configure templates |
| **IT Engineer** | Create/complete checks, schedule, post to Slack |
| **Viewer** | View dashboard and reports only |

## Integrations

### Google Calendar (Planned)
- Auto-create calendar events for scheduled checks
- View engineer availability when scheduling
- Two-way sync (move event = reschedule check)

### Slack
- Post check results to client channels
- Customizable report templates
- One-click posting from completed checks

### Notion (Planned)
- Sync client database from Notion
- Keep client information up to date
- Webhook support for real-time sync

### Harvest (Planned)
- Built-in timer syncs to Harvest
- Auto-create time entries
- Link to client projects

## Contributing

This is an internal tool for Jones IT. Contact the development team for access.

## License

Private - Jones IT Internal Use Only

