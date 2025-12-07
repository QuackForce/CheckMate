import { Header } from '@/components/layout/header'
import { SettingsNav } from '@/components/settings/settings-nav'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header
        title="Settings"
        subtitle="Configure systems, integrations, and application settings"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <SettingsNav />
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </>
  )
}




