

const Home = () => {
    const examplePlayers = [
        { id: 1, name: 'Alice', rating: 1850 },
        { id: 2, name: 'Bob', rating: 1720 },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">Chess Arena</h1>
                    <p className="text-gray-400">¯\_(ツ)_/¯</p>
                </div>

                <div className="bg-gray-800 rounded-lg shadow-xl p-6">
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold">Players Online</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="py-3 px-4 font-semibold text-gray-300">Player</th>
                                    <th className="py-3 px-4 font-semibold text-gray-300">Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {examplePlayers.map((player) => (
                                    <tr key={player.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                                <span className="font-medium">{player.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-yellow-400 font-semibold">{player.rating}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 text-center text-gray-500 text-sm">
                        <p>2 players online</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;