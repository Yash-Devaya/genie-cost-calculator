'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [regions, setRegions] = useState([]);
  const [costMultipliers, setCostMultipliers] = useState([]);
  const [selectedTickets, setSelectedTickets] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedMultiplierProfile, setSelectedMultiplierProfile] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [calculatedCost, setCalculatedCost] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [customExchangeRate, setCustomExchangeRate] = useState(null);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [loading, setLoading] = useState(true);
   const params = useParams();
  const productId = params.productId;

  const [product, setProduct] = useState(null);
  


  const ticketOptions = ['1', '10', '100', '1000', '5000'];

   useEffect(() => {
    
    fetchRegions();
    fetchCostMultipliers();
    fetchSettings();
    if (productId) {
      fetchProduct();
      fetchPlans();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const fetchPlans = async () => {
  try {
    setLoading(true);
    // Fetch plans for this specific product
    const response = await fetch(`/api/products/${productId}/plans`);
    if (response.ok) {
      const data = await response.json();
      // Fetch full details for each plan
      const detailedPlans = await Promise.all(
        data.map(async (plan) => {
          const detailResponse = await fetch(`/api/plans/${plan.id}`);
          if (detailResponse.ok) {
            return await detailResponse.json();
          }
          return plan;
        })
      );
      setPlans(detailedPlans);
    }
  } catch (error) {
    console.error('Error fetching plans:', error);
  } finally {
    setLoading(false);
  }
};

  const fetchRegions = async () => {
    try {
      const response = await fetch('/api/regions');
      if (response.ok) {
        const data = await response.json();
        setRegions(data);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchCostMultipliers = async () => {
    try {
      const response = await fetch('/api/cost-multipliers');
      if (response.ok) {
        const data = await response.json();
        setCostMultipliers(data);
        // Set default profile as selected
        const defaultProfile = data.find(p => p.isDefault);
        if (defaultProfile) {
          setSelectedMultiplierProfile(defaultProfile.id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching cost multipliers:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.exchangeRate) {
          setCustomExchangeRate(parseFloat(data.exchangeRate));
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const calculateBaseCost = (plan, tickets) => {
    if (!plan || !plan.categories) return 0;
    
    let total = 0;
    const ticketKey = `tickets${tickets}`;
    
    plan.categories.forEach(category => {
      category.components?.forEach(component => {
        total += parseFloat(component[ticketKey]) || 0;
      });
    });
    
    return total;
  };

  const getRegionalMultiplier = () => {
    if (!selectedRegion || !selectedMultiplierProfile) return 1.0;

    const profile = costMultipliers.find(p => p.id === parseInt(selectedMultiplierProfile));
    if (!profile) return 1.0;

    const multiplier = profile.multipliers.find(m => m.regionId === parseInt(selectedRegion));
    return multiplier ? multiplier.multiplier : 1.0;
  };

  const getRegionName = () => {
    const region = regions.find(r => r.id === parseInt(selectedRegion));
    return region ? region.name : '';
  };

  const getMultiplierProfileName = () => {
    const profile = costMultipliers.find(p => p.id === parseInt(selectedMultiplierProfile));
    return profile ? profile.name : '';
  };

  const getCategoryBreakdown = (plan, tickets, multiplier) => {
    if (!plan || !plan.categories) return [];
    
    const ticketKey = `tickets${tickets}`;
    
    return plan.categories.map(category => {
      let categoryTotal = 0;
      category.components?.forEach(component => {
        categoryTotal += parseFloat(component[ticketKey]) || 0;
      });
      
      return {
        name: category.name,
        baseTotal: categoryTotal,
        adjustedTotal: categoryTotal * multiplier,
        showTotal: category.showTotal,
      };
    });
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
    if (selectedTickets && selectedPlan && selectedRegion && selectedMultiplierProfile && plans.length > 0) {
      const plan = plans.find(p => p.id === parseInt(selectedPlan));
      if (!plan) return;

      const baseCost = calculateBaseCost(plan, selectedTickets);
      const multiplier = getRegionalMultiplier();
      const adjustedCost = baseCost * multiplier;
      const adjustedCostInRupees = adjustedCost * exchangeRate;
      const categoryBreakdown = getCategoryBreakdown(plan, selectedTickets, multiplier);
      
      setCalculatedCost({
        tickets: selectedTickets,
        plan: plan.name,
        planDescription: plan.description,
        region: getRegionName(),
        multiplier: multiplier,
        multiplierProfile: getMultiplierProfileName(),
        baseCost: baseCost,
        adjustedCost: adjustedCost,
        adjustedCostInRupees: adjustedCostInRupees,
        categoryBreakdown: categoryBreakdown,
      });
    } else {
      setCalculatedCost(null);
    }
  }, [selectedTickets, selectedPlan, selectedRegion, selectedMultiplierProfile, plans, exchangeRate, costMultipliers, regions]);

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    window.location.href = '/login';
  };

  const isAdmin = session?.user?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200">
      {/* Header */}
      <div className="bg-[#0f0f0f] border-b border-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link 
            href="/products"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="text-2xl">{product?.icon || '📦'}</div>
          <div>
            <div className="text-xl font-semibold text-white">{product?.name || 'Loading...'}</div>
            <div className="text-xs text-gray-400">{product?.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <h1 className="text-4xl font-bold text-white mb-3">{product?.name} Cost Calculation</h1>
          <p className="text-gray-400">Calculate your infrastructure costs</p>
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
              <option value="" disabled hidden >Select number of tickets</option>
              {ticketOptions.map(option => (
                <option key={option} value={option}>{option} Tickets</option>
              ))}
            </select>
          </div>

          {/* Region Selection */}
          {selectedTickets && (
            <div className="mb-8 animate-fadeIn">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                2. Select Region
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              >
                <option value="" disabled hidden>Select region</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cost Multiplier Selection */}
          {selectedRegion && (
            <div className="mb-8 animate-fadeIn">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                3. Select Cost Multiplier Profile
              </label>
              <div className="flex gap-3">
                <select
                  value={selectedMultiplierProfile}
                  onChange={(e) => {
                    if (e.target.value === 'create') {
                      router.push('/create-multiplier');
                    } else {
                      setSelectedMultiplierProfile(e.target.value);
                    }
                  }}
                  className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                >
                  <option value="" disabled hidden>Select multiplier profile</option>
                  {costMultipliers.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} {profile.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                  {<option value="create">+ Create New Multiplier Profile</option>}
                </select>
              </div>
              {selectedMultiplierProfile && (
                <p className="text-xs text-gray-500 mt-2">
                  Current multiplier for {getRegionName()}: {getRegionalMultiplier().toFixed(2)}x
                </p>
              )}
            </div>
          )}

          {/* Plan Selection */}
          {selectedMultiplierProfile && (
            <div className="mb-8 animate-fadeIn">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                4. Select Plan
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              >
                <option value="" disabled hidden>Select plan</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {plan.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Currency Selection */}
          {selectedPlan && (
            <div className="mb-8 animate-fadeIn">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                5. Select Currency
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
                      ₹{calculatedCost.adjustedCostInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-3xl font-bold text-green-400">
                      ${calculatedCost.adjustedCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Per month estimate</p>
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ Regional cost multiplier of {calculatedCost.multiplier.toFixed(2)}x applied for {calculatedCost.region}
                </p>
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
                    <span className="text-gray-400">Region</span>
                    <span className="text-white font-semibold">{calculatedCost.region}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Cost Multiplier Profile</span>
                    <span className="text-white font-semibold">{calculatedCost.multiplierProfile}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Regional Multiplier</span>
                    <span className="text-white font-semibold">{calculatedCost.multiplier.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Selected Plan</span>
                    <span className="text-white font-semibold">{calculatedCost.plan}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Plan Description</span>
                    <span className="text-white font-medium text-sm text-right max-w-md">{calculatedCost.planDescription}</span>
                  </div>
                  
                  {/* Base Cost */}
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-400">Base Cost (India baseline)</p>
                      </div>
                      <div className="text-right">
                        {selectedCurrency === 'INR' ? (
                          <p className="text-xl font-bold text-blue-400">
                            ₹{(calculatedCost.baseCost * exchangeRate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </p>
                        ) : (
                          <p className="text-xl font-bold text-blue-400">
                            ${calculatedCost.baseCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-300">Category Breakdown (with multiplier)</h4>
                    {calculatedCost.categoryBreakdown.map((category, idx) => (
                      <div key={idx} className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-400">{category.name}</p>
                          </div>
                          <div className="text-right">
                            {selectedCurrency === 'INR' ? (
                              <p className="text-2xl font-bold text-orange-400">
                                ₹{(category.adjustedTotal * exchangeRate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </p>
                            ) : (
                              <p className="text-2xl font-bold text-orange-400">
                                ${category.adjustedTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Cost */}
                  <div className="mt-6 pt-4 border-t-2 border-purple-500/50">
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-2">Total Monthly Cost</p>
                      <div className="flex items-baseline justify-center gap-3">
                        {selectedCurrency === 'INR' ? (
                          <span className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                            ₹{calculatedCost.adjustedCostInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                            ${calculatedCost.adjustedCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      {selectedCurrency === 'INR' && !isLoadingRate && (
                        <p className="text-xs text-gray-600 mt-3">
                          *Exchange rate: 1 USD = ₹{exchangeRate.toFixed(2)} INR 
                          {customExchangeRate ? ' (custom rate set by admin)' : ' (live rate)'}
                        </p>
                      )}
                      <p className="text-xs text-yellow-500 mt-2 font-medium">
                        ⓘ This total includes a regional cost multiplier of {calculatedCost.multiplier.toFixed(2)}x for {calculatedCost.region}
                      </p>
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
  <h3 className="text-lg font-semibold text-white mb-4">View Full Cost Breakdown</h3>
  {selectedTickets && selectedPlan ? (
    <button
      onClick={() => {
        const url = new URL('/api/generate-pdf', window.location.origin);
        url.searchParams.append('tickets', selectedTickets);
        url.searchParams.append('planId', selectedPlan);
        if (selectedRegion) url.searchParams.append('regionId', selectedRegion);
        if (selectedMultiplierProfile) url.searchParams.append('multiplierProfileId', selectedMultiplierProfile);
        url.searchParams.append('currency', selectedCurrency);
        url.searchParams.append('exchangeRate', exchangeRate.toString());
        window.open(url.toString(), '_blank');
      }}
      className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg text-center transition-all shadow-lg hover:shadow-purple-500/50 group"
    >
      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      Download Cost PDF for {calculatedCost?.plan || 'Selected Plan'} - {selectedTickets} Tickets
      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
    </button>
  ) : (
    <div className="flex items-center justify-center w-full px-6 py-4 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg">
      <p className="text-gray-500 text-sm">
        👆 Select number of tickets and plan above to download cost breakdown PDF
      </p>
    </div>
  )}
  <p className="text-center text-xs text-gray-500 mt-2">
    {selectedTickets && selectedPlan
      ? `Downloads PDF with costs for ${calculatedCost?.plan || 'Selected Plan'} - ${selectedTickets} tickets` 
      : 'Select tickets and plan to enable download'}
  </p>
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