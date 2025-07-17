import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/home';
import Play from '@/pages/play';
import Admin from '@/pages/admin';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/play/:gameId" element={<Play />} />
                <Route path="/admin" element={<Admin />} />
            </Routes>
        </Router>
    );
}

export default App;
