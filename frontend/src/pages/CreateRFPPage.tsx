import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rfpsApi } from '../api/rfps';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

function CreateRFPPage() {
  const [description, setDescription] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, showToast, removeToast } = useToast();

  const createMutation = useMutation({
    mutationFn: rfpsApi.create,
    onSuccess: (rfp) => {
      queryClient.invalidateQueries({ queryKey: ['rfps'] });
      showToast('RFP created successfully!', 'success');
      setTimeout(() => {
        navigate(`/rfps/${rfp.id}`);
      }, 1000);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.error || 'Failed to create RFP. Please try again.', 'error');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Please enter a description', 'error');
      return;
    }
    createMutation.mutate(description);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create New RFP
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Describe what you want to procure in natural language. Our AI will extract the details and create a structured RFP.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Procurement Description
                </label>
                <textarea
                  id="description"
                  rows={10}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md transition-colors"
                  placeholder="Example: I need to procure laptops and monitors for our new office. Budget is $50,000 total. Need delivery within 30 days. We need 20 laptops with 16GB RAM and 15 monitors 27-inch. Payment terms should be net 30, and we need at least 1 year warranty."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={createMutation.isPending}
                />
                <p className="mt-2 text-sm text-gray-500">
                  {description.length} characters
                </p>
              </div>

              {createMutation.isPending && (
                <div className="mb-4 flex items-center space-x-2 text-blue-600">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm">AI is analyzing your request and creating the RFP...</span>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                  disabled={createMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                  disabled={createMutation.isPending || !description.trim()}
                >
                  {createMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="text-white" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create RFP</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateRFPPage;
