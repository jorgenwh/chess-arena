import { useState } from 'react';
import { register, login } from '@/services/auth';

interface AuthFormProps {
  onSuccess: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = isLogin
            ? await login(username, password)
            : await register(username, password);

        setLoading(false);

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error || 'An error occurred');
        }
    };

    return (
        <div className="max-w-md mx-auto p-8 bg-[#1a1a1a] rounded-lg shadow-[0_0_40px_rgba(255,255,255,0.1)] border border-gray-800">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
                {isLogin ? 'Login' : 'Register'}
            </h2>
      
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-2 text-gray-300">
                        Username
                    </label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        minLength={3}
                        maxLength={20}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-gray-500"
                        placeholder="Enter username"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-300">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={1}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-gray-500"
                        placeholder="Enter password"
                    />
                    {!isLogin && (
                        <p className="text-xs text-gray-600 mt-1">
                            ⚠️ This is not a serious site. Please do not use a real password
                        </p>
                    )}
                </div>

                {error && (
                    <div className="text-red-400 text-sm">{error}</div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-white text-black font-medium rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]"
                >
                    {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
                </button>
            </form>

            <div className="mt-4 text-center">
                <button
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                    }}
                    className="text-sm text-gray-400 hover:text-white hover:underline transition-colors"
                >
                    {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
                </button>
            </div>
        </div>
    );
}