import { useState, useEffect } from 'react';
import { EyeOff, Eye, Replace, RotateCcw } from 'lucide-react';

const API_BASE = "http://localhost:7860";

export default function ManualMode() {
  const [obs, setObs] = useState(null);
  const [reward, setReward] = useState(0);
  const [history, setHistory] = useState([]); // Array of { token, action, is_sensitive, reward }
  const [level, setLevel] = useState("easy");
  const [finalScore, setFinalScore] = useState(null);

  const resetEnv = async () => {
    try {
      const res = await fetch(`${API_BASE}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });
      const data = await res.json();
      setObs(data);
      setReward(0);
      setFinalScore(null);
      setHistory([]);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { resetEnv(); }, [level]);

  const takeAction = async (type) => {
    if (!obs || obs.current_index >= obs.tokens.length) return;
    try {
      const res = await fetch(`${API_BASE}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          token_index: obs.current_index,
          replacement: type === 'replace' ? "[MASKED]" : null
        })
      });
      
      const data = await res.json();
      const newObs = data.observation;
      const stepReward = data.reward;
      
      // Store history for explanation
      const stepInfo = {
        token: obs.tokens[obs.current_index],
        action: type,
        is_sensitive: data.info.is_sensitive,
        reward: stepReward
      };
      
      setHistory([...history, stepInfo]);
      setObs(newObs);
      setReward(reward + stepReward);
      
      if (data.done && data.final_score !== undefined) {
         setFinalScore(data.final_score);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!obs) return <div className="glass-panel">Loading...</div>;

  const isDone = obs.current_index >= obs.tokens.length;

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Manual Redaction Mode</h2>
        <div>
           <select 
            value={level} 
            onChange={(e) => setLevel(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--panel-bg)', color: 'white', marginRight: '1rem', border: '1px solid var(--secondary-color)' }}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button className="btn btn-danger" onClick={resetEnv} style={{ marginLeft: '1rem' }}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="glass-panel metric-card" style={{ padding: '1rem' }}>
          <div className="label">Step Progress</div>
          <div className="value" style={{ fontSize: '1.5rem' }}>{obs.current_index} / {obs.tokens.length}</div>
        </div>
        <div className="glass-panel metric-card" style={{ padding: '1rem' }}>
          <div className="label">Your Score</div>
          <div className="value">{reward.toFixed(2)}</div>
        </div>
      </div>

      <div className="document-viewer">
        {obs.tokens.map((token, i) => {
          let className = "token ";
          let displayToken = token;
          
          if (i === obs.current_index && !isDone) className += "current ";
          
          // History playback
          if (i < obs.current_index) {
            const past = history[i];
            if (past) {
                if (past.action === "redact" || past.action === "replace") {
                    className += "redacted ";
                    displayToken = "[██████]";
                }
                // Reward negative means mistake (e.g., -1 for missed sensitive, -0.5 for over-reduction)
                if (past.reward <= 0) {
                    className += "mistake ";
                }
            }
          }
          
          return (
            <span key={i} className={className.trim()}>
              {displayToken}
            </span>
          );
        })}
      </div>

      <div className="policy-block" style={{ marginBottom: '2rem' }}>
        <h4>Active Policy:</h4>
        <p style={{ color: 'var(--danger)' }}>Redact: {obs.policy.redact.join(', ')}</p>
        <p style={{ color: 'var(--success)' }}>Preserve: {obs.policy.preserve.join(', ')}</p>
      </div>

      {!isDone ? (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn" onClick={() => takeAction('keep')} style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
            <Eye size={18} /> Keep
          </button>
          <button className="btn" onClick={() => takeAction('replace')} style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
            <Replace size={18} /> Replace
          </button>
          <button className="btn btn-danger" onClick={() => takeAction('redact')}>
            <EyeOff size={18} /> Redact
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', background: 'rgba(31, 40, 51, 0.8)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--success)' }}>
          <h3 style={{ color: 'var(--success)' }}>Episode Complete!</h3>
          <p style={{ fontSize: '1.2rem' }}>Cumulative Step Reward: {reward.toFixed(2)}</p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              OpenEnv Grade: {finalScore !== null ? `${(finalScore * 100).toFixed(1)}%` : 'N/A'}
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h3>Decision Log & Explainability</h3>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {history.map((h, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 0' }}>
                <span>Token: <strong>{h.token}</strong></span>
                <span>Action: <span style={{ color: h.action === 'keep' ? 'var(--success)' : 'var(--danger)' }}>{h.action}</span></span>
                <span>Ground Truth: {h.is_sensitive ? "Sensitive" : "Safe"}</span>
                <span style={{ color: h.reward > 0 ? "var(--success)" : "var(--danger)" }}>Reward: {h.reward}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
