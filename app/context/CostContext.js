'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const CostContext = createContext();

export function CostProvider({ children }) {
  const [costs, setCosts] = useState({
    coreCompute: { '1': 400, '10': 315, '100': 621, '1000': 1800, '5000': 5400 },
    relationalDb: { '1': 3270, '10': 3270, '100': 3270, '1000': 3270, '5000': 3270 },
    nosqlDb: { '1': 600, '10': 600, '100': 600, '1000': 600, '5000': 600 },
    messageQueue: { '1': 600, '10': 600, '100': 600, '1000': 600, '5000': 600 },
    networking: { '1': 0, '10': 0, '100': 60, '1000': 200, '5000': 200 },
    edgeCompute: { '1': 1000, '10': 924, '100': 1848, '1000': 1848, '5000': 2800 },
    monitoring: { '1': 2000, '10': 1575, '100': 1725, '1000': 1950, '5000': 3000 },
    deployment: { '1': 15000, '10': 15000, '100': 15000, '1000': 15000, '5000': 15000 }
  });

  const [excelUrl, setExcelUrl] = useState('');
  const [customExchangeRate, setCustomExchangeRate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load from database on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch costs from database
      const costsResponse = await fetch('/api/costs');
      if (costsResponse.ok) {
        const costsData = await costsResponse.json();
        if (Object.keys(costsData).length > 0) {
          setCosts(costsData);
        }
      }

      // Fetch settings from database
      const settingsResponse = await fetch('/api/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        
        if (settingsData.excelUrl) {
          setExcelUrl(settingsData.excelUrl);
        }
        
        if (settingsData.exchangeRate) {
          setCustomExchangeRate(parseFloat(settingsData.exchangeRate));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCosts = async (newCosts) => {
    try {
      const response = await fetch('/api/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCosts),
      });

      if (response.ok) {
        setCosts(newCosts);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating costs:', error);
      return false;
    }
  };

  const updateExcelUrl = async (url) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'excelUrl', value: url }),
      });

      if (response.ok) {
        setExcelUrl(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating Excel URL:', error);
      return false;
    }
  };

  const updateExchangeRate = async (rate) => {
    try {
      if (rate === null) {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'exchangeRate', value: '' }),
        });

        if (response.ok) {
          setCustomExchangeRate(null);
          return true;
        }
      } else {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'exchangeRate', value: rate.toString() }),
        });

        if (response.ok) {
          setCustomExchangeRate(rate);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      return false;
    }
  };

  return (
    <CostContext.Provider value={{ 
      costs, 
      excelUrl, 
      customExchangeRate,
      loading,
      updateCosts, 
      updateExcelUrl,
      updateExchangeRate,
      refreshData: fetchData,
    }}>
      {children}
    </CostContext.Provider>
  );
}

export function useCost() {
  const context = useContext(CostContext);
  if (!context) {
    throw new Error('useCost must be used within CostProvider');
  }
  return context;
}