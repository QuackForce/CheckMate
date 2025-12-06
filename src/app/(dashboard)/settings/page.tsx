import { redirect } from 'next/navigation'

// Redirect to systems page by default
export default function SettingsPage() {
  redirect('/settings/systems')
}

