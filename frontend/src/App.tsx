import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import RFPsPage from './pages/RFPsPage';
import VendorsPage from './pages/VendorsPage';
import RFPDetailPage from './pages/RFPDetailPage';
import CreateRFPPage from './pages/CreateRFPPage';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname === '/');

  return (
    <Link
      to={to}
      className={`${
        isActive
          ? 'border-blue-500 text-gray-900'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
    >
      {children}
    </Link>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">AI RFP Manager</h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <NavLink to="/">RFPs</NavLink>
                  <NavLink to="/vendors">Vendors</NavLink>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-fade-in">
          <Routes>
            <Route path="/" element={<RFPsPage />} />
            <Route path="/rfps/new" element={<CreateRFPPage />} />
            <Route path="/rfps/:id" element={<RFPDetailPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

