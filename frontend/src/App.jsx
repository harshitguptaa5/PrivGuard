import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Simulation from './pages/Simulation';
import Training from './pages/Training';
import ManualMode from './pages/ManualMode';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="nav">
          <NavLink to="/" className={({isActive}) => isActive ? "active" : ""}>Dashboard</NavLink>
          <NavLink to="/simulation" className={({isActive}) => isActive ? "active" : ""}>Auto Simulation</NavLink>
          <NavLink to="/train" className={({isActive}) => isActive ? "active" : ""}>Training Graph</NavLink>
          <NavLink to="/manual" className={({isActive}) => isActive ? "active" : ""}>Manual Mode</NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/train" element={<Training />} />
          <Route path="/manual" element={<ManualMode />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
