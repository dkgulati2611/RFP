import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { rfpsApi, RFP, ComparisonResult } from '../api/rfps';
import { vendorsApi, Vendor } from '../api/vendors';

function RFPDetailPage() {
  const { id } = useParams<{ id: string }>();
  const rfpId = parseInt(id || '0');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const { data: rfp, isLoading: rfpLoading } = useQuery<RFP>({
    queryKey: ['rfp', rfpId],
    queryFn: () => rfpsApi.getById(rfpId),
    enabled: !!rfpId,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: vendorsApi.getAll,
  });

  const { data: comparison, isLoading: comparisonLoading } = useQuery<ComparisonResult>({
    queryKey: ['comparison', rfpId],
    queryFn: () => rfpsApi.getComparison(rfpId),
    enabled: showComparison && !!rfpId && (rfp?.proposals?.length || 0) > 0,
  });

  const sendMutation = useMutation({
    mutationFn: (vendorIds: number[]) => rfpsApi.sendToVendors(rfpId, vendorIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfp', rfpId] });
      alert('RFP sent successfully!');
      setSelectedVendors([]);
    },
    onError: () => {
      alert('Failed to send RFP. Please try again.');
    },
  });

  const handleSendRFP = () => {
    if (selectedVendors.length === 0) {
      alert('Please select at least one vendor');
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
    return <div className="text-center py-12">Loading RFP...</div>;
  }

  if (!rfp) {
    return <div className="text-center py-12 text-red-600">RFP not found</div>;
  }

  const requirements = Array.isArray(rfp.requirements) ? rfp.requirements : [];

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to RFPs
        </button>
        <h2 className="text-2xl font-bold text-gray-900">{rfp.title}</h2>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
          rfp.status === 'draft' ? 'bg-gray-100 text-gray-800' :
          rfp.status === 'sent' ? 'bg-blue-100 text-blue-800' :
          'bg-green-100 text-green-800'
        }`}>
          {rfp.status}
        </span>
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
                    <dd className="mt-1 text-sm text-gray-900">${rfp.budget.toLocaleString()}</dd>
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
                  <button
                    onClick={() => setShowComparison(!showComparison)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {showComparison ? 'Hide' : 'Show'} Comparison
                  </button>
                )}
              </div>

              {rfp.proposals && rfp.proposals.length > 0 ? (
                <div className="space-y-4">
                  {rfp.proposals.map((proposal) => (
                    <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {proposal.vendor?.name || 'Unknown Vendor'}
                          </h4>
                          {proposal.totalPrice && (
                            <p className="text-sm text-gray-600 mt-1">
                              Total: {proposal.currency || '$'}{proposal.totalPrice.toLocaleString()}
                            </p>
                          )}
                          {proposal.aiSummary && (
                            <p className="text-sm text-gray-500 mt-2">{proposal.aiSummary}</p>
                          )}
                        </div>
                        {proposal.aiScore !== null && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {proposal.aiScore.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-500">AI Score</div>
                          </div>
                        )}
                      </div>
                      {proposal.completeness !== null && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Completeness</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${proposal.completeness}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No proposals received yet.</p>
              )}
            </div>
          </div>

          {/* Comparison */}
          {showComparison && comparison && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Comparison & Recommendation</h3>
                
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Recommended Vendor</h4>
                  <p className="text-green-800 font-semibold">{comparison.recommendation.vendorName}</p>
                  <p className="text-sm text-green-700 mt-2">{comparison.recommendation.reasoning}</p>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Scores</h4>
                  <div className="space-y-3">
                    {comparison.scores.map((score) => (
                      <div key={score.vendorId} className="border border-gray-200 rounded-lg p-3">
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
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Send RFP */}
          {rfp.status === 'draft' && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Send RFP</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select vendors to send this RFP to:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {vendors.map((vendor) => (
                    <label
                      key={vendor.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
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
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {sendMutation.isPending ? 'Sending...' : 'Send RFP'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RFPDetailPage;

