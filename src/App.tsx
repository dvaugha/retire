import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Heart,
  Wallet,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { storage } from './lib/storage';
import type { FinancialData } from './lib/storage';

const INITIAL_DATA: FinancialData = {
  age: 45,
  retirementAge: 65,
  ssaMonthly: 2500,
  assets: {
    fourOhOneK: 250000,
    ira: 50000,
    other: 0
  },
  lastUpdated: new Date().toISOString()
};

function App() {
  const [data, setData] = useState<FinancialData>(INITIAL_DATA);

  // Load data on mount
  useEffect(() => {
    const saved = storage.load();
    if (saved) {
      setData(saved);
    }
  }, []);

  // Save data on change
  useEffect(() => {
    storage.save(data);
  }, [data]);

  const updateField = (path: string, value: number) => {
    const newData = { ...data };
    if (path.includes('.')) {
      const parentKey = path.split('.')[0] as keyof FinancialData;
      const childKey = path.split('.')[1] as keyof FinancialData['assets'];
      // @ts-ignore
      newData[parentKey][childKey] = value;
    } else {
      // @ts-ignore
      newData[path] = value;
    }
    newData.lastUpdated = new Date().toISOString();
    setData(newData);
  };

  const totalAssets = Object.values(data.assets).reduce((a, b) => a + b, 0);
  const lifeExpectancyMin = 82;
  const lifeExpectancyMax = 96;

  // Simple projection logic
  const annualWithdrawal = (totalAssets * 0.04) + (data.ssaMonthly * 12);
  const yearsCovered = totalAssets / (annualWithdrawal / 2); // Conservative estimate

  return (
    <div className="container">
      {/* Header */}
      <header className="flex-between" style={{ marginTop: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>RetireSafe</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <ShieldCheck size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Data secured on device
          </p>
        </div>
        <div className="glass-card" style={{ padding: '0.5rem', borderRadius: '12px' }}>
          <Heart className="text-gradient-green" size={24} />
        </div>
      </header>

      {/* Life Expectancy Window */}
      <section className="glass-card">
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h2>Your Window</h2>
          <span className="text-secondary" style={{ fontSize: '0.8rem' }}>Actuarial View</span>
        </div>
        <div style={{ position: 'relative', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
              opacity: 0.3
            }}
          />
          <div style={{
            position: 'absolute',
            left: `${(data.age / 100) * 100}%`,
            top: 0,
            bottom: 0,
            width: '2px',
            background: 'white',
            boxShadow: '0 0 10px white'
          }}>
            <span style={{ position: 'absolute', top: '-20px', left: '-10px', fontSize: '0.7rem' }}>Now</span>
          </div>
          <div style={{
            position: 'absolute',
            left: `${(data.retirementAge / 100) * 100}%`,
            top: 0,
            bottom: 0,
            width: '4px',
            background: 'var(--accent-primary)',
            borderRadius: '2px'
          }}>
            <span style={{ position: 'absolute', bottom: '-20px', left: '-20px', fontSize: '0.7rem' }}>Retire ({data.retirementAge})</span>
          </div>
        </div>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', textAlign: 'center' }}>
          Expected life window: <span className="text-gradient-blue">{lifeExpectancyMin} - {lifeExpectancyMax} years</span>
        </p>
      </section>

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <label>Age</label>
          <input
            type="number"
            value={data.age}
            onChange={(e) => updateField('age', parseInt(e.target.value))}
          />
        </div>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <label>SSA / Mo</label>
          <input
            type="number"
            value={data.ssaMonthly}
            onChange={(e) => updateField('ssaMonthly', parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Financial Vault */}
      <section className="glass-card">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <h2>Financial Vault</h2>
          <Wallet size={20} className="text-secondary" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>401K Assets</label>
            <input
              type="number"
              value={data.assets.fourOhOneK}
              onChange={(e) => updateField('assets.fourOhOneK', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label>IRA Assets</label>
            <input
              type="number"
              value={data.assets.ira}
              onChange={(e) => updateField('assets.ira', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label>Other Savings</label>
            <input
              type="number"
              value={data.assets.other}
              onChange={(e) => updateField('assets.other', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)' }}>
          <div className="flex-between">
            <span style={{ fontWeight: 600 }}>Total Nest Egg</span>
            <span className="text-gradient-green" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              ${totalAssets.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* Premium Feature: Runway Calculator */}
      <section className="glass-card" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div className="flex-between">
          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> Runway Projection
            </h3>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
              {data.retirementAge + Math.floor(yearsCovered)} Years Old
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Funds deplete at</p>
            <p style={{ fontSize: '0.8rem', fontWeight: 500 }}>4% SWR + SSA</p>
          </div>
        </div>
      </section>

      {/* Premium Feature: Lifestyle Multiplier */}
      <section className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(16, 185, 129, 0.05))' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={14} className="text-gradient-blue" /> Opportunity Cost
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Saving <span style={{ color: 'white', fontWeight: 600 }}>$500 more/mo</span> could pull your retirement in by:
        </p>
        <p style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.5rem' }}>
          2.4 Years
        </p>
      </section>

      {/* Footer / Info */}
      <footer style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '2rem 0' }}>
        <p>© 2026 RetireSafe Mobile</p>
        <p>Your data is stored locally and never transmitted.</p>
      </footer>
    </div>
  );
}

export default App;
