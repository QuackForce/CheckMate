import { auth, signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// Check if Google OAuth is configured (supports both naming conventions)
const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET
const hasGoogleAuth = googleClientId && 
  googleClientId !== 'placeholder' &&
  googleClientSecret &&
  googleClientSecret !== 'placeholder'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; [key: string]: string | string[] | undefined }
}) {
  const session = await auth()
  
  if (session) {
    redirect('/dashboard')
  }

  const error = searchParams.error

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-brand-500/10 via-transparent to-transparent blur-3xl" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center mb-6">
            <Image
              src="/jonesit_transparent.png"
              alt="CheckMate Logo"
              width={80}
              height={80}
              className="rounded-xl"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            CheckMate
          </h1>
          <p className="text-surface-400">
            Streamlined infrastructure monitoring for your clients
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-900/50 backdrop-blur-xl border border-surface-700/50 rounded-2xl p-8 shadow-2xl animate-slide-up">
          {hasGoogleAuth ? (
            <>
              <h2 className="text-xl font-semibold text-white mb-6 text-center">
                Sign in to continue
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 text-center">
                    {error === 'Configuration' && 'Authentication configuration error. Please contact support.'}
                    {error === 'AccessDenied' && 'Access denied. Your email domain may not be allowed.'}
                    {error === 'Verification' && 'Verification error. Please try again.'}
                    {!['Configuration', 'AccessDenied', 'Verification'].includes(error) && `Login error: ${error}`}
                  </p>
                </div>
              )}

              <form
                action={async () => {
                  'use server'
                  await signIn('google', { redirectTo: '/dashboard' })
                }}
              >
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-surface-700/50">
                <p className="text-sm text-surface-400 text-center">
                  By signing in, you agree to access company resources.
                  <br />
                  Only authorized personnel may sign in.
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-4 text-center">
                🔧 Setup Required
              </h2>
              <p className="text-surface-400 text-sm mb-4 text-center">
                Google OAuth is not configured yet. Follow these steps:
              </p>
              <ol className="text-surface-400 text-sm space-y-2 mb-6">
                <li>1. Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Google Cloud Console</a></li>
                <li>2. Create OAuth 2.0 credentials</li>
                <li>3. Add redirect URI: <code className="bg-surface-800 px-1.5 py-0.5 rounded text-xs">http://localhost:3000/api/auth/callback/google</code></li>
                <li>4. Add to your <code className="bg-surface-800 px-1.5 py-0.5 rounded text-xs">.env</code> file:</li>
              </ol>
              <div className="bg-surface-800 rounded-lg p-3 text-xs font-mono text-surface-300 overflow-x-auto mb-6">
                <pre>{`GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000`}</pre>
              </div>
              <Link
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-700 hover:bg-surface-600 text-white font-medium rounded-xl transition-colors"
              >
                Continue as Guest (Demo Mode)
              </Link>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-surface-500 text-sm mt-8">
          © {new Date().getFullYear()} Jones IT. All rights reserved.
        </p>
      </div>
    </div>
  )
}

