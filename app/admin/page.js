'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react'; // Add useRef to your existing React imports

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [categories, setCategories] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  
  const [excelUrl, setExcelUrl] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [useCustomRate, setUseCustomRate] = useState(false);
  
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const [costMultipliers, setCostMultipliers] = useState([]);

  // Product states
const [products, setProducts] = useState([]);
const [selectedProduct, setSelectedProduct] = useState(null);
  

// Add these states

const [selectedExcelFile, setSelectedExcelFile] = useState(null);
const [uploadingExcelFile, setUploadingExcelFile] = useState(false);
const excelFileInputRef = useRef(null);
// Edit plan with Excel states
const [selectedEditExcelFile, setSelectedEditExcelFile] = useState(null);
const [uploadingEditExcel, setUploadingEditExcel] = useState(false);
const editExcelFileInputRef = useRef(null);

  // Update useEffect
useEffect(() => {
  if (status === 'unauthenticated') {
    router.push('/login');
  } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
    router.push('/');
  } else if (status === 'authenticated') {
    fetchProducts(); // Fetch products first
    fetchSettings();
    fetchCostMultipliers();
  }
}, [status, session, router]);

  useEffect(() => {
    fetchPlans();
    fetchSettings();
    fetchCostMultipliers();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
        if (data.length > 0 && !selectedPlan) {
          await loadPlanDetails(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchProducts = async () => {
  try {
    const response = await fetch('/api/products');
    if (response.ok) {
      const data = await response.json();
      setProducts(data);
      // Auto-select first product
      if (data.length > 0 && !selectedProduct) {
        handleSelectProduct(data[0]);
      }
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  }
};

const handleSelectProduct = async (product) => {
  setSelectedProduct(product);
  setSelectedPlan(null);
  setCategories([]);
  setCustomFields([]);
  
  // Fetch plans for this product
  try {
    const response = await fetch(`/api/products/${product.id}/plans`);
    if (response.ok) {
      const data = await response.json();
      setPlans(data);
      if (data.length > 0) {
        await loadPlanDetails(data[0].id);
      }
    }
  } catch (error) {
    console.error('Error fetching plans:', error);
  }
};

const handleCreateProduct = async () => {
  const name = prompt('Enter product name:');
  if (!name) return;

  const description = prompt('Enter product description:');
  if (!description) return;

  const icon = prompt('Enter product icon emoji (optional):', '📦');

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, icon }),
    });

    if (response.ok) {
      const newProduct = await response.json();
      setProducts([...products, newProduct]);
      showMessage('✓ Product created successfully!');
    } else {
      const data = await response.json();
      showMessage(`✗ ${data.error}`, true);
    }
  } catch (error) {
    console.error('Error creating product:', error);
    showMessage('✗ Error creating product', true);
  }
};

const handleEditProduct = async (product) => {
  const name = prompt('Enter new product name:', product.name);
  if (!name) return;

  const description = prompt('Enter new product description:', product.description);
  if (!description) return;

  const icon = prompt('Enter product icon emoji:', product.icon || '📦');

  try {
    const response = await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, icon }),
    });

    if (response.ok) {
      const updated = await response.json();
      setProducts(products.map(p => p.id === updated.id ? updated : p));
      if (selectedProduct?.id === updated.id) {
        setSelectedProduct(updated);
      }
      showMessage('✓ Product updated successfully!');
    } else {
      const data = await response.json();
      showMessage(`✗ ${data.error}`, true);
    }
  } catch (error) {
    console.error('Error updating product:', error);
    showMessage('✗ Error updating product', true);
  }
};

const handleDeleteProduct = async (product) => {
  const planCount = product._count?.plans || 0;
  
  let confirmMessage = `Are you sure you want to delete "${product.name}"?`;
  if (planCount > 0) {
    confirmMessage += `\n\nThis will also delete ${planCount} plan(s) and all their data (categories, components, custom fields).\n\nThis action cannot be undone!`;
  }
  
  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const response = await fetch(`/api/products/${product.id}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (response.ok) {
      const remaining = products.filter(p => p.id !== product.id);
      setProducts(remaining);
      if (selectedProduct?.id === product.id) {
        if (remaining.length > 0) {
          handleSelectProduct(remaining[0]);
        } else {
          setSelectedProduct(null);
          setPlans([]);
          setSelectedPlan(null);
        }
      }
      showMessage(`✓ ${data.message || 'Product deleted successfully!'}`);
    } else {
      showMessage(`✗ ${data.error}`, true);
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    showMessage('✗ Error deleting product', true);
  }
};


  const fetchCostMultipliers = async () => {
  try {
    const response = await fetch('/api/cost-multipliers');
    if (response.ok) {
      const data = await response.json();
      setCostMultipliers(data);
    }
  } catch (error) {
    console.error('Error fetching cost multipliers:', error);
  }
};

  const loadPlanDetails = async (planId) => {
    try {
      const response = await fetch(`/api/plans/${planId}`);
      if (response.ok) {
        const plan = await response.json();
        setSelectedPlan(plan);
        setCategories(plan.categories || []);
        setCustomFields(plan.customFields || []);
      }
    } catch (error) {
      console.error('Error loading plan details:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.excelUrl) setExcelUrl(data.excelUrl);
        if (data.exchangeRate) {
          setExchangeRate(data.exchangeRate);
          setUseCustomRate(true);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handlePlanSelect = async (plan) => {
    await loadPlanDetails(plan.id);
  };

  const handleCreateNewPlan = async () => {
  if (!selectedProduct) {
    showMessage('✗ Please select a product first', true);
    return;
  }

  const name = prompt('Enter plan name:');
  if (!name) return;

  const description = prompt('Enter plan description:');
  if (!description) return;

  try {
    const response = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        description,
        productId: selectedProduct.id // Add this
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setPlans([...plans, data]);
      await loadPlanDetails(data.id);
      showMessage('✓ Plan created successfully!');
    } else {
      console.error('API Error:', data);
      showMessage(`✗ Failed to create plan: ${data.error || 'Unknown error'}`, true);
    }
  } catch (error) {
    console.error('Error creating plan:', error);
    showMessage(`✗ Error creating plan: ${error.message}`, true);
  }
};

  const handleUpdatePlanInfo = async () => {
    if (!selectedPlan) return;

    const name = prompt('Enter new plan name:', selectedPlan.name);
    if (!name) return;

    const description = prompt('Enter new plan description:', selectedPlan.description);
    if (!description) return;

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (response.ok) {
        const updated = await response.json();
        setPlans(plans.map(p => p.id === updated.id ? updated : p));
        await loadPlanDetails(updated.id);
        showMessage('✓ Plan updated successfully!');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      showMessage('✗ Error updating plan', true);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    if (plans.length === 1) {
      alert('Cannot delete the last plan!');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${selectedPlan.name}"?`)) return;

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const remaining = plans.filter(p => p.id !== selectedPlan.id);
        setPlans(remaining);
        if (remaining.length > 0) {
          await loadPlanDetails(remaining[0].id);
        }
        showMessage('✓ Plan deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      showMessage('✗ Error deleting plan', true);
    }
  };

  const handleAddCategory = async () => {
    if (!selectedPlan) return;

    const name = prompt('Enter category name (e.g., Infrastructure, Deployment):');
    if (!name) return;

    const showTotal = confirm('Show total row for this category?');

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, showTotal }),
      });

      if (response.ok) {
        const created = await response.json();
        setCategories([...categories, created]);
        showMessage('✓ Category added successfully!');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      showMessage('✗ Error adding category', true);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? All components in it will be deleted.')) return;

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCategories(categories.filter(c => c.id !== categoryId));
        showMessage('✓ Category deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showMessage('✗ Error deleting category', true);
    }
  };

  const handleAddCustomField = async () => {
    if (!selectedPlan) return;

    const name = prompt('Enter column name (e.g., Azure Service, Specifications):');
    if (!name) return;

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}/custom-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const created = await response.json();
        setCustomFields([...customFields, created]);
        showMessage('✓ Custom field added successfully!');
      }
    } catch (error) {
      console.error('Error adding custom field:', error);
      showMessage('✗ Error adding custom field', true);
    }
  };

  const handleDeleteCustomField = async (fieldId) => {
    if (!confirm('Are you sure you want to delete this column? Data in this column will be lost.')) return;

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}/custom-fields/${fieldId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCustomFields(customFields.filter(f => f.id !== fieldId));
        showMessage('✓ Custom field deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting custom field:', error);
      showMessage('✗ Error deleting custom field', true);
    }
  };

  const handleAddComponent = async (categoryId) => {
    if (!selectedPlan) return;

    const newComponent = {
      name: 'New Component',
      tickets1: 0,
      tickets10: 0,
      tickets100: 0,
      tickets1000: 0,
      tickets5000: 0,
      customFieldData: {},
    };

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}/categories/${categoryId}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComponent),
      });

      if (response.ok) {
        const created = await response.json();
        const updatedCategories = categories.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              components: [...(cat.components || []), created],
            };
          }
          return cat;
        });
        setCategories(updatedCategories);
        showMessage('✓ Component added successfully!');
      }
    } catch (error) {
      console.error('Error adding component:', error);
      showMessage('✗ Error adding component', true);
    }
  };

  const handleDeleteComponent = async (componentId, categoryId) => {
    if (!confirm('Are you sure you want to delete this component?')) return;

    try {
      const response = await fetch(`/api/components/${componentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedCategories = categories.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              components: cat.components.filter(c => c.id !== componentId),
            };
          }
          return cat;
        });
        setCategories(updatedCategories);
        showMessage('✓ Component deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting component:', error);
      showMessage('✗ Error deleting component', true);
    }
  };

  const handleComponentChange = (categoryId, componentId, field, value) => {
    const updatedCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          components: cat.components.map(comp => {
            if (comp.id === componentId) {
              if (field.startsWith('customField_')) {
                const fieldName = field.replace('customField_', '');
                const customData = typeof comp.customFieldData === 'string' 
                  ? JSON.parse(comp.customFieldData) 
                  : comp.customFieldData || {};
                return {
                  ...comp,
                  customFieldData: {
                    ...customData,
                    [fieldName]: value,
                  },
                };
              }
              return { ...comp, [field]: value };
            }
            return comp;
          }),
        };
      }
      return cat;
    });
    setCategories(updatedCategories);
  };

  const handleSaveComponents = async (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}/categories/${categoryId}/components`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          components: category.components.map(comp => ({
            ...comp,
            customFieldData: typeof comp.customFieldData === 'string' 
              ? comp.customFieldData 
              : JSON.stringify(comp.customFieldData),
          })),
        }),
      });

      if (response.ok) {
        showMessage('✓ Components saved successfully!');
      }
    } catch (error) {
      console.error('Error saving components:', error);
      showMessage('✗ Error saving components', true);
    }
  };
  const handleEditExcelFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    setSelectedEditExcelFile(file);
  }
};

const handleUpdatePlanFromExcel = async () => {
  if (!selectedEditExcelFile || !selectedPlan) {
    showMessage('✗ Please select a file and a plan', true);
    return;
  }

  if (!confirm(`Are you sure you want to update "${selectedPlan.name}"? This will replace all current data with the data from the Excel file.`)) {
    return;
  }

  try {
    setUploadingEditExcel(true);
    
    const formData = new FormData();
    formData.append('file', selectedEditExcelFile);

    const response = await fetch(`/api/plans/${selectedPlan.id}/update-from-excel`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(`✓ ${data.message} - ${data.stats.categories} categories, ${data.stats.components} components!`);
      
      // Clear form
      setSelectedEditExcelFile(null);
      if (editExcelFileInputRef.current) {
        editExcelFileInputRef.current.value = '';
      }
      
      // Reload the plan to show updated data
      await loadPlanDetails(selectedPlan.id);
      
    } else {
      console.error('Update error:', data);
      showMessage(`✗ ${data.error}: ${data.message || ''}`, true);
    }
  } catch (error) {
    console.error('Error updating from Excel:', error);
    showMessage('✗ Error updating plan from Excel', true);
  } finally {
    setUploadingEditExcel(false);
  }
};

  const handleSaveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'excelUrl', value: excelUrl }),
      });

      if (useCustomRate && exchangeRate) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'exchangeRate', value: exchangeRate }),
        });
      } else {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'exchangeRate', value: '' }),
        });
      }

      showMessage('✓ Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('✗ Error saving settings', true);
    }
  };

  const handleSaveAll = async () => {
    for (const category of categories) {
      await handleSaveComponents(category.id);
    }
    await handleSaveSettings();
    showMessage('✓ All changes saved successfully!');
  };

  const showMessage = (message, isError = false) => {
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    window.location.href = '/login';
  };

  const calculateCategoryTotal = (category, ticket) => {
    let total = 0;
    category.components?.forEach(comp => {
      const key = `tickets${ticket}`;
      total += parseFloat(comp[key]) || 0;
    });
    return total;
  };

  const calculateGrandTotal = (ticket) => {
    let total = 0;
    categories.forEach(cat => {
      total += calculateCategoryTotal(cat, ticket);
    });
    return total;
  };

  const handleExcelFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    setSelectedExcelFile(file);
  }
};

const handleUploadExcelWithPrompt = async () => {
  if (!selectedExcelFile) {
    showMessage('✗ Please select a file', true);
    return;
  }

  if (!selectedProduct) {
    showMessage('✗ Please select a product first', true);
    return;
  }

  // Prompt for plan name and description
  const planName = prompt('Enter plan name:');
  if (!planName) {
    showMessage('✗ Plan name is required', true);
    return;
  }

  const planDescription = prompt('Enter plan description:');
  if (!planDescription) {
    showMessage('✗ Plan description is required', true);
    return;
  }

  try {
    setUploadingExcelFile(true);
    
    const formData = new FormData();
    formData.append('file', selectedExcelFile);
    formData.append('planName', planName);
    formData.append('planDescription', planDescription);
    formData.append('productId', selectedProduct.id); // Add this

    const response = await fetch('/api/plans/upload-excel', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(`✓ ${data.message} - ${data.stats.categories} categories, ${data.stats.components} components created!`);
      
      // Clear form
      setSelectedExcelFile(null);
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = '';
      }
      
      // Refresh plans for current product
      await handleSelectProduct(selectedProduct);
      await loadPlanDetails(data.planId);
      
    } else {
      console.error('Upload error:', data);
      showMessage(`✗ ${data.error}: ${data.message || ''}`, true);
    }
  } catch (error) {
    console.error('Error uploading Excel:', error);
    showMessage('✗ Error uploading Excel file', true);
  } finally {
    setUploadingExcelFile(false);
  }
};

  const getCustomFieldValue = (component, fieldName) => {
    try {
      const data = typeof component.customFieldData === 'string' 
        ? JSON.parse(component.customFieldData) 
        : component.customFieldData || {};
      return data[fieldName] || '';
    } catch {
      return '';
    }
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
      <div className="bg-[#0f0f0f] border-b border-gray-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"></div>
          <span className="text-xl font-semibold text-white">Genie Admin</span>
        </div>
        <div className="flex gap-3 items-center">
          {saveMessage && (
            <span className={`font-medium animate-fadeIn ${
              saveMessage.includes('✗') ? 'text-red-400' : 'text-green-400'
            }`}>
              {saveMessage}
            </span>
          )}
          <button 
            onClick={handleSaveAll}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-sm font-semibold transition-all shadow-lg"
          >
            Save All Changes
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
        {/* Product Management Section */}
<div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 mb-6">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold text-white">Products</h2>
    <button
      onClick={handleCreateProduct}
      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Add New Product
    </button>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {products.map((product) => (
      <div
        key={product.id}
        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
          selectedProduct?.id === product.id
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
        }`}
        onClick={() => handleSelectProduct(product)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{product.icon || '📦'}</span>
            <div>
              <h3 className="font-semibold text-white">{product.name}</h3>
              <p className="text-xs text-gray-500">{product._count?.plans || 0} plan(s)</p>
            </div>
          </div>
          {selectedProduct?.id === product.id && (
            <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-3">{product.description}</p>
        
        <div className="flex gap-2 pt-3 border-t border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditProduct(product);
            }}
            className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold transition-colors"
          >
            Edit
          </button>
          <button
  onClick={(e) => {
    e.stopPropagation();
    handleDeleteProduct(product);
  }}
  className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-semibold transition-colors"
  title={product._count?.plans > 0 ? `Will delete ${product._count.plans} plan(s)` : 'Delete product'}
>
  Delete{product._count?.plans > 0 ? ` (${product._count.plans})` : ''}
</button>
        </div>
      </div>
    ))}
  </div>
</div>

        {/* Plan Selector */}
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Select Plan to Edit</h2>
            <button
              onClick={handleCreateNewPlan}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
                }`}
                onClick={() => handlePlanSelect(plan)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-400">{plan.description}</p>
                  </div>
                  {selectedPlan?.id === plan.id && (
                    <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedPlan && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-800">
              <button
                onClick={handleUpdatePlanInfo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Edit Plan Info
              </button>
              <button
                onClick={handleDeletePlan}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors"
                disabled={plans.length === 1}
              >
                Delete Plan
              </button>
            </div>
          )}
        </div>
        {/* Excel Upload Section - Simplified */}
<div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 mb-6">
  <h2 className="text-xl font-semibold text-white mb-4"> Upload Excel to Create New Plan</h2>
  
  <div className="space-y-4">
    {/* File Upload */}
    <div className="p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/50 rounded-lg">
      <h3 className="text-sm font-semibold text-white mb-3">Upload Excel File</h3>
      
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleExcelFileSelect}
        ref={excelFileInputRef}
        className="hidden"
        id="excel-file-upload"
      />
      
      <label
        htmlFor="excel-file-upload"
        className="block w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer text-center"
      >
        {uploadingExcelFile ? 'Processing...' : 'Choose Excel File'}
      </label>

      {selectedExcelFile && (
        <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-white">{selectedExcelFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(selectedExcelFile.size / 1024).toFixed(2)} KB)
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedExcelFile(null);
                if (excelFileInputRef.current) {
                  excelFileInputRef.current.value = '';
                }
              }}
              className="text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {selectedExcelFile && (
        <button
          onClick={handleUploadExcelWithPrompt}
          disabled={uploadingExcelFile}
          className="mt-3 w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
        >
          {uploadingExcelFile ? 'Creating Plan...' : 'Create Plan from Excel'}
        </button>
      )}
    </div>

    {/* Instructions */}
    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <h3 className="text-sm font-semibold text-blue-400 mb-2"> Excel Format Requirements</h3>
      <ul className="text-xs text-gray-400 space-y-1">
        <li>• <strong className="text-white">Required columns:</strong> Component (or Component Name), 1 Ticket, 10 Tickets, 100 Tickets, 1000 Tickets, 5000 Tickets</li>
        <li>• <strong className="text-white">Optional column:</strong> Category (to group components)</li>
        <li>• <strong className="text-white">Custom fields:</strong> Any columns between Component and ticket columns become custom fields</li>
        <li>• <strong className="text-white">Example:</strong> Component | Azure Service | Specifications | 1 Ticket | 10 Tickets...</li>
        <li>• First row must be headers</li>
        <li>• Data starts from second row</li>
        <li>• Empty rows are ignored</li>
      </ul>
    </div>

    {/* Sample Download */}
    <button
      onClick={() => window.open('/api/plans/download-sample-template', '_blank')}
      className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors"
    >
      Download Sample Template
    </button>
  </div>
</div>
{/* Edit Existing Plan with Excel */}
{selectedPlan && (
  <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 mb-6">
    <h2 className="text-xl font-semibold text-white mb-4"> Edit "{selectedPlan.name}" with Excel</h2>
    
    <div className="space-y-4">
      {/* Export Current Plan */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">Step 1: Download Current Plan Data</h3>
        <p className="text-xs text-gray-400 mb-3">
          Export this plan's data to Excel. You can edit it and upload it back to update the plan.
        </p>
        <button
          onClick={() => window.open(`/api/plans/${selectedPlan.id}/export-excel`, '_blank')}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download "{selectedPlan.name}" as Excel
        </button>
      </div>

      {/* Upload Modified Excel */}
      <div className="p-4 bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-500/50 rounded-lg">
        <h3 className="text-sm font-semibold text-orange-400 mb-2">Step 2: Upload Modified Excel</h3>
        <p className="text-xs text-gray-400 mb-3">
          After editing the Excel file, upload it here to update this plan. All data will be replaced.
        </p>
        
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleEditExcelFileSelect}
          ref={editExcelFileInputRef}
          className="hidden"
          id="edit-excel-upload"
        />
        
        <label
          htmlFor="edit-excel-upload"
          className="block w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer text-center"
        >
          {uploadingEditExcel ? 'Processing...' : 'Choose Modified Excel File'}
        </label>

        {selectedEditExcelFile && (
          <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-white">{selectedEditExcelFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(selectedEditExcelFile.size / 1024).toFixed(2)} KB)
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedEditExcelFile(null);
                  if (editExcelFileInputRef.current) {
                    editExcelFileInputRef.current.value = '';
                  }
                }}
                className="text-red-400 hover:text-red-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {selectedEditExcelFile && (
          <button
            onClick={handleUpdatePlanFromExcel}
            disabled={uploadingEditExcel}
            className="mt-3 w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
          >
            {uploadingEditExcel ? 'Updating Plan...' : '⚠️ Update Plan (This will replace all data)'}
          </button>
        )}
      </div>

      {/* Warning */}
      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-xs text-yellow-400">
          ⚠️ <strong>Warning:</strong> Uploading a modified Excel will completely replace all data in this plan. 
          Make sure your Excel has the PLAN_ID matching this plan ({selectedPlan.id}).
        </p>
      </div>
    </div>
  </div>
)}


        {/* Settings */}
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Global Settings</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Excel Download URL</label>
            <input
              type="url"
              value={excelUrl}
              onChange={(e) => setExcelUrl(e.target.value)}
              placeholder="https://example.com/your-excel-file.xlsx"
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">USD to INR Exchange Rate</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomRate"
                  checked={useCustomRate}
                  onChange={(e) => setUseCustomRate(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="useCustomRate" className="text-sm text-gray-400 cursor-pointer">
                  Use custom rate
                </label>
              </div>
            </div>
            
            {useCustomRate && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">1 USD =</span>
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="e.g., 83.50"
                  step="0.01"
                  className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                />
                <span className="text-gray-400 text-sm">INR</span>
              </div>
            )}
          </div>
        </div>
        {/* Cost Multiplier Management */}
<div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 mb-6">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold text-white">Cost Multiplier Profiles</h2>
    <Link
      href="/create-multiplier"
      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Create New Profile
    </Link>
  </div>

  <div className="space-y-3">
    {costMultipliers.map(profile => (
      <div key={profile.id} className="p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">
              {profile.name}
              {profile.isDefault && (
                <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                  Default
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {profile.multipliers?.length || 0} regions configured
            </p>
          </div>
          {!profile.isDefault && (
            <button
              onClick={async () => {
                if (confirm(`Delete "${profile.name}"?`)) {
                  try {
                    const response = await fetch(`/api/cost-multipliers/${profile.id}`, {
                      method: 'DELETE',
                    });
                    if (response.ok) {
                      setCostMultipliers(costMultipliers.filter(p => p.id !== profile.id));
                      showMessage('✓ Profile deleted successfully!');
                    }
                  } catch (error) {
                    console.error('Error deleting profile:', error);
                    showMessage('✗ Error deleting profile', true);
                  }
                }
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
</div>

        {/* Categories and Components */}
        {selectedPlan && (
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Components for {selectedPlan.name}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Category
                </button>
                <button
                  onClick={handleAddCustomField}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Column
                </button>
              </div>
            </div>

            {/* Custom Fields Display */}
            {customFields.length > 0 && (
              <div className="mb-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-cyan-400">Custom Columns:</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customFields.map(field => (
                    <div key={field.id} className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1 rounded-lg">
                      <span className="text-sm text-white">{field.name}</span>
                      <button
                        onClick={() => handleDeleteCustomField(field.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete column"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {categories.map((category, catIndex) => (
              <div key={category.id} className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-orange-400">{category.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddComponent(category.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Row
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold transition-colors"
                    >
                      Delete Category
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm mb-4">
                    <thead>
                      <tr className="bg-yellow-400 border-2 border-black text-black">
                        <th className="border-2 border-black p-3 text-left font-bold min-w-[150px]">Component</th>
                        {customFields.map(field => (
                          <th key={field.id} className="border-2 border-black p-3 text-left font-bold min-w-[200px]">
                            {field.name}
                          </th>
                        ))}
                        <th className="border-2 border-black p-3 text-center font-bold w-[120px]">1 Ticket</th>
                        <th className="border-2 border-black p-3 text-center font-bold w-[120px]">10 Tickets</th>
                        <th className="border-2 border-black p-3 text-center font-bold w-[120px]">100 Tickets</th>
                        <th className="border-2 border-black p-3 text-center font-bold w-[120px]">1000 Tickets</th>
                        <th className="border-2 border-black p-3 text-center font-bold w-[120px]">5000 Tickets</th>
                        <th className="border-2 border-black p-3 text-center font-bold w-[100px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.components?.map((comp) => (
                        <tr key={comp.id}>
                          <td className="border-2 border-gray-700 p-2">
                            <input
                              type="text"
                              value={comp.name}
                              onChange={(e) => handleComponentChange(category.id, comp.id, 'name', e.target.value)}
                              className="w-full p-2 bg-[#1a1a1a] border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                            />
                          </td>
                          {customFields.map(field => (
                            <td key={field.id} className="border-2 border-gray-700 p-2">
                              <textarea
                                value={getCustomFieldValue(comp, field.name)}
                                onChange={(e) => handleComponentChange(category.id, comp.id, `customField_${field.name}`, e.target.value)}
                                rows={2}
                                className="w-full p-2 bg-[#1a1a1a] border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500 resize-none"
                              />
                            </td>
                          ))}
                          {['tickets1', 'tickets10', 'tickets100', 'tickets1000', 'tickets5000'].map(ticket => (
                            <td key={ticket} className="border-2 border-gray-700 p-2">
                              <input
                                type="number"
                                value={comp[ticket]}
                                onChange={(e) => handleComponentChange(category.id, comp.id, ticket, e.target.value)}
                                className="w-full p-2 bg-[#1a1a1a] border border-gray-600 rounded text-center text-white font-semibold focus:outline-none focus:border-purple-500"
                              />
                            </td>
                          ))}
                          <td className="border-2 border-gray-700 p-2 text-center">
                            <button
                              onClick={() => handleDeleteComponent(comp.id, category.id)}
                              className="p-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                              title="Delete component"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Category Total Row */}
                      {category.showTotal && (
                        <tr className="bg-orange-500 font-bold text-black">
                          <td className="border-2 border-black p-3" colSpan={customFields.length + 1}>
                            {category.name} Total
                          </td>
                          <td className="border-2 border-black p-3 text-center text-lg">{calculateCategoryTotal(category, '1').toFixed(0)}</td>
                          <td className="border-2 border-black p-3 text-center text-lg">{calculateCategoryTotal(category, '10').toFixed(0)}</td>
                          <td className="border-2 border-black p-3 text-center text-lg">{calculateCategoryTotal(category, '100').toFixed(0)}</td>
                          <td className="border-2 border-black p-3 text-center text-lg">{calculateCategoryTotal(category, '1000').toFixed(0)}</td>
                          <td className="border-2 border-black p-3 text-center text-lg">{calculateCategoryTotal(category, '5000').toFixed(0)}</td>
                          <td className="border-2 border-black p-3"></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Grand Total */}
            {categories.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    <tr className="bg-blue-500 font-bold text-black text-lg">
                      <td className="border-2 border-black p-3" colSpan={customFields.length + 1}>
                        TOTAL (Exclusive of LLM)
                      </td>
                      <td className="border-2 border-black p-3 text-center text-xl">{calculateGrandTotal('1').toFixed(0)}</td>
                      <td className="border-2 border-black p-3 text-center text-xl">{calculateGrandTotal('10').toFixed(0)}</td>
                      <td className="border-2 border-black p-3 text-center text-xl">{calculateGrandTotal('100').toFixed(0)}</td>
                      <td className="border-2 border-black p-3 text-center text-xl">{calculateGrandTotal('1000').toFixed(0)}</td>
                      <td className="border-2 border-black p-3 text-center text-xl">{calculateGrandTotal('5000').toFixed(0)}</td>
                      <td className="border-2 border-black p-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            
          </div>
        )}
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