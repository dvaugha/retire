export interface FinancialData {
  age: number;
  retirementAge: number;
  expectedLife: number;
  ssaMonthly: number;
  monthlyBudget: number;
  monthlyWithdrawal: number;
  taxRate: number;
  roiScenarios: {
    low: number;
    mid: number;
    high: number;
  };
  assets: {
    fourOhOneK: number;
    ira: number;
    savings: number;
    other: number;
  };
  inflationRate: number;
  hasSeenSplash: boolean;
  lastUpdated: string;
}

const STORAGE_KEY = 'retiresafe_user_data';

export const storage = {
  save: (data: FinancialData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  load: (): FinancialData | null => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
