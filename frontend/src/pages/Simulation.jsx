import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, StepForward, Loader2, BrainCircuit } from 'lucide-react';

const API_BASE = "";

// ── Content shown in the "scanning box" per difficulty ──────────────────────
const contentMap = {
  easy: [
    "› The AI reads a short, plain sentence.",
    "› It learns to hide personal info like emails and phone numbers.",
  ],
  medium: [
    "› The agent processes real-world-style documents token by token.",
    "› It observes each word and decides: redact, keep, or replace.",
    "› Mixed PII types (emails, patient IDs, account codes) must be caught.",
    "› Errors are penalised; correct decisions earn positive reward.",
  ],
  hard: [
    "› PII is deliberately obfuscated — written in plain words, not symbols.",
    "› The agent must infer hidden context to detect sensitive data.",
    "› Decision-making uses pattern recognition far beyond simple keyword rules.",
    "› The environment penalises missed tokens more heavily than easy levels.",
    "› Prompt-injection attacks and adversarial phrasing may appear.",
    "› Only a smart contextual AI agent can consistently achieve a high score.",
  ],
};

const LEVEL_COLOR = { easy: '#66fcf1', medium: '#ffe066', hard: '#f25f5c' };

export default function Simulation() {
  const [obs, setObs] = useState(null);
  const [reward, setReward] = useState(0);
  const [level, setLevel] = useState("medium");
  const [running, setRunning] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [smartAgent, setSmartAgent] = useState(false);
  const [history, setHistory] = useState([]);

  // ── scanning box state ────────────────────────────────────────────────────
  const [visibleLines, setVisibleLines] = useState([]);
  const [scanFade, setScanFade] = useState(true);   // true = fully visible
  const tickerRef = useRef(null);

  // Whenever level changes → fade out → swap content → fade in
  useEffect(() => {
    setScanFade(false);                              // 1. fade out
    clearInterval(tickerRef.current);

    const timer = setTimeout(() => {
      setVisibleLines([]);                           // 2. clear
      const lines = contentMap[level] || [];
      let idx = 0;

      setScanFade(true);                             // 3. fade in
      tickerRef.current = setInterval(() => {        // 4. tick lines in
        if (idx < lines.length) {
          setVisibleLines(prev => [...prev, lines[idx]]);
          idx++;
        } else {
          clearInterval(tickerRef.current);
        }
      }, 320);
    }, 280);                                         // matches CSS transition

    return () => { clearTimeout(timer); clearInterval(tickerRef.current); };
  }, [level]);

  // ── Backend helpers ───────────────────────────────────────────────────────
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
      setHistory([]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { resetEnv(); }, [level]);

  const executeStep = async (currentObs, currentReward) => {
    if (!currentObs || currentObs.current_index >= currentObs.tokens.length)
      return { done: true, obs: currentObs, reward: currentReward };

    const idx   = currentObs.current_index;
    const token = currentObs.tokens[idx];
    let actionType  = "keep";
    let replacement = null;

    if (smartAgent) {
      try {
        const res = await fetch(`${API_BASE}agent/act`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentObs)
        });
        const aiAction = await res.json();
        actionType  = aiAction.type;
        replacement = aiAction.replacement;
      } catch (e) {
        console.error("AI Agent failed, falling back to rules", e);
        const isEmailOrPhone = token.includes("@") || /\d{3}-\d{4}/.test(token)
          || token.includes("gmail") || token.includes("zero");
        actionType = isEmailOrPhone ? "redact" : "keep";
      }
    } else {
      const isEmailOrPhone = token.includes("@") || /\d{3}-\d{4}/.test(token)
        || token.includes("gmail") || token.includes("zero");
      actionType = isEmailOrPhone ? "redact" : "keep";
    }

    try {
      const res = await fetch(`${API_BASE}step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: actionType, token_index: idx, replacement })
      });
      const data       = await res.json();
      const newObs     = data.observation;
      const done       = data.done;
      const newReward  = currentReward + data.reward;

      setObs(newObs);
      setReward(newReward);
      setHistory(prev => [...prev, {
        token,
        action: actionType,
        ground_truth: data.info.is_sensitive ? "Sensitive" : "Safe",
        reward: data.reward
      }]);

      if (done && data.final_score !== undefined) setFinalScore(data.final_score);

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
    let currentObs  = obs;
    let localReward = reward;
    let done        = false;

    while (!done) {
      setLoading(true);
      const result = await executeStep(currentObs, localReward);
      setLoading(false);
      done        = result.done;
      currentObs  = result.obs;
      localReward = result.reward;
      if (!done) await new Promise(r => setTimeout(r, 500));
    }
    setRunning(false);
  };

  if (!obs) return <div className="glass-panel">Loading...</div>;

  const accent = LEVEL_COLOR[level] || 'var(--primary-color)';

  return (
    <div className="glass-panel">

      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Autonomous Agent Simulation</h2>
        <div>
          {loading && (
            <Loader2
              className="animate-spin"
              style={{ display: 'inline-block', marginRight: '1rem',
                       verticalAlign: 'middle', animation: 'spin 1s linear infinite' }}
            />
          )}
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={running}
            style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--panel-bg)',
                     color: 'white', marginRight: '1rem', border: `1px solid ${accent}`,
                     transition: 'border-color 0.3s ease' }}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button
            className="btn"
            onClick={() => setSmartAgent(!smartAgent)}
            style={{ marginRight: '1rem',
                     background: smartAgent ? 'var(--success)' : 'transparent',
                     border: '1px solid var(--success)', color: smartAgent ? 'var(--bg-color)' : 'var(--success)' }}
          >
            <BrainCircuit size={16} /> {smartAgent ? 'Smart AI: ON' : 'Smart AI: OFF'}
          </button>
          <button className="btn" onClick={nextStep}
            disabled={running || obs.current_index >= obs.tokens.length}>
            <StepForward size={16} /> Next Step
          </button>
          <button className="btn" onClick={runSimulation}
            disabled={running || obs.current_index >= obs.tokens.length}
            style={{ marginLeft: '1rem' }}>
            <Play size={16} /> Auto Run
          </button>
          <button className="btn btn-danger" onClick={resetEnv}
            disabled={running} style={{ marginLeft: '1rem' }}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes scanLine {
          0%   { opacity:0; transform: translateX(-6px); }
          100% { opacity:1; transform: translateX(0); }
        }
        .scan-line { animation: scanLine 0.35s ease forwards; }
        .scan-box  { transition: opacity 0.28s ease; }
      `}</style>

      {/* ── Dynamic scanning info box ── */}
      <div
        className="scan-box"
        style={{
          marginTop: '1.5rem',
          background: 'rgba(11,12,16,0.75)',
          border: `1px solid ${accent}44`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: '8px',
          padding: '1.2rem 1.5rem',
          minHeight: '60px',
          opacity: scanFade ? 1 : 0,
        }}
      >
        <p style={{ fontSize: '0.72rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: accent, marginBottom: '0.75rem', fontWeight: 700 }}>
          {level.toUpperCase()} — agent context
        </p>
        {visibleLines.map((line, i) => (
          <p key={i} className="scan-line"
             style={{ fontFamily: "'Inter', monospace", fontSize: '0.93rem',
                      color: 'var(--text-main)', marginBottom: '0.35rem',
                      animationDelay: `${i * 0.06}s` }}>
            {line}
          </p>
        ))}
      </div>

      {/* ── Metrics ── */}
      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="glass-panel metric-card" style={{ padding: '1rem' }}>
          <div className="label">Step Progress</div>
          <div className="value" style={{ fontSize: '1.5rem' }}>
            {obs.current_index} / {obs.tokens.length}
          </div>
        </div>
        <div className="glass-panel metric-card" style={{ padding: '1rem' }}>
          <div className="label">Step Reward</div>
          <div className="value">{reward.toFixed(2)}</div>
        </div>
        {finalScore !== null && (
          <div className="glass-panel metric-card"
               style={{ padding: '1rem', border: '1px solid var(--success)' }}>
            <div className="label" style={{ color: 'var(--success)' }}>Final Evaluation Score</div>
            <div className="value" style={{ color: 'var(--success)' }}>
              {(finalScore * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* ── Token / document viewer ── */}
      <div className="document-viewer">
        {obs.tokens.map((token, i) => {
          let cls = "token ";
          if (i === obs.current_index) cls += "current ";
          let displayToken = token;
          if (i < obs.current_index) {
            const step = history[i];
            if (step && (step.action === "redact" || step.action === "replace")) {
              cls += "redacted ";
              displayToken = "[██████]";
            }
          }
          return <span key={i} className={cls.trim()}>{displayToken}</span>;
        })}
      </div>

      {/* ── Active policy ── */}
      <div className="policy-block">
        <h4>Active Policy:</h4>
        <p style={{ color: 'var(--danger)' }}>Redact: {obs.policy.redact.join(', ')}</p>
        <p style={{ color: 'var(--success)' }}>Preserve: {obs.policy.preserve.join(', ')}</p>
      </div>

      {/* ── Difficulty Guide cards ── */}
      <div style={{ marginTop: '2rem' }}>
        <p className="diff-guide-heading">Simulation Difficulty Guide</p>
        <div className="difficulty-guide">
          <div className={`diff-card easy${level === 'easy' ? ' diff-card--active' : ''}`}>
            <span className="diff-badge">Easy</span>
            <h4>Beginner Level</h4>
            <ul>
              <li>The AI reads a short, plain sentence.</li>
              <li>It learns to hide personal info like emails and phone numbers.</li>
            </ul>
          </div>
          <div className={`diff-card medium${level === 'medium' ? ' diff-card--active' : ''}`}>
            <span className="diff-badge">Medium</span>
            <h4>Intermediate Level</h4>
            <ul>
              <li>The agent processes more complex, real-world-style documents.</li>
              <li>It must identify mixed PII types: emails, patient IDs, account codes.</li>
              <li>Each token is evaluated step-by-step for redaction or preservation.</li>
              <li>Errors are penalised; correct decisions earn reward points.</li>
            </ul>
          </div>
          <div className={`diff-card hard${level === 'hard' ? ' diff-card--active' : ''}`}>
            <span className="diff-badge">Hard</span>
            <h4>Advanced Level</h4>
            <ul>
              <li>PII is deliberately obfuscated — written in words, not symbols.</li>
              <li>The agent must infer context to detect hidden sensitive data.</li>
              <li>Decision-making requires pattern recognition beyond simple rules.</li>
              <li>The environment penalises missed tokens more heavily.</li>
              <li>Prompt-injection attacks and adversarial text may appear.</li>
              <li>Only a smart contextual AI agent can achieve a high score.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Decision Log ── */}
      <div style={{ marginTop: '2rem' }}>
        <h3>Decision Log &amp; Explainability</h3>
        <div className="glass-panel" style={{ maxHeight: '300px', overflowY: 'auto', padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--panel-bg)', zIndex: 1 }}>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--secondary-color)' }}>
                <th style={{ padding: '1rem' }}>Token</th>
                <th style={{ padding: '1rem' }}>Action</th>
                <th style={{ padding: '1rem' }}>Ground Truth</th>
                <th style={{ padding: '1rem' }}>Reward</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}><strong>{h.token}</strong></td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: h.action === 'keep' ? 'var(--success)' : 'var(--danger)' }}>
                      {h.action}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{h.ground_truth}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: h.reward > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {h.reward > 0 ? '+' : ''}{h.reward.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="4"
                      style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                    No steps taken yet. Run simulation to see logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
