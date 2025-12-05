import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { rfpsApi, RFP } from '../api/rfps';

function RFPsPage() {
  const { data: rfps = [], isLoading, error } = useQuery<RFP[]>({
    queryKey: ['rfps'],
    queryFn: rfpsApi.getAll,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading RFPs...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">Error loading RFPs</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">RFPs</h2>
        <Link
          to="/rfps/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create New RFP
        </Link>
      </div>

      {rfps.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No RFPs yet. Create your first RFP!</p>
          <Link
            to="/rfps/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block"
          >
            Create RFP
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {rfps.map((rfp) => (
              <li key={rfp.id}>
                <Link to={`/rfps/${rfp.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {rfp.title}
                        </p>
                        <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rfp.status)}`}>
                          {rfp.status}
                        </span>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="text-sm text-gray-500">
                          {rfp.proposals?.length || 0} proposal{rfp.proposals?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {rfp.description}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        {rfp.budget && (
                          <span className="mr-4">Budget: ${rfp.budget.toLocaleString()}</span>
                        )}
                        {rfp.deadline && (
                          <span>Deadline: {new Date(rfp.deadline).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RFPsPage;

