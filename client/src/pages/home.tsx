import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthForm } from '@/components/auth-form';
import { getCurrentUser, logout } from '@/services/auth';

const Home = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<{ username: string | null; elo: number; isAdmin: boolean }>({ username: null, elo: 1200, isAdmin: false });

    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        
        // Redirect admin to admin panel
        if (currentUser.isAdmin && currentUser.username) {
            navigate('/admin');
        }
    }, [navigate]);

    const createGame = () => {
        if (!user.username) {
            alert('Please login to create a game');
            return;
        }
        // Generate a unique game ID
        const gameId = Math.random().toString(36).substring(2, 15);
        navigate(`/play/${gameId}`);
    };

    const handleAuthSuccess = () => {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        
        // Redirect admin to admin panel
        if (currentUser.isAdmin) {
            navigate('/admin');
        }
    };

    const handleLogout = () => {
        logout();
        setUser({ username: null, elo: 1200, isAdmin: false });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-2">Appear Chess Arena</h1>
                <p className="text-gray-400 mb-8">¯\_(ツ)_/¯</p>
                
                {user.username ? (
                    <div className="space-y-4">
                        <div className="mb-6">
                            <p className="text-lg">Welcome, <span className="font-bold">{user.username?.toUpperCase()}</span></p>
                            <p className="text-sm text-gray-400">Elo: {user.elo}</p>
                        </div>
                        <button
                            onClick={createGame}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            Create Game
                        </button>
                        <div>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-gray-400 hover:text-gray-200 underline"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                ) : (
                    <AuthForm onSuccess={handleAuthSuccess} />
                )}
            </div>
        </div>
    );
}

export default Home;