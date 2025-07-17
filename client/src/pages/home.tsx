

import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();

    const createGame = () => {
        // Generate a unique game ID
        const gameId = Math.random().toString(36).substring(2, 15);
        navigate(`/play/${gameId}`);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-2">Chess Arena</h1>
                <p className="text-gray-400 mb-8">¯\_(ツ)_/¯</p>
                <button
                    onClick={createGame}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                    Create Game
                </button>
            </div>
        </div>
    );
}

export default Home;