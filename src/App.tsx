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
  monthlyWithdrawal: 3000,
  taxRate: 12,
  roiScenarios: {
    low: 3,
    mid: 5,
    high: 7
  },
  assets: {
    fourOhOneK: 250000,
    ira: 50000,
    savings: 25000,
    other: 0
  },
  inflationRate: 3,
  hasSeenSplash: false,
  lastUpdated: new Date().toISOString()
};

function App() {
  const [data, setData] = useState<FinancialData>(INITIAL_DATA);
  const [showSplash, setShowSplash] = useState(false);

  // Load data on mount
  useEffect(() => {
    const saved = storage.load();
    if (saved) {
      setData({ ...INITIAL_DATA, ...saved });
      if (!saved.hasSeenSplash) {
        setShowSplash(true);
      }
    } else {
      setShowSplash(true);
    }
  }, []);

  // Save data on change
  useEffect(() => {
    storage.save(data);
  }, [data]);

  const closeSplash = () => {
    setShowSplash(false);
    setData(prev => ({ ...prev, hasSeenSplash: true }));
  };

  const updateField = (path: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newData = { ...data };
    if (path.includes('.')) {
      const parts = path.split('.');
      const parent = parts[0] as keyof FinancialData;
      const child = parts[1] as string;
      // @ts-ignore
      newData[parent][child] = numValue;
    } else {
      // @ts-ignore
      newData[path] = numValue;
    }
    newData.lastUpdated = new Date().toISOString();
    setData(newData);
  };

  const totalAssets = Object.values(data.assets).reduce((a, b) => a + b, 0);
  const yearsToRetire = Math.max(0, data.retirementAge - data.age);

  // Calculate net withdrawal after tax
  const netWithdrawal = data.monthlyWithdrawal * (1 - (data.taxRate / 100));
  const totalMonthlyIncome = data.ssaMonthly + netWithdrawal;

  // Calculate runway for each scenario
  const calculateRunway = (roi: number) => {
    let currentAssets = totalAssets;
    const annualRoi = roi / 100;
    const annualInflation = data.inflationRate / 100;
    let annualWithdrawal = data.monthlyWithdrawal * 12; // Gross withdrawal

    // 1. Accumulation phase
    for (let i = 0; i < yearsToRetire; i++) {
      currentAssets = currentAssets * (1 + annualRoi);
      // Inflation affects the target withdrawal amount during wait
      annualWithdrawal = annualWithdrawal * (1 + annualInflation);
    }

    // 2. Withdrawal phase
    let yearsPostRetirement = 0;
    while (currentAssets > 0 && yearsPostRetirement < 50) {
      currentAssets = (currentAssets * (1 + annualRoi)) - annualWithdrawal;
      // Budget continues to increase with inflation post-retirement
      annualWithdrawal = annualWithdrawal * (1 + annualInflation);

      if (currentAssets <= 0) break;
      yearsPostRetirement++;
    }
    return data.retirementAge + yearsPostRetirement;
  };

  const runwayLow = calculateRunway(data.roiScenarios.low);
  const runwayMid = calculateRunway(data.roiScenarios.mid);
  const runwayHigh = calculateRunway(data.roiScenarios.high);

  return (
    <>
      <div className="container" style={{ filter: showSplash ? 'blur(8px)' : 'none', transition: 'filter 0.3s' }}>
        {/* Header */}
        <header className="flex-between" style={{ marginTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>RetireSafe</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              <ShieldCheck size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Enclave: Local Device Only
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
              onFocus={(e) => e.target.select()}
              onChange={(e) => updateField('age', e.target.value)}
            />
          </div>
          <div className="glass-card" style={{ padding: '1rem' }}>
            <label>Plan to Live To</label>
            <input
              type="number"
              value={data.expectedLife}
              onFocus={(e) => e.target.select()}
              onChange={(e) => updateField('expectedLife', e.target.value)}
            />
          </div>
        </div>

        {/* Strategy Section */}
        <section className="glass-card" style={{ border: '1px solid var(--accent-primary)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Withdrawal Strategy</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>Invest. Withdrawal / Mo</label>
              <input
                type="number"
                value={data.monthlyWithdrawal}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateField('monthlyWithdrawal', e.target.value)}
              />
            </div>
            <div>
              <label>Tax Rate (%)</label>
              <input
                type="number"
                value={data.taxRate}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateField('taxRate', e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
            <div className="flex-between" style={{ fontSize: '0.85rem' }}>
              <span>Net Monthly Withdrawal</span>
              <span style={{ fontWeight: 600 }}>${Math.floor(netWithdrawal).toLocaleString()}</span>
            </div>
            <div className="flex-between" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              <span>+ Monthly SSA</span>
              <span style={{ fontWeight: 600 }}>${data.ssaMonthly.toLocaleString()}</span>
            </div>
            <div className="flex-between" style={{ borderTop: '1px solid var(--border-glass)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>Total Net Income</span>
              <span className="text-gradient-green" style={{ fontWeight: 800 }}>${Math.floor(totalMonthlyIncome).toLocaleString()}</span>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1rem' }}>
            <label>Retire at Age</label>
            <input
              type="number"
              value={data.retirementAge}
              onFocus={(e) => e.target.select()}
              onChange={(e) => updateField('retirementAge', e.target.value)}
            />
          </div>
          <div className="glass-card" style={{ padding: '1rem' }}>
            <label>Target Budget</label>
            <input
              type="number"
              value={data.monthlyBudget}
              onFocus={(e) => e.target.select()}
              onChange={(e) => updateField('monthlyBudget', e.target.value)}
            />
          </div>
        </div>

        {/* ROI & Inflation Scenarios */}
        <section className="glass-card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Economic Variables</h2>
            <div style={{ width: '80px' }}>
              <label style={{ fontSize: '0.7rem' }}>INFLATION %</label>
              <input
                type="number"
                value={data.inflationRate}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateField('inflationRate', e.target.value)}
                style={{ textAlign: 'center' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem' }}>ROI LOW</label>
              <input
                type="number"
                value={data.roiScenarios.low}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateField('roiScenarios.low', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem' }}>ROI MID</label>
              <input
                type="number"
                value={data.roiScenarios.mid}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateField('roiScenarios.mid', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem' }}>ROI HIGH</label>
              <input
                type="number"
                value={data.roiScenarios.high}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateField('roiScenarios.high', e.target.value)}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>401K Assets</label>
                <input
                  type="number"
                  value={data.assets.fourOhOneK}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateField('assets.fourOhOneK', e.target.value)}
                />
              </div>
              <div>
                <label>IRA Assets</label>
                <input
                  type="number"
                  value={data.assets.ira}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateField('assets.ira', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Cash Savings</label>
                <input
                  type="number"
                  value={data.assets.savings}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateField('assets.savings', e.target.value)}
                />
              </div>
              <div>
                <label>SSA / Mo</label>
                <input
                  type="number"
                  value={data.ssaMonthly}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateField('ssaMonthly', e.target.value)}
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

        {/* Footer */}
        <footer style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '2rem 0' }}>
          <p>© 2026 RetireSafe Mobile</p>
          <p>Local Enclave Encryption Enabled</p>
        </footer>
      </div>

      {/* ONE-TIME SPLASH SCREEN */}
      {showSplash && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'rgba(0,0,0,0.8)'
        }}>
          <div className="glass-card" style={{
            textAlign: 'center',
            maxWidth: '350px',
            padding: '3rem 2rem',
            border: '2px solid var(--accent-primary)',
            background: 'var(--bg-primary)'
          }}>
            <ShieldCheck size={48} className="text-gradient-blue" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>RetireSafe Enclave</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
              Your financial data is <strong style={{ color: 'white' }}>100% private</strong>.
              Everything you enter stays inside this phone's local storage and is never uploaded to the cloud.
            </p>
            <button onClick={closeSplash} className="btn-primary">
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
