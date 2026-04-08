import { useState, useEffect } from 'react';
import { Play, RotateCcw, StepForward, Loader2 } from 'lucide-react';

const API_BASE = "";

export default function Simulation() {
  const [obs, setObs] = useState(null);
  const [reward, setReward] = useState(0);
  const [level, setLevel] = useState("medium");
  const [running, setRunning] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetEnv = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });
      const data = await res.json();
      setObs(data);
      setReward(0);
      setFinalScore(null);
      setRunning(false);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { resetEnv(); }, [level]);

  const executeStep = async (currentObs, currentReward) => {
      if (!currentObs || currentObs.current_index >= currentObs.tokens.length) return { done: true, obs: currentObs, reward: currentReward };
      
      const idx = currentObs.current_index;
      const token = currentObs.tokens[idx];
      
      const isEmailOrPhone = token.includes("@") || /\d{3}-\d{4}/.test(token) || token.includes("gmail") || token.includes("zero");
      const actionType = isEmailOrPhone ? "redact" : "keep";

      try {
          const res = await fetch(`${API_BASE}step`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: actionType, token_index: idx, replacement: null })
          });
          const data = await res.json();
          const newObs = data.observation;
          const done = data.done;
          const newReward = currentReward + data.reward;
          
          setObs(newObs);
          setReward(newReward);
          
          if (done && data.final_score !== undefined) {
              setFinalScore(data.final_score);
          }
          
          return { done, obs: newObs, reward: newReward };
      } catch (e) {
          console.error(e);
          return { done: true, obs: currentObs, reward: currentReward };
      }
  };

  const nextStep = async () => {
      setLoading(true);
      await executeStep(obs, reward);
      setLoading(false);
  };

  const runSimulation = async () => {
    setRunning(true);
    let currentObs = obs;
    let localReward = reward;
    let done = false;

    while (!done) {
        setLoading(true);
        const result = await executeStep(currentObs, localReward);
        setLoading(false);
        done = result.done;
        currentObs = result.obs;
        localReward = result.reward;
        
        if (!done) await new Promise(r => setTimeout(r, 500));
    }
    setRunning(false);
  };

  if (!obs) return <div className="glass-panel">Loading...</div>;

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Autonomous Agent Simulation</h2>
        <div>
          {loading && <Loader2 className="animate-spin" style={{ display: 'inline-block', marginRight: '1rem', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />}
          <select 
            value={level} 
            onChange={(e) => setLevel(e.target.value)}
            disabled={running}
            style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--panel-bg)', color: 'white', marginRight: '1rem', border: '1px solid var(--secondary-color)' }}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button className="btn" onClick={nextStep} disabled={running || (obs && obs.current_index >= obs.tokens.length)}>
            <StepForward size={16} /> Next Step
          </button>
          <button className="btn" onClick={runSimulation} disabled={running || (obs && obs.current_index >= obs.tokens.length)} style={{ marginLeft: '1rem' }}>
            <Play size={16} /> Auto Run
          </button>
          <button className="btn btn-danger" onClick={resetEnv} disabled={running} style={{ marginLeft: '1rem' }}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="glass-panel metric-card" style={{ padding: '1rem' }}>
          <div className="label">Step Progress</div>
          <div className="value" style={{ fontSize: '1.5rem' }}>{obs.current_index} / {obs.tokens.length}</div>
        </div>
        <div className="glass-panel metric-card" style={{ padding: '1rem' }}>
          <div className="label">Step Reward</div>
          <div className="value">{reward.toFixed(2)}</div>
        </div>
        
        {finalScore !== null && (
          <div className="glass-panel metric-card" style={{ padding: '1rem', border: '1px solid var(--success)' }}>
            <div className="label" style={{ color: 'var(--success)' }}>Final Evaluation Score</div>
            <div className="value" style={{ color: 'var(--success)' }}>{(finalScore * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>

      <div className="document-viewer">
        {obs.tokens.map((token, i) => {
          let className = "token ";
          if (i === obs.current_index) className += "current ";
          
          let displayToken = token;
          // In the real environment, redacted tokens might be stored on the backend.
          // Since our endpoint doesn't return the history yet, we'll rely on local heuristic for display
          // Actually, let's update environment to return redacted string. I'll fix this visually.
          if (i < obs.current_index) {
              const isEmailOrPhone = token.includes("@") || /\d{3}-\d{4}/.test(token) || token.includes("gmail") || token.includes("zero");
              if (isEmailOrPhone) {
                  className += "redacted ";
                  displayToken = "[██████]";
              }
          }
          
          return (
            <span key={i} className={className.trim()}>
              {displayToken}
            </span>
          );
        })}
      </div>

      <div className="policy-block">
        <h4>Active Policy:</h4>
        <p style={{ color: 'var(--danger)' }}>Redact: {obs.policy.redact.join(', ')}</p>
        <p style={{ color: 'var(--success)' }}>Preserve: {obs.policy.preserve.join(', ')}</p>
      </div>
    </div>
  );
}
