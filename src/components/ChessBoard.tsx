import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
// @ts-ignore
import { Chess } from 'chess.js';

const ChessBoard = () => {
    const [game, setGame] = useState(new Chess());

    const makeMove = (move: {
        from: string;
        to: string;
        promotion?: string;
    }) => {
        const gameCopy = { ...game };
        const result = gameCopy.move(move);
        if (result) {
            setGame(gameCopy);
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

        if (!move) {
            return false;
        }
        return true;
    };

    const resetGame = () => {
        setGame(new Chess());
    };

    return (
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl">
            <div className="w-[600px]">
                <Chessboard 
                    options={{
                        position: game.fen(),
                        onPieceDrop: onDrop,
                        boardStyle: {
                            borderRadius: '4px',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
                            width: '600px',
                            height: '600px'
                        }
                    }}
                />
            </div>
            <div className="mt-4 text-center">
                <p className="text-gray-400">
                    {game.game_over() ? 'Game Over' : `${game.turn() === 'w' ? 'White' : 'Black'} to move`}
                </p>
                {game.in_checkmate() && <p className="text-red-500 font-bold">Checkmate!</p>}
                {game.in_draw() && <p className="text-yellow-500 font-bold">Draw!</p>}
                <button
                    onClick={resetGame}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                    New Game
                </button>
            </div>
        </div>
    );
}

export default ChessBoard;