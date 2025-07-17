import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ChessBoard from '@/components/chess-board';
import { socketService } from '@/services/socket';
import { getLocalNetworkInfo } from '@/utils/network';
import { getCurrentUser } from '@/services/auth';

const Play = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const [linkCopied, setLinkCopied] = useState(false);
    const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
    const [waitingForOpponent, setWaitingForOpponent] = useState(true);
    const [gameState, setGameState] = useState<any>(null);
    const [showNetworkInfo, setShowNetworkInfo] = useState(false);

    useEffect(() => {
        if (!gameId) return;

        // Check if user is logged in
        const user = getCurrentUser();
        if (!user.username) {
            navigate('/');
            return;
        }

        // Connect to server
        const socket = socketService.connect();
        
        // Check if this is the game creator
        const isCreator = !sessionStorage.getItem(`joined-${gameId}`);
        if (isCreator) {
            copyGameLink();
        }
        sessionStorage.setItem(`joined-${gameId}`, 'true');

        // Join game with username
        socket.emit('join-game', { gameId, isCreator, username: user.username });

        // Handle server responses
        socket.on('game-joined', ({ color, gameState }) => {
            setPlayerColor(color);
            setGameState(gameState);
            setWaitingForOpponent(!gameState.whiteJoined || !gameState.blackJoined);
        });

        socket.on('game-started', (gameState) => {
            setGameState(gameState);
            setWaitingForOpponent(false);
        });

        socket.on('move-made', ({ gameState }) => {
            setGameState(gameState);
        });

        socket.on('join-error', ({ message }) => {
            console.error('Failed to join game:', message);
        });

        return () => {
            socket.off('game-joined');
            socket.off('game-started');
            socket.off('move-made');
            socket.off('join-error');
        };
    }, [gameId]);

    const copyGameLink = async () => {
        const gameUrl = `${window.location.origin}/play/${gameId}`;
        try {
            await navigator.clipboard.writeText(gameUrl);
            setLinkCopied(true);
            
            // Show network info if using localhost
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                setShowNetworkInfo(true);
            }
            
            setTimeout(() => {
                setLinkCopied(false);
                setShowNetworkInfo(false);
            }, 10000); // Show for 10 seconds
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const handleLeaveGame = () => {
        const socket = socketService.getSocket();
        if (socket && gameId) {
            // Notify server that player is leaving
            socket.emit('leave-game', { gameId });
        }
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 relative">
            {/* Leave button in top-left corner */}
            <button
                onClick={handleLeaveGame}
                className="absolute top-4 left-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Leave Game
            </button>
            
            <h1 className="text-3xl font-bold mb-4">Play Chess</h1>
            
            {linkCopied && (
                <div className="bg-green-600 text-white px-4 py-2 rounded mb-4">
                    Game link copied to clipboard! Share it with your opponent.
                </div>
            )}
            
            {showNetworkInfo && (
                <div className="bg-blue-600 text-white px-4 py-2 rounded mb-4 max-w-2xl">
                    <p className="font-bold mb-1">For local network play:</p>
                    <p className="text-sm">{getLocalNetworkInfo().instructions}</p>
                    <p className="text-sm mt-1">Replace "localhost" in the URL with your IP address.</p>
                </div>
            )}
            
            {waitingForOpponent && playerColor === 'white' && (
                <div className="bg-blue-600 text-white px-4 py-2 rounded mb-4">
                    Waiting for opponent to join...
                </div>
            )}
            
            <ChessBoard 
                playerColor={playerColor}
                gameId={gameId}
                waitingForOpponent={waitingForOpponent}
                gameState={gameState}
            />
        </div>
    );
}

export default Play;