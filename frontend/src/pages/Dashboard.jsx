import { Link } from 'react-router-dom';
import { ShieldCheck, BrainCircuit, Activity, MousePointerClick } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="glass-panel">
      <h1>AI Privacy Redaction & Data Sharing Environment</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        Welcome to the Reinforcement Learning environment for automated PII redaction.
        Train agents to securely redact sensitive information while maximizing document utility.
      </p>

      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <ShieldCheck size={48} color="var(--primary-color)" />
          <h3 style={{ marginTop: '1rem' }}>Secure Policies</h3>
          <p>GDPR, HIPAA compliant simulations</p>
        </div>
        <div className="glass-panel metric-card">
          <BrainCircuit size={48} color="var(--primary-color)" />
          <h3 style={{ marginTop: '1rem' }}>AI Driven</h3>
          <p>Q-Learning & Gemini 3.1 Pro Agents</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
        <Link to="/simulation" className="btn">
          <Activity size={20} />
          Auto Simulation
        </Link>
        <Link to="/train" className="btn">
          <BrainCircuit size={20} />
          Training Graph
        </Link>
        <Link to="/manual" className="btn">
          <MousePointerClick size={20} />
          Manual Mode
        </Link>
      </div>
    </div>
  );
}
