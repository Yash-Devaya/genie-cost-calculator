'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // REMOVE THESE TWO LINES - They don't belong in login page!
  // const params = useParams();
  // const productId = params.productId;

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else if (result?.ok) {
        // Redirect directly to products page
        router.push('/products');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
      setLoading(false);
    }
  };

  const handleAzureLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      await signIn('azure-ad', {
        callbackUrl: '/products',
      });
    } catch (err) {
      console.error('Azure login error:', err);
      setError('An error occurred during Azure login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl"></div>
            <span className="text-3xl font-bold text-white">Genie</span>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#0f0f0f] rounded-2xl border border-gray-800 p-8 shadow-2xl">
          {/* Azure AD Login Button */}
          <button
            onClick={handleAzureLogin}
            disabled={loading}
            className="w-full mb-6 px-6 py-3 bg-white hover:bg-gray-100 disabled:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-all shadow-md flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
              <path d="M0 0h10.931v10.931H0V0z" fill="#f25022"/>
              <path d="M12.069 0H23v10.931H12.069V0z" fill="#7fba00"/>
              <path d="M0 12.069h10.931V23H0V12.069z" fill="#00a4ef"/>
              <path d="M12.069 12.069H23V23H12.069V12.069z" fill="#ffb900"/>
            </svg>
            {loading ? 'Signing in...' : 'Sign in with Microsoft'}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0f0f0f] text-gray-400">Or continue with</span>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsLogin} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 animate-fadeIn">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-purple-500/50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center mb-3">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700">
                <p className="text-gray-400 mb-1">Admin</p>
                <p className="text-white font-mono">admin / admin123</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700">
                <p className="text-gray-400 mb-1">User</p>
                <p className="text-white font-mono">user / user123</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}