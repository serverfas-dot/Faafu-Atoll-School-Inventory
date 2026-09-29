import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  function handleBackToPublic() {
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 sm:p-8 lg:p-10 relative">
        <button
          onClick={handleBackToPublic}
          className="absolute top-4 left-4 flex items-center gap-2 text-xs sm:text-sm text-slate-600 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Request Form</span>
          <span className="sm:hidden">Back</span>
        </button>

        <div className="flex items-center justify-center mb-6 sm:mb-8 mt-8 sm:mt-6">
          <img src="/png.png" alt="Faafu Atoll School" className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-full" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-center text-slate-800 mb-2">
          Faafu Atoll School
        </h1>
        <p className="text-center text-sm sm:text-base text-slate-600 mb-6 sm:mb-8">Stock Inventory System</p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
