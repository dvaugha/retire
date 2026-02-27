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
  age: 65,
  retirementAge: 65,
  expectedLife: 90,
  ssaClaimingAge: 67,
  ssaMonthly: 3000, // Base at age 67
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
    home: 0,
    car: 0,
    other: 0
  },
  liabilities: {
    mortgage: 0,
    loans: 0,
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
      setData({
        ...INITIAL_DATA,
        ...saved,
        assets: { ...INITIAL_DATA.assets, ...(saved.assets || {}) },
        liabilities: { ...INITIAL_DATA.liabilities, ...(saved.liabilities || {}) },
        roiScenarios: { ...INITIAL_DATA.roiScenarios, ...(saved.roiScenarios || {}) }
      });
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

  // Reset SSA Claiming Age when Current Age changes
  useEffect(() => {
    const validAge = Math.max(62, Math.min(70, Math.floor(data.age)));
    setData(prev => ({ ...prev, ssaClaimingAge: validAge }));
  }, [data.age]);

  const closeSplash = () => {
    setShowSplash(false);
    setData(prev => ({ ...prev, hasSeenSplash: true }));
  };

  const updateField = (path: string, value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;

    setData(prev => {
      const lastUpdated = new Date().toISOString();
      if (path.includes('.')) {
        const [parent, child] = path.split('.');
        const parentKey = parent as keyof FinancialData;
        return {
          ...prev,
          [parentKey]: {
            ...(prev[parentKey] as object),
            [child]: numValue
          },
          lastUpdated
        };
      }
      return {
        ...prev,
        [path]: numValue,
        lastUpdated
      };
    });
  };

  // Calculate Totals
  const investableAssets = data.assets.fourOhOneK + data.assets.ira + data.assets.savings + data.assets.other;
  const totalAssets = Object.values(data.assets).reduce((a, b) => a + b, 0);
  const totalLiabilities = Object.values(data.liabilities).reduce((a, b) => a + b, 0);
  const netWorth = totalAssets - totalLiabilities;

  // SSA Multiplier Logic
  const getSsaMultiplier = (age: number) => {
    if (age <= 62) return 0.70;
    if (age >= 70) return 1.24;
    if (age < 67) return 0.70 + (age - 62) * 0.06; // Approx 6% increase per year
    return 1.00 + (age - 67) * 0.08; // Approx 8% increase per year
  };

  const currentSsaCheck = data.ssaMonthly * getSsaMultiplier(data.ssaClaimingAge);
  const netWithdrawal = data.monthlyWithdrawal * (1 - (data.taxRate / 100));

  // Calculate runway for each scenario
  const calculateRunway = (roi: number) => {
    let currentAssets = investableAssets;
    const annualRoi = roi / 100;
    const annualInflation = data.inflationRate / 100;
    let annualWithdrawal = data.monthlyWithdrawal * 12; // Gross withdrawal

    // 1. Accumulation phase (today until retirement)
    for (let i = 0; i < (data.retirementAge - data.age); i++) {
      currentAssets = currentAssets * (1 + annualRoi);
      // Expenses grow with inflation while waiting for retirement
      annualWithdrawal = annualWithdrawal * (1 + annualInflation);
    }

    // 2. Withdrawal phase
    let yearsPostRetirement = 0;
    while (currentAssets > 0 && yearsPostRetirement < 50) {
      const currentAge = data.retirementAge + yearsPostRetirement;

      // SSA only kicks in at Claiming Age
      let ssaIncome = 0;
      if (currentAge >= data.ssaClaimingAge) {
        // SSA COLA: Start from today and compound based on inflation
        const yearsOfCola = currentAge - data.age;
        ssaIncome = currentSsaCheck * 12 * Math.pow(1 + annualInflation, yearsOfCola);
      }

      currentAssets = (currentAssets * (1 + annualRoi)) + ssaIncome - annualWithdrawal;

      // Budget continues to increase with inflation
      annualWithdrawal = annualWithdrawal * (1 + annualInflation);

      if (currentAssets <= 0) break;
      yearsPostRetirement++;
    }
    return data.retirementAge + yearsPostRetirement;
  };

  const runwayLow = calculateRunway(data.roiScenarios.low);
  const runwayMid = calculateRunway(data.roiScenarios.mid);
  const runwayHigh = calculateRunway(data.roiScenarios.high);

  // Calculate Ending Nest Egg (Balance at expectedLife based on MID return)
  const calculateEndingBalance = () => {
    let currentAssets = investableAssets;
    const annualRoi = data.roiScenarios.mid / 100;
    const annualInflation = data.inflationRate / 100;
    let annualWithdrawal = data.monthlyWithdrawal * 12;

    // 1. Accumulation phase (today until retirement)
    for (let i = 0; i < Math.max(0, data.retirementAge - data.age); i++) {
      currentAssets = currentAssets * (1 + annualRoi);
      annualWithdrawal = annualWithdrawal * (1 + annualInflation);
    }

    // 2. Withdrawal phase (until expectedLife)
    const yearsToCalculate = data.expectedLife - data.retirementAge;
    for (let i = 0; i < yearsToCalculate; i++) {
      const currentAge = data.retirementAge + i;
      let ssaIncome = 0;
      if (currentAge >= data.ssaClaimingAge) {
        const yearsOfCola = currentAge - data.age;
        ssaIncome = currentSsaCheck * 12 * Math.pow(1 + annualInflation, yearsOfCola);
      }
      currentAssets = (currentAssets * (1 + annualRoi)) + ssaIncome - annualWithdrawal;
      annualWithdrawal = annualWithdrawal * (1 + annualInflation);
      if (currentAssets < 0) return 0;
    }
    return Math.max(0, currentAssets);
  };

  const endingBalance = calculateEndingBalance();

  // Cumulative Cash Logic for SSA Strategy Lab
  const calculateCumulativeCash = (claimingAge: number, endAge: number) => {
    let total = 0;
    const annualInflation = data.inflationRate / 100;
    const baseCheck = data.ssaMonthly * getSsaMultiplier(claimingAge) * 12;

    for (let age = claimingAge; age < endAge; age++) {
      // SSA COLA is simplified here as compounding from 'today'
      const yearCheck = baseCheck * Math.pow(1 + annualInflation, age - data.age);
      total += yearCheck;
    }
    return total;
  };

  // SSA Strategy Calculations
  const nowAge = Math.max(62, data.age);
  const waitAge = data.ssaClaimingAge;

  // Calculate Break-Even
  const findBreakEven = () => {
    if (waitAge <= nowAge) return null;

    let totalNow = 0;
    let totalWait = 0;
    const annualInflation = data.inflationRate / 100;
    const checkNow = data.ssaMonthly * getSsaMultiplier(nowAge) * 12;
    const checkWait = data.ssaMonthly * getSsaMultiplier(waitAge) * 12;

    // Check every year until 100
    for (let age = nowAge; age <= 100; age++) {
      if (age < waitAge) {
        totalNow += checkNow * Math.pow(1 + annualInflation, age - data.age);
      } else {
        totalNow += checkNow * Math.pow(1 + annualInflation, age - data.age);
        totalWait += checkWait * Math.pow(1 + annualInflation, age - data.age);
      }

      if (totalWait > totalNow) return age;
    }
    return 100;
  };

  const catchupAge = findBreakEven();
  const forgoneIncome = calculateCumulativeCash(nowAge, waitAge);
  const isWorthIt = data.expectedLife > (catchupAge || 0);

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
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Monthly Strategy</h2>
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
              <span>+ Monthly SSA Check</span>
              <span style={{ fontWeight: 600 }}>${Math.floor(currentSsaCheck).toLocaleString()}</span>
            </div>
            <div className="flex-between" style={{ borderTop: '1px solid var(--border-glass)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>Total Net Income</span>
              <span className="text-gradient-green" style={{ fontWeight: 800 }}>${Math.floor(netWithdrawal + currentSsaCheck).toLocaleString()}</span>
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
                <label>Home Value</label>
                <input
                  type="number"
                  value={data.assets.home}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateField('assets.home', e.target.value)}
                />
              </div>
              <div>
                <label>Car Value</label>
                <input
                  type="number"
                  value={data.assets.car}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateField('assets.car', e.target.value)}
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
                <label>SSA Base/Mo (67)</label>
                <input
                  type="number"
                  value={data.ssaMonthly}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateField('ssaMonthly', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Liabilities Section */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#f87171' }}>Liabilities</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label>Mortgage</label>
                <input
                  type="number"
                  value={data.liabilities.mortgage}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateField('liabilities.mortgage', e.target.value)}
                />
              </div>
              <div>
                <label>Loans / Other</label>
                <input
                  type="number"
                  value={data.liabilities.loans}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateField('liabilities.loans', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="flex-between">
              <span style={{ fontWeight: 600 }}>Total Assets</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                ${totalAssets.toLocaleString()}
              </span>
            </div>
            <div className="flex-between">
              <span style={{ fontWeight: 600 }}>Total Liabilities</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171' }}>
                ${totalLiabilities.toLocaleString()}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span style={{ fontWeight: 800 }}>Net Worth</span>
              <span className="text-gradient-green" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                ${netWorth.toLocaleString()}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ending Nest Egg (Age {data.expectedLife})</span>
              <span style={{
                fontWeight: 700,
                color: endingBalance > 0 ? 'var(--accent-secondary)' : '#f87171'
              }}>
                ${Math.floor(endingBalance).toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* SSA Strategy Lab */}
        <section className="glass-card" style={{ border: '1px solid #c084fc', background: 'rgba(192, 132, 252, 0.05)' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2>SSA Break-Even Lab</h2>
            <div className="glass-card" style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', color: '#c084fc', border: '1px solid #c084fc' }}>
              Is waiting worth it?
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
              <label>Waiting until Age: <span style={{ color: 'white', fontWeight: 800 }}>{data.ssaClaimingAge}</span></label>
              <span className="text-gradient-blue" style={{ fontWeight: 700 }}>
                ${Math.floor(currentSsaCheck).toLocaleString()}/mo
              </span>
            </div>
            <input
              type="range"
              min={Math.max(62, Math.floor(data.age))}
              max="70"
              step="1"
              value={data.ssaClaimingAge}
              onChange={(e) => updateField('ssaClaimingAge', e.target.value)}
              style={{ width: '100%', height: '8px', borderRadius: '4px', appearance: 'none', background: 'rgba(255,255,255,0.1)' }}
            />
            <div className="flex-between" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              <span>Now ({Math.max(62, Math.floor(data.age))})</span>
              <span>70 (Max)</span>
            </div>
          </div>

          {waitAge > nowAge ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <label style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.5rem' }}>INCOME FORGONE</label>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f87171' }}>-${Math.floor(forgoneIncome).toLocaleString()}</span>
                  <p style={{ fontSize: '0.6rem', marginTop: '4px', color: 'var(--text-secondary)' }}>Sacrificed cash today</p>
                </div>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <label style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.5rem' }}>CATCH-UP AGE</label>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24' }}>{catchupAge}</span>
                  <p style={{ fontSize: '0.6rem', marginTop: '4px', color: 'var(--text-secondary)' }}>When delay "pays off"</p>
                </div>
              </div>

              {/* REALITY CHECK SECTION */}
              <div style={{ padding: '1rem', border: '1px dashed #f87171', borderRadius: '12px', marginBottom: '1.5rem', background: 'rgba(248, 113, 113, 0.05)' }}>
                <h3 style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '0.5rem', fontWeight: 700 }}>⚠️ THE REALITY CHECK</h3>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li><strong>Utility of Money:</strong> Is an extra check at age {catchupAge}+ more valuable than travel/hobbies at age {nowAge}?</li>
                  <li><strong>Solvency Risk:</strong> Federal policy could change. A "bird in hand" today is 100% guaranteed.</li>
                  <li><strong>Active Years:</strong> Medical costs rise later, but "Active Lifestyle" spending usually peaks before age 80.</li>
                </ul>
              </div>

              <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', borderLeft: `4px solid ${isWorthIt ? 'var(--accent-secondary)' : '#f87171'}` }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>The Trade-Off Analysis:</h3>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                  {isWorthIt ? (
                    <>
                      Purely by the math, waiting starts to pay off after <strong style={{ color: 'white' }}>age {catchupAge}</strong>.
                      However, to get that "bonus," you must walk away from <strong style={{ color: '#f87171' }}>${Math.floor(forgoneIncome).toLocaleString()}</strong> in liquid cash during your most active years.
                    </>
                  ) : (
                    <>
                      The math is clear: You won't break even until <strong style={{ color: 'white' }}>age {catchupAge}</strong>.
                      Since your longevity estimate is {data.expectedLife}, <strong style={{ color: 'var(--accent-secondary)' }}>taking benefits now</strong> is the smarter mathematical and lifestyle move.
                    </>
                  )}
                </p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.6 }}>
              Move the slider to compare waiting for a higher check.
            </div>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            "You can't buy back your 60s with an extra check in your 80s."
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
