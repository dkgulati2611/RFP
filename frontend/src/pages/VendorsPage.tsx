import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi, Vendor } from '../api/vendors';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

function VendorsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });
  const queryClient = useQueryClient();
  const { toasts, showToast, removeToast } = useToast();

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: vendorsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: vendorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowForm(false);
      setFormData({ name: '', email: '', company: '' });
      showToast('Vendor added successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.error || 'Failed to add vendor. Please try again.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: vendorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      showToast('Vendor deleted successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.error || 'Failed to delete vendor. Please try again.', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      showToast('Name and email are required', 'error');
      return;
    }
    createMutation.mutate({
      name: formData.name,
      email: formData.email,
      company: formData.company || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading vendors...</p>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Vendors</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm hover:shadow-md flex items-center space-x-2"
          >
            {showForm ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancel</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Vendor</span>
              </>
            )}
          </button>
        </div>

        {showForm && (
          <div className="bg-white shadow sm:rounded-lg mb-6 animate-fade-in">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Vendor</h3>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    {createMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" className="text-white" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <span>Add Vendor</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {vendors.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors</h3>
              <p className="mt-1 text-sm text-gray-500 mb-4">Get started by adding your first vendor.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {vendors.map((vendor) => (
                <li key={vendor.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                      <p className="text-sm text-gray-500">{vendor.email}</p>
                      {vendor.company && (
                        <p className="text-sm text-gray-500">{vendor.company}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(vendor.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors disabled:opacity-50 flex items-center space-x-1"
                    >
                      {deleteMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

export default VendorsPage;
