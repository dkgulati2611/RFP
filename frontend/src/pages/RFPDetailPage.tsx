import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { rfpsApi, RFP, ComparisonResult } from '../api/rfps';
import { vendorsApi, Vendor } from '../api/vendors';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ProposalCardSkeleton } from '../components/SkeletonLoader';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

function RFPDetailPage() {
  const { id } = useParams<{ id: string }>();
  const rfpId = parseInt(id || '0');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  const { data: rfp, isLoading: rfpLoading } = useQuery<RFP>({
    queryKey: ['rfp', rfpId],
    queryFn: () => rfpsApi.getById(rfpId),
    enabled: !!rfpId,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: vendorsApi.getAll,
  });

  const [forceRefresh, setForceRefresh] = useState(false);

  const { data: comparison, isLoading: comparisonLoading } = useQuery<ComparisonResult>({
    queryKey: ['comparison', rfpId, forceRefresh],
    queryFn: () => rfpsApi.getComparison(rfpId, forceRefresh),
    enabled: showComparison && !!rfpId && (rfp?.proposals?.length || 0) > 0,
  });

  const sendMutation = useMutation({
    mutationFn: (vendorIds: number[]) => rfpsApi.sendToVendors(rfpId, vendorIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfp', rfpId] });
      showToast('RFP sent successfully!', 'success');
      setSelectedVendors([]);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.error || 'Failed to send RFP. Please try again.', 'error');
    },
  });

  const handleSendRFP = () => {
    if (selectedVendors.length === 0) {
      showToast('Please select at least one vendor', 'error');
      return;
    }
    if (confirm(`Send RFP to ${selectedVendors.length} vendor(s)?`)) {
      sendMutation.mutate(selectedVendors);
    }
  };

  const toggleVendor = (vendorId: number) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  if (rfpLoading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading RFP details...</p>
      </div>
    );
  }

  if (!rfp) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-red-600 font-semibold mb-2">RFP not found</div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to RFPs
          </button>
        </div>
      </div>
    );
  }

  const requirements = Array.isArray(rfp.requirements) ? rfp.requirements : [];

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div>
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center space-x-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to RFPs</span>
          </button>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">{rfp.title}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              rfp.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              rfp.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {rfp.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* RFP Details */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">RFP Details</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{rfp.description}</dd>
                  </div>
                  {rfp.budget && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Budget</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-semibold">${rfp.budget.toLocaleString()}</dd>
                    </div>
                  )}
                  {rfp.deadline && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Deadline</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(rfp.deadline).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  {rfp.paymentTerms && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                      <dd className="mt-1 text-sm text-gray-900">{rfp.paymentTerms}</dd>
                    </div>
                  )}
                  {rfp.warrantyReq && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Warranty Requirements</dt>
                      <dd className="mt-1 text-sm text-gray-900">{rfp.warrantyReq}</dd>
                    </div>
                  )}
                  {rfp.deliveryTerms && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Delivery Terms</dt>
                      <dd className="mt-1 text-sm text-gray-900">{rfp.deliveryTerms}</dd>
                    </div>
                  )}
                </dl>

                {requirements.length > 0 && (
                  <div className="mt-6">
                    <dt className="text-sm font-medium text-gray-500 mb-2">Requirements</dt>
                    <ul className="list-disc list-inside space-y-2">
                      {requirements.map((req: any, idx: number) => (
                        <li key={idx} className="text-sm text-gray-900">
                          <strong>{req.item}</strong>
                          {req.quantity && ` (Quantity: ${req.quantity})`}
                          {req.specifications && (
                            <span className="text-gray-600">
                              {' - '}
                              {Object.entries(req.specifications).map(([key, value]) => (
                                <span key={key}>{key}: {String(value)} </span>
                              ))}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Proposals */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Proposals ({rfp.proposals?.length || 0})
                  </h3>
                {rfp.proposals && rfp.proposals.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowComparison(!showComparison)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                    >
                      {showComparison ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          <span>Hide Comparison</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Show Comparison</span>
                        </>
                      )}
                    </button>
                    {showComparison && (
                      <button
                        onClick={() => {
                          setForceRefresh(!forceRefresh);
                          queryClient.invalidateQueries({ queryKey: ['comparison', rfpId] });
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                        title="Refresh comparison"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh</span>
                      </button>
                    )}
                  </div>
                )}
                </div>

                {rfp.proposals && rfp.proposals.length > 0 ? (
                  <div className="space-y-4">
                    {rfp.proposals.map((proposal) => (
                      <div key={proposal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {proposal.vendor?.name || 'Unknown Vendor'}
                            </h4>
                            {proposal.totalPrice && (
                              <p className="text-sm text-gray-600 mt-1 font-semibold">
                                Total: {proposal.currency || '$'}{proposal.totalPrice.toLocaleString()}
                              </p>
                            )}
                            {proposal.aiSummary && (
                              <p className="text-sm text-gray-500 mt-2">{proposal.aiSummary}</p>
                            )}
                          </div>
                          {proposal.aiScore !== null && (
                            <div className="text-right ml-4">
                              <div className="text-2xl font-bold text-blue-600">
                                {proposal.aiScore.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">AI Score</div>
                            </div>
                          )}
                        </div>
                        {proposal.completeness !== null && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Completeness</span>
                              <span>{proposal.completeness}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${proposal.completeness}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-gray-500">No proposals received yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comparison */}
            {showComparison && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">AI Comparison & Recommendation</h3>
                      {comparison && !comparisonLoading && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {comparison.cached ? 'Cached' : 'Fresh'}
                        </span>
                      )}
                    </div>
                    {comparisonLoading && <LoadingSpinner size="sm" />}
                  </div>
                  
                  {comparisonLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <ProposalCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : comparison ? (
                    <>
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <h4 className="font-medium text-green-900">Recommended Vendor</h4>
                        </div>
                        <p className="text-green-800 font-semibold">{comparison.recommendation.vendorName}</p>
                        <p className="text-sm text-green-700 mt-2">{comparison.recommendation.reasoning}</p>
                      </div>

                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-3">Scores</h4>
                        <div className="space-y-3">
                          {comparison.scores.map((score) => (
                            <div key={score.vendorId} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{score.vendorName}</span>
                                <span className="text-lg font-bold text-blue-600">
                                  {score.totalScore.toFixed(1)}/100
                                </span>
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                  <div className="text-gray-500">Price</div>
                                  <div className="font-medium">{score.priceScore.toFixed(0)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Terms</div>
                                  <div className="font-medium">{score.termsScore.toFixed(0)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Complete</div>
                                  <div className="font-medium">{score.completenessScore.toFixed(0)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Compliance</div>
                                  <div className="font-medium">{score.complianceScore.toFixed(0)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{comparison.summary}</p>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-2">Detailed Comparison</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{comparison.detailedComparison}</p>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Send RFP */}
            {rfp.status === 'draft' && (
              <div className="bg-white shadow sm:rounded-lg sticky top-20">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Send RFP</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Select vendors to send this RFP to:
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {vendors.map((vendor) => (
                      <label
                        key={vendor.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVendors.includes(vendor.id)}
                          onChange={() => toggleVendor(vendor.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">{vendor.name}</span>
                      </label>
                    ))}
                  </div>
                  {vendors.length === 0 && (
                    <p className="text-sm text-gray-500">No vendors available. Add vendors first.</p>
                  )}
                  <button
                    onClick={handleSendRFP}
                    disabled={selectedVendors.length === 0 || sendMutation.isPending}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    {sendMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" className="text-white" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Send RFP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default RFPDetailPage;
