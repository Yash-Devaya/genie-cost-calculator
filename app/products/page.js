'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchProducts();
    }
  }, [status, router]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="text-white text-xl">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200">
      {/* Header */}
      <div className="bg-[#0f0f0f] border-b border-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"></div>
          <span className="text-xl font-semibold text-white">Products</span>
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
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Select a Product</h1>
          <p className="text-gray-400">Choose a product to view its cost calculator</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-400 mb-4">No products available</p>
            {isAdmin && (
              <Link
                href="/admin"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition-colors inline-block"
              >
                Go to Admin Panel to Add Products
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group"
              >
                <div className="bg-[#0f0f0f] border-2 border-gray-800 hover:border-purple-500 rounded-2xl p-8 transition-all hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer h-full flex flex-col">
                  {/* Icon */}
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                    {product.icon || '📦'}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                      {product.name}
                    </h2>
                    <p className="text-gray-400 mb-4">
                      {product.description}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 pt-4 border-t border-gray-800">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{product._count?.plans || 0} plan(s) available</span>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-between mt-4 text-purple-400 group-hover:text-purple-300">
                    <span className="text-sm font-semibold">View Calculator</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}