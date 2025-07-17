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
        <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">
                {isLogin ? 'Login' : 'Register'}
            </h2>
      
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-2">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter username"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter password"
                    />
                    {!isLogin && (
                        <p className="text-xs text-gray-500 mt-1">
                            ⚠️ This is not a serious site. Please do not use a real password
                        </p>
                    )}
                </div>

                {error && (
                    <div className="text-red-600 text-sm">{error}</div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="text-sm text-blue-600 hover:underline"
                >
                    {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
                </button>
            </div>
        </div>
    );
}