import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const session = await auth()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-gradient-radial from-brand-500/10 via-transparent to-transparent blur-3xl" />

      {/* Header */}
      <header className="relative z-10 border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">CheckMate</span>
          </div>
          <Link
            href="/login"
            className="btn-primary"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight animate-fade-in">
              Infrastructure Checks,{' '}
              <span className="text-gradient">Simplified</span>
            </h1>
            <p className="text-xl text-surface-400 mb-8 animate-slide-up">
              Streamline your monthly infrastructure reviews. Schedule checks,
              track progress, and keep your clients informed — all in one place.
            </p>
            <div className="flex flex-wrap gap-4 animate-slide-up animation-delay-200">
              <Link href="/login" className="btn-primary text-lg px-6 py-3">
                Get Started
              </Link>
              <a
                href="#features"
                className="btn-secondary text-lg px-6 py-3"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="relative z-10 border-t border-surface-800 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Everything you need to manage infra checks
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '📅',
                title: 'Smart Scheduling',
                description:
                  'Schedule checks with flexible cadence options. Integrates with Google Calendar for seamless coordination.',
              },
              {
                icon: '✅',
                title: 'Structured Checklists',
                description:
                  'Pre-built templates for Okta, Gmail, Jamf, CrowdStrike, and Vanta. Customize to your needs.',
              },
              {
                icon: '💬',
                title: 'Slack Integration',
                description:
                  'Post check results directly to client Slack channels with one click. Keep everyone in the loop.',
              },
              {
                icon: '⏱️',
                title: 'Time Tracking',
                description:
                  'Built-in timer with Harvest integration. Track time without leaving the app.',
              },
              {
                icon: '👥',
                title: 'Team Overview',
                description:
                  'Dashboard showing team workload, overdue checks, and completion rates at a glance.',
              },
              {
                icon: '🔄',
                title: 'Notion Sync',
                description:
                  'Keep your client database in sync with Notion. Single source of truth for client data.',
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="card p-6 animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-surface-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-800 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-surface-500 text-sm">
          © {new Date().getFullYear()} Jones IT. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

