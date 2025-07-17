import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ChessBoard from '@/components/chess-board';
import { socketService } from '@/services/socket';
import { getLocalNetworkInfo } from '@/utils/network';
import { getCurrentUser } from '@/services/auth';
import { ShootingStars } from '@/components/ui/shooting-stars';
import { StarsBackground } from '@/components/ui/stars-background';
import { LoaderFive } from '@/components/ui/loader';

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
        <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <ShootingStars />
            <StarsBackground />
            
            {/* Leave button in top-left corner */}
            <button
                onClick={handleLeaveGame}
                className="absolute top-4 left-4 z-20 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-white/20"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Leave Game
            </button>
            
            <div className="relative z-10 flex flex-col items-center">
            
            {linkCopied && (
                <div className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg mb-4 border border-white/20">
                    Game link copied to clipboard! Share it with your opponent.
                </div>
            )}
            
            {showNetworkInfo && (
                <div className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg mb-4 max-w-2xl border border-white/20">
                    <p className="font-bold mb-1">For local network play:</p>
                    <p className="text-sm">{getLocalNetworkInfo().instructions}</p>
                    <p className="text-sm mt-1">Replace "localhost" in the URL with your IP address.</p>
                </div>
            )}
            
            {waitingForOpponent && playerColor === 'white' && (
                <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-lg mb-4 border border-white/20 flex items-center justify-center">
                    <LoaderFive text="Waiting for opponent to join..." />
                </div>
            )}
            
                <ChessBoard 
                    playerColor={playerColor}
                    gameId={gameId}
                    waitingForOpponent={waitingForOpponent}
                    gameState={gameState}
                />
            </div>
        </div>
    );
}

export default Play;