import { redirect } from 'next/navigation'

// Internal app - redirect to dashboard (auth will handle login redirect if needed)
export default function HomePage() {
  redirect('/dashboard')
}
