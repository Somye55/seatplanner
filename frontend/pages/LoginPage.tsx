import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Branch } from '../types';

const POSSIBLE_NEEDS = [
    { id: 'front_row', label: 'Front Row' },
    { id: 'wheelchair_access', label: 'Wheelchair Access' },
    { id: 'near_exit', label: 'Near Exit' },
];

const BRANCHES = [
    { id: Branch.ConsultingClub, label: "Consulting Club" },
    { id: Branch.InvestmentBankingClub, label: "Investment Banking Club" },
    { id: Branch.TechAndInnovationClub, label: "Tech & Innovation Club" },
    { id: Branch.EntrepreneurshipCell, label: "Entrepreneurship Cell" },
    { id: Branch.SustainabilityAndCSRClub, label: "Sustainability & CSR Club" },
    { id: Branch.WomenInBusiness, label: "Women in Business" },
    { id: Branch.HealthcareManagementClub, label: "Healthcare Management Club" },
    { id: Branch.RealEstateClub, label: "Real Estate Club" },
];

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'Admin' | 'Student'>('Student');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]);
  const [branch, setBranch] = useState<Branch>(BRANCHES[0].id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNeedsChange = (needId: string) => {
    setAccessibilityNeeds(prev => 
        prev.includes(needId) ? prev.filter(n => n !== needId) : [...prev, needId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        await authService.signup(email, password, role, accessibilityNeeds, role === 'Student' ? branch : undefined);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input id="email" name="email" type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input id="password" name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          {!isLogin && (
            <>
            <div className="grid grid-cols-1 gap-y-6">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                <select id="role" name="role" className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={role} onChange={(e) => setRole(e.target.value as 'Admin' | 'Student')}>
                  <option value="Student">Student</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              {role === 'Student' && (
                  <>
                  <div>
                    <label htmlFor="branch" className="block text-sm font-medium text-gray-700">Club / Branch</label>
                    <select id="branch" name="branch" className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={branch} onChange={(e) => setBranch(e.target.value as Branch)}>
                        {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Accessibility Needs (Optional)</label>
                      <div className="mt-2 space-y-2 border border-gray-200 p-3 rounded-md">
                          {POSSIBLE_NEEDS.map(need => (
                              <label key={need.id} className="flex items-center">
                                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" checked={accessibilityNeeds.includes(need.id)} onChange={() => handleNeedsChange(need.id)} />
                                  <span className="ml-2 text-sm text-gray-700">{need.label}</span>
                              </label>
                          ))}
                      </div>
                  </div>
                  </>
              )}
            </div>
            </>
          )}

          {error && (<div className="text-red-600 text-sm text-center p-2 bg-red-100 rounded-md">{error}</div>)}

          <div>
            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </div>
          <div className="text-center">
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-indigo-600 hover:text-indigo-500 text-sm">
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
