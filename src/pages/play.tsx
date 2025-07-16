import ChessBoard from '@/components/chess-board';

const Play = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl font-bold mb-8">Play Chess</h1>
            <ChessBoard />
        </div>
    );
}

export default Play;