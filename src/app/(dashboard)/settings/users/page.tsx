import { redirect } from 'next/navigation'

// Redirect to Team page - user management is now there
export default function UsersSettingsPage() {
  redirect('/team')
}
