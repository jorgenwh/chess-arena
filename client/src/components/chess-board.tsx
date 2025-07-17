import { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
// @ts-ignore
import { Chess } from 'chess.js';
import { socketService } from '@/services/socket';
import Clock from './clock';

interface ChessBoardProps {
    playerColor?: 'white' | 'black';
    gameId?: string;
    waitingForOpponent?: boolean;
    gameState?: any;
}

const ChessBoard = ({ playerColor = 'white', gameId, waitingForOpponent = false, gameState }: ChessBoardProps) => {
    const [game, setGame] = useState(new Chess());
    const [gameStarted, setGameStarted] = useState(false);
    const [whiteTime, setWhiteTime] = useState(5 * 60 * 1000); // 5 minutes default
    const [blackTime, setBlackTime] = useState(5 * 60 * 1000); // 5 minutes default
    const [whiteIncrement, setWhiteIncrement] = useState(5 * 1000); // 5 seconds default
    const [blackIncrement, setBlackIncrement] = useState(5 * 1000); // 5 seconds default
    const [gameOverReason, setGameOverReason] = useState<string | null>(null);
    const [whiteUsername, setWhiteUsername] = useState<string>('White');
    const [blackUsername, setBlackUsername] = useState<string>('Black');
    const [whiteElo, setWhiteElo] = useState<number>(1200);
    const [blackElo, setBlackElo] = useState<number>(1200);

    useEffect(() => {
        // Update game when game state changes from server
        if (gameState && gameState.fen) {
            const newGame = new Chess(gameState.fen);
            setGame(newGame);
            setGameStarted(!waitingForOpponent);
            
            // Update clocks
            if (gameState.whiteTime !== undefined) {
                setWhiteTime(gameState.whiteTime);
            }
            if (gameState.blackTime !== undefined) {
                setBlackTime(gameState.blackTime);
            }
            
            // Update increments
            if (gameState.whiteIncrement !== undefined) {
                setWhiteIncrement(gameState.whiteIncrement);
            }
            if (gameState.blackIncrement !== undefined) {
                setBlackIncrement(gameState.blackIncrement);
            }
            
            // Update usernames and Elo
            if (gameState.whiteUsername) {
                setWhiteUsername(gameState.whiteUsername);
            }
            if (gameState.blackUsername) {
                setBlackUsername(gameState.blackUsername);
            }
            if (gameState.whiteElo !== undefined) {
                setWhiteElo(gameState.whiteElo);
            }
            if (gameState.blackElo !== undefined) {
                setBlackElo(gameState.blackElo);
            }
        }
    }, [gameState, waitingForOpponent]);

    useEffect(() => {
        const socket = socketService.getSocket();
        if (!socket) return;

        // Listen for clock updates
        const handleClockUpdate = ({ whiteTime, blackTime }: { whiteTime: number; blackTime: number }) => {
            setWhiteTime(whiteTime);
            setBlackTime(blackTime);
        };

        // Listen for game over due to timeout
        const handleGameOver = ({ reason, winner }: { reason: string; winner: string }) => {
            if (reason === 'timeout') {
                setGameOverReason(`${winner === 'white' ? 'White' : 'Black'} wins on time!`);
            }
        };

        // Listen for opponent forfeit
        const handleOpponentForfeit = ({ message }: { message: string; winner: string }) => {
            setGameOverReason(message);
        };

        // Listen for Elo updates
        const handleEloUpdate = ({ whiteElo, blackElo, whiteUsername, blackUsername }: any) => {
            setWhiteElo(whiteElo);
            setBlackElo(blackElo);
            setWhiteUsername(whiteUsername);
            setBlackUsername(blackUsername);
        };

        socket.on('clock-update', handleClockUpdate);
        socket.on('game-over', handleGameOver);
        socket.on('opponent-forfeited', handleOpponentForfeit);
        socket.on('elo-updated', handleEloUpdate);

        return () => {
            socket.off('clock-update', handleClockUpdate);
            socket.off('game-over', handleGameOver);
            socket.off('opponent-forfeited', handleOpponentForfeit);
            socket.off('elo-updated', handleEloUpdate);
        };
    }, []);

    const makeMove = (move: {
        from: string;
        to: string;
        promotion?: string;
    }) => {
        // Only allow moves if game has started
        if (!gameStarted) return false;

        // Check if it's the player's turn
        const currentTurn = game.turn();
        if ((currentTurn === 'w' && playerColor !== 'white') || 
            (currentTurn === 'b' && playerColor !== 'black')) {
            return false;
        }

        // Try the move locally first
        const gameCopy = new Chess(game.fen());
        const result = gameCopy.move(move);
        if (result) {
            // Send move to server
            const socket = socketService.getSocket();
            if (socket && gameId) {
                socket.emit('make-move', { gameId, move });
            }
            return true;
        }
        return false;
    };

    const onDrop = ({ sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) => {
        if (!targetSquare) return false;
        
        const move = makeMove({
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q'
        });

        return move;
    };

    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    
    const formatTimeControl = (time: number, increment: number) => {
        const minutes = Math.floor(time / 60000);
        const incrementSeconds = Math.floor(increment / 1000);
        return `${minutes}+${incrementSeconds}`;
    };

    return (
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl">
            <div className="flex flex-col items-center space-y-4">
                {/* Opponent's info and clock (top) */}
                <div className="text-center">
                    <p className="text-lg font-bold">
                        {playerColor === 'white' ? blackUsername : whiteUsername} 
                        <span className="text-gray-400 ml-2">({playerColor === 'white' ? blackElo : whiteElo})</span>
                    </p>
                    <p className="text-sm text-gray-500">
                        Time: {formatTimeControl(
                            playerColor === 'white' ? blackTime : whiteTime,
                            playerColor === 'white' ? blackIncrement : whiteIncrement
                        )}
                    </p>
                    <Clock 
                        time={playerColor === 'white' ? blackTime : whiteTime}
                        isActive={gameStarted && !game.game_over() && game.turn() !== playerColor[0]}
                        color={opponentColor}
                    />
                </div>
                
                {/* Chess board */}
                <div className="w-[600px]">
                    <Chessboard 
                        options={{
                            position: game.fen(),
                            onPieceDrop: onDrop,
                            boardOrientation: playerColor,
                            boardStyle: {
                                borderRadius: '4px',
                                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
                                width: '600px',
                                height: '600px'
                            }
                        }}
                    />
                </div>
                
                {/* Player's info and clock (bottom) */}
                <div className="text-center">
                    <Clock 
                        time={playerColor === 'white' ? whiteTime : blackTime}
                        isActive={gameStarted && !game.game_over() && game.turn() === playerColor[0]}
                        color={playerColor}
                    />
                    <p className="text-lg font-bold">
                        {playerColor === 'white' ? whiteUsername : blackUsername} 
                        <span className="text-gray-400 ml-2">({playerColor === 'white' ? whiteElo : blackElo})</span>
                    </p>
                    <p className="text-sm text-gray-500">
                        Time: {formatTimeControl(
                            playerColor === 'white' ? whiteTime : blackTime,
                            playerColor === 'white' ? whiteIncrement : blackIncrement
                        )}
                    </p>
                </div>
            </div>
            
            <div className="mt-4 text-center">
                {!gameStarted ? (
                    <p className="text-yellow-400">Waiting for opponent to join...</p>
                ) : (
                    <>
                        {gameOverReason ? (
                            <p className="text-red-500 font-bold text-xl">{gameOverReason}</p>
                        ) : (
                            <>
                                <p className="text-gray-400">
                                    {game.game_over() ? 'Game Over' : `${game.turn() === 'w' ? 'White' : 'Black'} to move`}
                                </p>
                                {game.in_checkmate() && <p className="text-red-500 font-bold">Checkmate!</p>}
                                {game.in_draw() && <p className="text-yellow-500 font-bold">Draw!</p>}
                                {game.in_check() && !game.in_checkmate() && <p className="text-orange-500 font-bold">Check!</p>}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default ChessBoard;