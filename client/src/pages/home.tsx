import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthForm } from '@/components/auth-form';
import { getCurrentUser, logout } from '@/services/auth';
import { ShootingStars } from '@/components/ui/shooting-stars';
import { StarsBackground } from '@/components/ui/stars-background';

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
        <div className="min-h-screen relative bg-[#0a0a0a] text-[#f5f5f5] overflow-hidden">
            <ShootingStars />
            <StarsBackground />
            <div className="relative z-10 p-8">
                <div className="text-center">
                    <h1 className="text-5xl md:text-7xl font-bold mb-2 bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] selection:bg-transparent">
                        Appear Chess Arena
                    </h1>
                    <p className="text-gray-400 mb-8 text-lg">¯\_(ツ)_/¯</p>
                
                    {user.username ? (
                        <div className="space-y-4">
                            <div className="mb-6">
                                <p className="text-xl">Welcome, <span className="font-bold text-white">{user.username?.toUpperCase()}</span></p>
                                <p className="text-sm text-gray-500">Elo: {user.elo}</p>
                            </div>
                            <button
                                onClick={createGame}
                                className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                            >
                                Create Game
                            </button>
                            <div>
                                <button
                                    onClick={handleLogout}
                                    className="text-sm text-gray-500 hover:text-gray-300 underline transition-colors"
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
        </div>
    );
}

export default Home;