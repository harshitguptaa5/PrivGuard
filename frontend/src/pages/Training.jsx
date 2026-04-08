import { useState } from 'react';
import { Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = "";

export default function Training() {
  const [data, setData] = useState([]);
  const [level, setLevel] = useState("medium");
  const [training, setTraining] = useState(false);

  const startTraining = async () => {
    setTraining(true);
    setData([]);
    try {
      const res = await fetch(`${API_BASE}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodes: 100, level })
      });
      const resData = await res.json();
      const chartData = resData.rewards.map((r, i) => ({ episode: i + 1, reward: r }));
      setData(chartData);
    } catch (e) {
      console.error(e);
    }
    setTraining(false);
  };

  return (
    <div className="glass-panel">
      <h2>Q-Learning Training Dashboard</h2>
      <p style={{ marginBottom: '2rem' }}>Launch 100 episodes immediately and track the normalized reward.</p>

      <div style={{ marginBottom: '2rem' }}>
          <select 
            value={level} 
            onChange={(e) => setLevel(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--panel-bg)', color: 'white', marginRight: '1rem', border: '1px solid var(--secondary-color)' }}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        <button className="btn" onClick={startTraining} disabled={training}>
          <Play size={16} /> {training ? 'Training...' : 'Start Training'}
        </button>
      </div>

      <div style={{ height: '400px', width: '100%', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px' }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="episode" stroke="var(--text-main)" />
              <YAxis stroke="var(--text-main)" domain={[0, 1]} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--secondary-color)' }} />
              <Line type="monotone" dataKey="reward" stroke="var(--primary-color)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
            No Data (Run Training)
          </div>
        )}
      </div>
    </div>
  );
}
