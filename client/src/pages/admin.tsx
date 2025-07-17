import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '@/services/auth';
import { ShootingStars } from '@/components/ui/shooting-stars';
import { StarsBackground } from '@/components/ui/stars-background';

interface User {
    username: string;
    elo_rating: number;
}

const API_URL = 'http://10.10.52.28:3001';

const Admin = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingElo, setEditingElo] = useState<{ username: string; value: string } | null>(null);
    const [resettingPassword, setResettingPassword] = useState<{ username: string; value: string } | null>(null);

    useEffect(() => {
        // Check if user is admin
        const user = getCurrentUser();
        if (!user.isAdmin) {
            navigate('/');
            return;
        }

        fetchUsers();
    }, [navigate]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/users`);
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (username: string) => {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

        try {
            const response = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(username)}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                fetchUsers();
            } else {
                const errorData = await response.json();
                alert(`Failed to delete user: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Network error while deleting user');
        }
    };

    const updateElo = async (username: string) => {
        if (!editingElo || editingElo.username !== username) return;

        const newElo = parseInt(editingElo.value);
        if (isNaN(newElo) || newElo < 0) {
            alert('Invalid Elo rating');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(username)}/elo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ elo: newElo }),
            });

            if (response.ok) {
                setEditingElo(null);
                fetchUsers();
            }
        } catch (error) {
            console.error('Failed to update elo:', error);
        }
    };

    const resetPassword = async (username: string) => {
        if (!resettingPassword || resettingPassword.username !== username) return;

        if (resettingPassword.value.length < 1) {
            alert('Password cannot be empty');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(username)}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: resettingPassword.value }),
            });

            if (response.ok) {
                alert(`Password reset for ${username}`);
                setResettingPassword(null);
            }
        } catch (error) {
            console.error('Failed to reset password:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] p-8 relative overflow-hidden">
                <ShootingStars />
                <StarsBackground />
                <div className="text-center relative z-10">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] p-8 relative overflow-hidden">
            <ShootingStars />
            <StarsBackground />
            <div className="max-w-6xl mx-auto relative z-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={async () => {
                                if (!confirm('⚠️ WARNING: This will delete ALL users except admin. Are you sure?')) return;
                                
                                try {
                                    const response = await fetch(`${API_URL}/api/admin/clear-database`, {
                                        method: 'POST',
                                    });
                                    
                                    if (response.ok) {
                                        alert('Database cleared successfully');
                                        fetchUsers();
                                    } else {
                                        const error = await response.json();
                                        alert(`Failed to clear database: ${error.error}`);
                                    }
                                } catch (error) {
                                    console.error('Clear database error:', error);
                                    alert('Network error while clearing database');
                                }
                            }}
                            className="bg-red-600/20 backdrop-blur-sm hover:bg-red-600/30 text-red-300 border border-red-600/30 px-4 py-2 rounded-lg transition-all"
                        >
                            Clear Database
                        </button>
                        <button
                            onClick={() => {
                                logout();
                                navigate('/');
                            }}
                            className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-lg transition-all"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10">
                    <table className="w-full">
                        <thead className="bg-white/10">
                            <tr>
                                <th className="px-6 py-3 text-left">Username</th>
                                <th className="px-6 py-3 text-left">Elo Rating</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.username} className="border-t border-white/10">
                                    <td className="px-6 py-4 font-medium">
                                        {user.username}
                                        {user.username === 'admin' && (
                                            <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-1 rounded">ADMIN</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingElo?.username === user.username ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editingElo.value}
                                                    onChange={(e) => setEditingElo({ ...editingElo, value: e.target.value })}
                                                    className="bg-white/10 border border-white/20 px-2 py-1 rounded w-24 text-white"
                                                    min="0"
                                                />
                                                <button
                                                    onClick={() => updateElo(user.username)}
                                                    className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 px-2 py-1 rounded text-sm"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingElo(null)}
                                                    className="bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-1 rounded text-sm"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span>{user.elo_rating}</span>
                                                <button
                                                    onClick={() => setEditingElo({ username: user.username, value: user.elo_rating.toString() })}
                                                    className="text-gray-400 hover:text-white hover:underline text-sm transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {resettingPassword?.username === user.username ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="password"
                                                        value={resettingPassword.value}
                                                        onChange={(e) => setResettingPassword({ ...resettingPassword, value: e.target.value })}
                                                        placeholder="New password"
                                                        className="bg-white/10 border border-white/20 px-2 py-1 rounded text-white"
                                                    />
                                                    <button
                                                        onClick={() => resetPassword(user.username)}
                                                        className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 px-2 py-1 rounded text-sm"
                                                    >
                                                        Set
                                                    </button>
                                                    <button
                                                        onClick={() => setResettingPassword(null)}
                                                        className="bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-1 rounded text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setResettingPassword({ username: user.username, value: '' })}
                                                        className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded text-sm"
                                                    >
                                                        Reset Password
                                                    </button>
                                                    {user.username !== 'admin' && (
                                                        <button
                                                            onClick={() => deleteUser(user.username)}
                                                            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-1 rounded text-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 text-center text-gray-500">
                    Total users: {users.length}
                </div>
            </div>
        </div>
    );
};

export default Admin;