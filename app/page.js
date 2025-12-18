'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCost } from './context/CostContext';
import { useSession } from 'next-auth/react';

export default function Home() {
  const { costs, excelUrl, customExchangeRate } = useCost();
  const { data: session } = useSession();
  const [selectedTickets, setSelectedTickets] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [calculatedCost, setCalculatedCost] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [isLoadingRate, setIsLoadingRate] = useState(true);

  const ticketOptions = ['1', '10', '100', '1000', '5000'];
  
  const plans = [
    { value: 'plan1', label: 'Plan 1', description: 'Complete Azure Infrastructure Setup' }
  ];

  const calculateInfrastructureCost = (tickets) => {
    if (!costs) return 0;
    
    let total = 0;
    const componentKeys = ['coreCompute', 'relationalDb', 'nosqlDb', 'messageQueue', 'networking', 'edgeCompute', 'monitoring'];
    
    componentKeys.forEach(key => {
      total += parseFloat(costs[key]?.[tickets] || 0);
    });
    
    return total;
  };

  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (customExchangeRate !== null && customExchangeRate > 0) {
        setExchangeRate(customExchangeRate);
        setIsLoadingRate(false);
        return;
      }

      try {
        setIsLoadingRate(true);
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        if (data.rates && data.rates.INR) {
          setExchangeRate(data.rates.INR);
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
      } finally {
        setIsLoadingRate(false);
      }
    };

    fetchExchangeRate();
  }, [customExchangeRate]);

  useEffect(() => {
    if (selectedTickets && selectedPlan && costs) {
      const infrastructureCost = calculateInfrastructureCost(selectedTickets);
      const deploymentCost = parseFloat(costs.deployment?.[selectedTickets] || 0);
      const totalCost = infrastructureCost + deploymentCost;
      
      const infrastructureCostInRupees = infrastructureCost * exchangeRate;
      const deploymentCostInRupees = deploymentCost * exchangeRate;
      const totalCostInRupees = totalCost * exchangeRate;
      
      setCalculatedCost({
        tickets: selectedTickets,
        plan: plans.find(p => p.value === selectedPlan)?.label,
        planDescription: plans.find(p => p.value === selectedPlan)?.description,
        infrastructureCost: infrastructureCost,
        infrastructureCostInRupees: infrastructureCostInRupees,
        deploymentCost: deploymentCost,
        deploymentCostInRupees: deploymentCostInRupees,
        totalCost: totalCost,
        totalCostInRupees: totalCostInRupees
      });
    } else {
      setCalculatedCost(null);
    }
  }, [selectedTickets, selectedPlan, costs, exchangeRate]);

  const handleLogout = async () => {
  // Sign out from NextAuth
  await fetch('/api/auth/signout', { method: 'POST' });
  // Clear any local storage
  if (typeof window !== 'undefined') {
    localStorage.clear();
  }
  // Redirect to login
  window.location.href = '/login';
};

  // Check if user is admin
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200">
      {/* Header */}
      <div className="bg-[#0f0f0f] border-b border-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"></div>
          <span className="text-xl font-semibold text-white">Genie</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Only show Admin Panel button if user is admin */}
          {isAdmin && (
            <Link 
              href="/admin"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Admin Panel
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Genie Cost Calculation</h1>
          <p className="text-gray-400">Calculate your Azure infrastructure costs</p>
        </div>

        <div className="bg-[#0f0f0f] rounded-2xl border border-gray-800 p-8 shadow-2xl">
          {/* Number of Tickets */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              1. Number of Tickets
            </label>
            <select
              value={selectedTickets}
              onChange={(e) => {
                setSelectedTickets(e.target.value);
                setSelectedPlan('');
              }}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            >
              <option value="">Select number of tickets</option>
              {ticketOptions.map(option => (
                <option key={option} value={option}>{option} Tickets</option>
              ))}
            </select>
          </div>

          {/* Plan Selection */}
          {selectedTickets && (
            <div className="mb-8 animate-fadeIn">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                2. Select Plan
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              >
                <option value="">Select plan</option>
                {plans.map(plan => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label} - {plan.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Currency Selection */}
          {selectedPlan && (
            <div className="mb-8 animate-fadeIn">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                3. Select Currency
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              >
                <option value="INR">
                  {!isLoadingRate 
                    ? `INR (₹) - 1 USD = ₹${exchangeRate.toFixed(2)}${customExchangeRate ? ' (custom rate)' : ' (live rate)'}` 
                    : 'INR (₹) - Loading rate...'}
                </option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          )}

          {/* Calculated Cost Summary */}
          {calculatedCost && (
            <div className="mt-8 animate-fadeIn">
              {/* Quick Cost Preview */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/40 rounded-lg">
                <p className="text-sm text-gray-300 mb-2">Total Estimated Cost:</p>
                <div className="flex items-baseline gap-3">
                  {selectedCurrency === 'INR' ? (
                    <span className="text-3xl font-bold text-green-400">
                      ₹{calculatedCost.totalCostInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-3xl font-bold text-green-400">
                      ${calculatedCost.totalCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Per month estimate</p>
              </div>

              {/* Detailed Breakdown */}
              <div className="p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/50 rounded-xl">
                <h3 className="text-xl font-semibold text-white mb-6">💰 Cost Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Number of Tickets</span>
                    <span className="text-white font-semibold">{calculatedCost.tickets} Tickets</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Selected Plan</span>
                    <span className="text-white font-semibold">{calculatedCost.plan}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Plan Description</span>
                    <span className="text-white font-medium text-sm text-right max-w-md">{calculatedCost.planDescription}</span>
                  </div>
                  
                  {/* Infrastructure Cost */}
                  <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-400">Infrastructure Cost</p>
                        <p className="text-xs text-gray-500 mt-1">
                          (Core Compute + Database + Queue + Networking + Edge + Monitoring)
                        </p>
                      </div>
                      <div className="text-right">
                        {selectedCurrency === 'INR' ? (
                          <p className="text-2xl font-bold text-orange-400">
                            ₹{calculatedCost.infrastructureCostInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </p>
                        ) : (
                          <p className="text-2xl font-bold text-orange-400">
                            ${calculatedCost.infrastructureCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Deployment Cost */}
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-400">Deployment Cost</p>
                        <p className="text-xs text-gray-500 mt-1">(One-time setup and configuration)</p>
                      </div>
                      <div className="text-right">
                        {selectedCurrency === 'INR' ? (
                          <p className="text-2xl font-bold text-blue-400">
                            ₹{calculatedCost.deploymentCostInRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </p>
                        ) : (
                          <p className="text-2xl font-bold text-blue-400">
                            ${calculatedCost.deploymentCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Total Cost */}
                  <div className="mt-6 pt-4 border-t-2 border-purple-500/50">
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-2">Total Monthly Cost</p>
                      <div className="flex items-baseline justify-center gap-3">
                        {selectedCurrency === 'INR' ? (
                          <span className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                            ₹{calculatedCost.totalCostInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                            ${calculatedCost.totalCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      {selectedCurrency === 'INR' && !isLoadingRate && (
                        <p className="text-xs text-gray-600 mt-3">
                          *Exchange rate: 1 USD = ₹{exchangeRate.toFixed(2)} INR 
                          {customExchangeRate ? ' (custom rate set by admin)' : ' (live rate)'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Options */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Additional Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="px-6 py-4 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded-lg text-left transition-colors">
                <div className="font-semibold text-white mb-1">Intelligent Smart Centre</div>
                <div className="text-sm text-gray-400">Coming soon</div>
              </button>
              <button className="px-6 py-4 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded-lg text-left transition-colors">
                <div className="font-semibold text-white mb-1">Functionality</div>
                <div className="text-sm text-gray-400">Coming soon</div>
              </button>
            </div>
          </div>

          {/* View Full Cost Table */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">View Full Cost Table</h3>
            <a
              href="https://microland-my.sharepoint.com/:x:/r/personal/yash_devaya_microland_com/Documents/Book.xlsx?d=wb1ced5f392b24e008283fc05f7f9ca0e&csf=1&web=1&e=IqFWtW"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg text-center transition-all shadow-lg hover:shadow-purple-500/50 group"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Open Excel Cost Table
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <p className="text-center text-xs text-gray-500 mt-2">Opens complete cost breakdown in Excel</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}