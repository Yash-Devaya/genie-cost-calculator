// ============================================
// FILE: app/admin/page.js (UPDATED - Admin with Auth)
// ============================================
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCost } from '../context/CostContext';

export default function AdminPanel() {
  const { costs: globalCosts, excelUrl: globalExcelUrl, customExchangeRate: globalExchangeRate, updateCosts, updateExcelUrl, updateExchangeRate } = useCost();
  
  const [localCosts, setLocalCosts] = useState(globalCosts);
  const [localExcelUrl, setLocalExcelUrl] = useState(globalExcelUrl);
  const [localExchangeRate, setLocalExchangeRate] = useState(globalExchangeRate || '');
  const [useCustomRate, setUseCustomRate] = useState(globalExchangeRate !== null);
  const [azureTotal, setAzureTotal] = useState({ '1': 0, '10': 0, '100': 0, '1000': 0, '5000': 0 });
  const [grandTotal, setGrandTotal] = useState({ '1': 0, '10': 0, '100': 0, '1000': 0, '5000': 0 });
  const [saveMessage, setSaveMessage] = useState('');

  const components = [
    { name: 'Core Compute', service: 'Azure Container Apps / App Service', specs: '4 vCPU, 16 GB RAM (Medium Workload)', scaling: 'Instances: 1 → 1 → 1 → 1 → 3\nFixed (no scaling) with high availability', key: 'coreCompute' },
    { name: 'Relational Database', service: 'Azure Database for PostgreSQL - Flexible Server', specs: '4 vCores, 16 GB RAM, 256 GB Storage', scaling: 'Fixed (no scaling) with high availability', key: 'relationalDb' },
    { name: 'NoSQL Database', service: 'Azure Cosmos DB (MongoDB API)', specs: '1,000 RU/s, 25 GB Storage', scaling: 'Fixed (no scaling)', key: 'nosqlDb' },
    { name: 'Message Queue', service: 'Azure Event Hubs & CloudAMQP', specs: 'Event Hubs Standard, CloudAMQP\'s "Power Panda" plan', scaling: 'Fixed (no scaling)', key: 'messageQueue' },
    { name: 'Networking', service: 'Azure Data Transfer', specs: '1 TB of monthly egress from core to edge', scaling: 'Incremental(KB-level data)\nFixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets', key: 'networking' },
    { name: 'Edge Compute', service: 'Azure Virtual Machines', specs: '2 VMs, D4ds v5 series (4 vCores, 16 GB RAM)', scaling: 'Fixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets', key: 'edgeCompute' },
    { name: 'Monitoring & Security', service: 'Azure Monitor / Log Analytics / Security', specs: 'Variable based on data volume', scaling: 'Log Volume: 1x → 1.05x → 1.15x → 1.30x → 1.50x', key: 'monitoring' }
  ];

  useEffect(() => {
    setLocalCosts(globalCosts);
  }, [globalCosts]);

  useEffect(() => {
    setLocalExcelUrl(globalExcelUrl);
  }, [globalExcelUrl]);

  useEffect(() => {
    if (globalExchangeRate !== null) {
      setLocalExchangeRate(globalExchangeRate);
      setUseCustomRate(true);
    }
  }, [globalExchangeRate]);

  useEffect(() => {
    const tickets = ['1', '10', '100', '1000', '5000'];
    const newAzureTotal = {};
    tickets.forEach(ticket => {
      let sum = 0;
      Object.keys(localCosts).forEach(key => {
        if (key !== 'deployment') sum += parseFloat(localCosts[key][ticket]) || 0;
      });
      newAzureTotal[ticket] = sum;
    });
    setAzureTotal(newAzureTotal);

    const newGrandTotal = {};
    tickets.forEach(ticket => {
      newGrandTotal[ticket] = newAzureTotal[ticket] + (parseFloat(localCosts.deployment[ticket]) || 0);
    });
    setGrandTotal(newGrandTotal);
  }, [localCosts]);

  const handleCostChange = (component, ticket, value) => {
    setLocalCosts(prev => ({
      ...prev,
      [component]: { ...prev[component], [ticket]: value === '' ? 0 : parseFloat(value) || 0 }
    }));
  };

  const handleSave = () => {
    updateCosts(localCosts);
    updateExcelUrl(localExcelUrl);
    
    if (useCustomRate && localExchangeRate && parseFloat(localExchangeRate) > 0) {
      updateExchangeRate(parseFloat(localExchangeRate));
    } else {
      updateExchangeRate(null); // Use live rate
    }
    
    setSaveMessage('✓ Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

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

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200">
      <div className="bg-[#0f0f0f] border-b border-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"></div>
          <span className="text-xl font-semibold text-white">Genie Admin</span>
        </div>
        <div className="flex gap-3 items-center">
          {saveMessage && (
            <span className="text-green-400 font-medium animate-fadeIn">{saveMessage}</span>
          )}
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-sm font-semibold transition-all shadow-lg"
          >
            Save Changes
          </button>
          <Link 
  href="/admin/users"
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors"
>
  Manage Users
</Link>
          <Link 
            href="/" 
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            User View
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="p-6">
        <h1 className="text-3xl font-bold text-white mb-6">Azure Infrastructure Cost Calculator - Admin</h1>
        
        {/* Excel URL Input */}
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Excel Download URL</label>
          <input
            type="url"
            value={localExcelUrl}
            onChange={(e) => setLocalExcelUrl(e.target.value)}
            placeholder="https://example.com/your-excel-file.xlsx"
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Exchange Rate Settings */}
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-300">USD to INR Exchange Rate</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCustomRate"
                checked={useCustomRate}
                onChange={(e) => {
                  setUseCustomRate(e.target.checked);
                  if (!e.target.checked) {
                    setLocalExchangeRate('');
                  }
                }}
                className="w-4 h-4 rounded border-gray-700 bg-[#1a1a1a] text-purple-600 focus:ring-purple-500 focus:ring-2"
              />
              <label htmlFor="useCustomRate" className="text-sm text-gray-400 cursor-pointer">
                Use custom exchange rate
              </label>
            </div>
          </div>
          
          {useCustomRate ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">1 USD =</span>
                <input
                  type="number"
                  value={localExchangeRate}
                  onChange={(e) => setLocalExchangeRate(e.target.value)}
                  placeholder="Enter rate (e.g., 83.50)"
                  step="0.01"
                  min="0"
                  className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-gray-400 text-sm">INR</span>
              </div>
              <p className="text-xs text-gray-500">
                This rate will be used for all currency conversions in the user interface
              </p>
            </div>
          ) : (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                🌐 Using live exchange rate from API
              </p>
              <p className="text-xs text-gray-500 mt-1">
                The conversion rate will be fetched automatically and updated in real-time
              </p>
            </div>
          )}
        </div>

        <div className="overflow-x-auto shadow-lg rounded-xl border border-gray-800">
          <table className="w-full border-collapse bg-[#0f0f0f] text-sm">
            <thead>
              <tr className="bg-yellow-400 border-2 border-black text-black">
                <th className="border-2 border-black p-3 text-left font-bold">Component</th>
                <th className="border-2 border-black p-3 text-left font-bold">Azure Service</th>
                <th className="border-2 border-black p-3 text-left font-bold">Assumed Specifications</th>
                <th className="border-2 border-black p-3 text-center font-bold">1 Ticket</th>
                <th className="border-2 border-black p-3 text-center font-bold">10 Tickets</th>
                <th className="border-2 border-black p-3 text-center font-bold">100 Tickets</th>
                <th className="border-2 border-black p-3 text-center font-bold">1000 Tickets</th>
                <th className="border-2 border-black p-3 text-center font-bold">5000 Tickets</th>
                <th className="border-2 border-black p-3 text-left font-bold">Scaling Rationale</th>
              </tr>
            </thead>
            <tbody>
              {components.map((comp, idx) => (
                <tr key={idx}>
                  <td className="border-2 border-gray-700 p-3 font-bold text-white">{comp.name}</td>
                  <td className="border-2 border-gray-700 p-3 text-gray-300">{comp.service}</td>
                  <td className="border-2 border-gray-700 p-3 bg-yellow-200 text-black">{comp.specs}</td>
                  {['1', '10', '100', '1000', '5000'].map(ticket => (
                    <td key={ticket} className="border-2 border-gray-700 p-2">
                      <input 
                        type="number" 
                        value={localCosts[comp.key][ticket]} 
                        onChange={(e) => handleCostChange(comp.key, ticket, e.target.value)} 
                        className="w-full p-2 bg-[#1a1a1a] border border-gray-600 rounded text-center text-white font-semibold focus:outline-none focus:border-purple-500" 
                      />
                    </td>
                  ))}
                  <td className="border-2 border-gray-700 p-3 whitespace-pre-line text-sm text-gray-300">{comp.scaling}</td>
                </tr>
              ))}
              <tr className="bg-orange-500 font-bold text-black">
                <td className="border-2 border-black p-3" colSpan="3">Azure Total</td>
                {['1', '10', '100', '1000', '5000'].map(ticket => (
                  <td key={ticket} className="border-2 border-black p-3 text-center text-lg">{azureTotal[ticket].toFixed(0)}</td>
                ))}
                <td className="border-2 border-black p-3"></td>
              </tr>
              <tr>
                <td className="border-2 border-gray-700 p-3 font-bold text-white">Deployment</td>
                <td className="border-2 border-gray-700 p-3 text-gray-300">Deployment</td>
                <td className="border-2 border-gray-700 p-3 bg-yellow-200"></td>
                {['1', '10', '100', '1000', '5000'].map(ticket => (
                  <td key={ticket} className="border-2 border-gray-700 p-2">
                    <input 
                      type="number" 
                      value={localCosts.deployment[ticket]} 
                      onChange={(e) => handleCostChange('deployment', ticket, e.target.value)} 
                      className="w-full p-2 bg-[#1a1a1a] border border-gray-600 rounded text-center text-white font-semibold focus:outline-none focus:border-purple-500" 
                    />
                  </td>
                ))}
                <td className="border-2 border-gray-700 p-3 text-gray-300">Fixed</td>
              </tr>
              <tr className="bg-blue-500 font-bold text-black text-lg">
                <td className="border-2 border-black p-3" colSpan="3">TOTAL (Exclusive of LLM)</td>
                {['1', '10', '100', '1000', '5000'].map(ticket => (
                  <td key={ticket} className="border-2 border-black p-3 text-center text-xl">{grandTotal[ticket].toFixed(0)}</td>
                ))}
                <td className="border-2 border-black p-3">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}