'use client';
import { signIn } from '@/lib/auth-client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    'Google sign-in was denied. If this app is in test mode, ask the admin to add your email as a test user in Google Cloud Console.',
  redirect_uri_mismatch: 'OAuth redirect URI is not configured. Contact the admin.',
  invalid_client: 'OAuth client configuration error. Contact the admin.',
  user_already_exists: 'An account with this email already exists.',
};

function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const errParam = searchParams.get('error') || searchParams.get('error_description');
    if (errParam) {
      setError(ERROR_MESSAGES[errParam] ?? `Sign-in failed (${errParam}). Please try again.`);
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
      });
      // If we reach here, the redirect didn't happen — extract error
      const err = (result as { error?: { message?: string } } | null)?.error;
      if (err) {
        setError(err.message ?? 'Sign-in failed. Please try again.');
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="text-3xl">📊</div>
          <h1 className="text-xl font-bold text-gray-900">Retail Analytics</h1>
          <p className="text-sm text-gray-500">Sign in to access your dashboard</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <p className="text-xs text-center text-gray-400">
          First sign-in creates a Viewer account. Contact admin to upgrade to Admin.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
