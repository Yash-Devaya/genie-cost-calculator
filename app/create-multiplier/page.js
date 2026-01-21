'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function CreateMultiplier() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [regions, setRegions] = useState([]);
  const [profileName, setProfileName] = useState('');
  const [multipliers, setMultipliers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }  else if (status === 'authenticated') {
      fetchRegions();
    }
  }, [status, router]);

  const fetchRegions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/regions');
      if (response.ok) {
        const data = await response.json();
        setRegions(data);
        
        // Initialize multipliers with 1.0 for all regions
        const initialMultipliers = {};
        data.forEach(region => {
          initialMultipliers[region.id] = 1.0;
        });
        setMultipliers(initialMultipliers);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiplierChange = (regionId, value) => {
    setMultipliers(prev => ({
      ...prev,
      [regionId]: parseFloat(value) || 0,
    }));
  };

  const handleSave = async () => {
    if (!profileName.trim()) {
      setMessage('❌ Please enter a profile name');
      return;
    }

    // Validate all multipliers are filled
    const allFilled = Object.values(multipliers).every(val => val > 0);
    if (!allFilled) {
      setMessage('❌ Please enter valid multipliers for all regions');
      return;
    }

    try {
      setSaving(true);
      
      const multipliersArray = Object.entries(multipliers).map(([regionId, multiplier]) => ({
        regionId: parseInt(regionId),
        multiplier: parseFloat(multiplier),
      }));

      const response = await fetch('/api/cost-multipliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          multipliers: multipliersArray,
        }),
      });

      if (response.ok) {
        setMessage('✅ Cost multiplier profile created successfully!');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        const data = await response.json();
        setMessage(`❌ Failed to create profile: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating multiplier:', error);
      setMessage('❌ Error creating multiplier profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

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
    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"></div>
    <span className="text-xl font-semibold text-white">Genie - Create Cost Multiplier</span>
  </div>
  <Link 
    href="/"
    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
  >
    Back to Calculator
  </Link>
</div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">Create Cost Multiplier </h1>
          <p className="text-gray-400">Define regional cost multipliers for your custom profile</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.includes('✅') 
              ? 'bg-green-500/10 border-green-500/50 text-green-400' 
              : 'bg-red-500/10 border-red-500/50 text-red-400'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-[#0f0f0f] rounded-2xl border border-gray-800 p-8 shadow-2xl">
          {/* Profile Name */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Profile Name
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g., Q1 2024 Pricing, Enterprise Rates, etc."
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Info Box */}
          <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-400 mb-2">ℹ️ About Regional Multipliers</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• <strong className="text-white">India is the baseline (1.0x)</strong> - all other regions are relative to India costs</li>
              <li>• A multiplier of <strong className="text-white">1.3</strong> means costs are 30% higher than India</li>
              <li>• A multiplier of <strong className="text-white">0.8</strong> would mean costs are 20% lower than India</li>
              <li>• These multipliers account for regional differences in infrastructure, labor, and operational costs</li>
            </ul>
          </div>

          {/* Regional Multipliers */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Regional Cost Multipliers</h2>
            
            <div className="space-y-3">
              {regions.map((region) => (
                <div 
                  key={region.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    region.name === 'India' 
                      ? 'bg-yellow-500/10 border-yellow-500/30' 
                      : 'bg-[#1a1a1a] border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{region.name}</span>
                      {region.name === 'India' && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
                          Baseline
                        </span>
                      )}
                    </div>
                    {region.name === 'India' && (
                      <p className="text-xs text-gray-500 mt-1">Reference region for all cost calculations</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={multipliers[region.id] || ''}
                      onChange={(e) => handleMultiplierChange(region.id, e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="1.00"
                      disabled={region.name === 'India'}
                      className={`w-24 bg-[#0f0f0f] border rounded-lg px-3 py-2 text-center text-white font-semibold focus:outline-none transition-all ${
                        region.name === 'India'
                          ? 'border-yellow-500/50 cursor-not-allowed opacity-60'
                          : 'border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                      }`}
                    />
                    <span className="text-gray-400 text-sm w-6">×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Calculation */}
          <div className="mb-8 p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/50 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4">💡 Example Calculation</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">
                If base infrastructure cost in <strong className="text-white">India</strong> is <strong className="text-green-400">$10,000/month</strong>:
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {regions.slice(0, 4).map(region => (
                  <div key={region.id} className="p-3 bg-[#0f0f0f] rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400">{region.name}</p>
                    <p className="text-lg font-bold text-purple-400">
                      ${((multipliers[region.id] || 1.0) * 10000).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{multipliers[region.id] || 1.0}× multiplier</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !profileName.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Profile'}
            </button>
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