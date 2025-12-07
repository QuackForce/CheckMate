import { redirect } from 'next/navigation'

// Redirect to new location under Profile Settings
export default function MyIntegrationsRedirect() {
  redirect('/profile/integrations')
}
