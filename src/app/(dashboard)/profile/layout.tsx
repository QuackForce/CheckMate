import { Header } from '@/components/layout/header'
import { ProfileNav } from '@/components/profile/profile-nav'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header
        title="Profile Settings"
        subtitle="Your personal preferences and integrations"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <ProfileNav />
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </>
  )
}

