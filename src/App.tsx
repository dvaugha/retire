import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Heart,
  Wallet
} from 'lucide-react';
import { storage } from './lib/storage';
import type { FinancialData } from './lib/storage';

const INITIAL_DATA: FinancialData = {
  age: 45,
  retirementAge: 65,
  expectedLife: 90,
  ssaMonthly: 2500,
  monthlyBudget: 5000,
  roiScenarios: {
    low: 3,
    mid: 5,
    high: 7
  },
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
      // Merge saved data with INITIAL_DATA to ensure new fields exist
      setData({ ...INITIAL_DATA, ...saved });
    }
  }, []);

  // Save data on change
  useEffect(() => {
    storage.save(data);
  }, [data]);

  const updateField = (path: string, value: number) => {
    const newData = { ...data };
    if (path.includes('.')) {
      const parts = path.split('.');
      const parent = parts[0] as keyof FinancialData;
      const child = parts[1] as string;
      // @ts-ignore
      newData[parent][child] = value;
    } else {
      // @ts-ignore
      newData[path] = value;
    }
    newData.lastUpdated = new Date().toISOString();
    setData(newData);
  };

  const totalAssets = Object.values(data.assets).reduce((a, b) => a + b, 0);
  const yearsToRetire = Math.max(0, data.retirementAge - data.age);

  // Calculate runway for each scenario
  const calculateRunway = (roi: number) => {
    let assets = totalAssets;
    const monthlySsa = data.ssaMonthly;
    const monthlyExp = data.monthlyBudget;
    const annualRoi = roi / 100;

    // Simple projection: Compound until retirement, then draw down
    // 1. Accumulation phase
    for (let i = 0; i < yearsToRetire; i++) {
      assets = assets * (1 + (annualRoi || 0));
    }

    // 2. Withdrawal phase
    let years = 0;
    while (assets > 0 && years < 50) { // Cap at 50 years post-retire for safety
      assets = (assets * (1 + (annualRoi || 0))) - ((monthlyExp - monthlySsa) * 12);
      if (assets <= 0) break;
      years++;
    }
    return data.retirementAge + years;
  };

  const runwayLow = calculateRunway(data.roiScenarios.low);
  const runwayMid = calculateRunway(data.roiScenarios.mid);
  const runwayHigh = calculateRunway(data.roiScenarios.high);

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

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <label>Current Age</label>
          <input
            type="number"
            value={data.age}
            onChange={(e) => updateField('age', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <label>Plan to Live To</label>
          <input
            type="number"
            value={data.expectedLife}
            onChange={(e) => updateField('expectedLife', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <label>Retire at Age</label>
          <input
            type="number"
            value={data.retirementAge}
            onChange={(e) => updateField('retirementAge', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <label>Monthly Budget</label>
          <input
            type="number"
            value={data.monthlyBudget}
            onChange={(e) => updateField('monthlyBudget', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* ROI Scenarios */}
      <section className="glass-card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Market Return (ROI %)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.7rem' }}>LOW</label>
            <input
              type="number"
              value={data.roiScenarios.low}
              onChange={(e) => updateField('roiScenarios.low', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem' }}>MID</label>
            <input
              type="number"
              value={data.roiScenarios.mid}
              onChange={(e) => updateField('roiScenarios.mid', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem' }}>HIGH</label>
            <input
              type="number"
              value={data.roiScenarios.high}
              onChange={(e) => updateField('roiScenarios.high', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      {/* Projection Results */}
      <section className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h2>Projected Runway</h2>
          <TrendingUp size={20} className="text-gradient-blue" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="flex-between">
            <span style={{ color: 'var(--text-secondary)' }}>Low Return ({data.roiScenarios.low}%)</span>
            <span style={{ fontWeight: 700, color: runwayLow >= data.expectedLife ? 'var(--accent-secondary)' : '#f87171' }}>
              Age {runwayLow}
            </span>
          </div>
          <div className="flex-between">
            <span style={{ color: 'var(--text-secondary)' }}>Mid Return ({data.roiScenarios.mid}%)</span>
            <span style={{ fontWeight: 700, color: runwayMid >= data.expectedLife ? 'var(--accent-secondary)' : '#f87171' }}>
              Age {runwayMid}
            </span>
          </div>
          <div className="flex-between">
            <span style={{ color: 'var(--text-secondary)' }}>High Return ({data.roiScenarios.high}%)</span>
            <span style={{ fontWeight: 700, color: runwayHigh >= data.expectedLife ? 'var(--accent-secondary)' : '#f87171' }}>
              Age {runwayHigh}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {runwayMid >= data.expectedLife ?
            "✅ You are on track to exceed your life goal." :
            "⚠️ Potential shortfall based on current budget."}
        </div>
      </section>

      {/* Financial Vault */}
      <section className="glass-card">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <h2>Asset Vault</h2>
          <Wallet size={20} className="text-secondary" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>401K Assets</label>
            <input
              type="number"
              value={data.assets.fourOhOneK}
              onChange={(e) => updateField('assets.fourOhOneK', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex-between" style={{ gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label>IRA Assets</label>
              <input
                type="number"
                value={data.assets.ira}
                onChange={(e) => updateField('assets.ira', parseInt(e.target.value) || 0)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>SSA / Mo</label>
              <input
                type="number"
                value={data.ssaMonthly}
                onChange={(e) => updateField('ssaMonthly', parseInt(e.target.value) || 0)}
              />
            </div>
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

      {/* Footer / Info */}
      <footer style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '2rem 0' }}>
        <p>© 2026 RetireSafe Mobile</p>
        <p>No data leaves your device. Secure & Private.</p>
      </footer>
    </div>
  );
}

export default App;
