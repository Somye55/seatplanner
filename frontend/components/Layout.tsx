import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { api } from '../services/apiService';
import { Student, BRANCH_OPTIONS } from '../types';
import { Modal, Button, Spinner } from './ui';

// This could be moved to a shared constants file
const POSSIBLE_NEEDS = [
    { id: 'front_row', label: 'Front Row' },
    { id: 'wheelchair_access', label: 'Wheelchair Access' },
    { id: 'near_exit', label: 'Near Exit' },
    // Add other needs consistent with the backend/rest of frontend
];

const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const [student, setStudent] = useState<Student | null>(null);
    const [name, setName] = useState('');
    const [needs, setNeeds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setError('');
            api.getStudentProfile()
                .then(profile => {
                    setStudent(profile);
                    setName(profile.name);
                    setNeeds(profile.accessibilityNeeds);
                })
                .catch(() => setError("Failed to load profile."))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!student) return;
        setLoading(true);
        setError('');
        try {
            await api.updateStudentProfile({ name, accessibilityNeeds: needs });
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleNeedsChange = (needId: string) => {
        setNeeds(prev => 
            prev.includes(needId) ? prev.filter(n => n !== needId) : [...prev, needId]
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Profile">
            {loading && !student ? <Spinner /> : (
                <div className="space-y-4">
                     { student && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Club / Branch</label>
                            <p className="mt-1 text-sm text-gray-900 bg-gray-100 p-2 rounded-md">
                                {BRANCH_OPTIONS.find(b => b.id === student.branch)?.label || student.branch}
                            </p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border rounded-md shadow-sm p-2 border-gray-300" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Accessibility Needs</label>
                        <div className="mt-2 space-y-2">
                            {POSSIBLE_NEEDS.map(need => (
                                <label key={need.id} className="flex items-center">
                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" checked={needs.includes(need.id)} onChange={() => handleNeedsChange(need.id)} />
                                    <span className="ml-2 text-sm text-gray-700">{need.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
            )}
             <div className="mt-6 flex justify-end space-x-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
        </Modal>
    );
};


const Header: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const isAdmin = authService.isAdmin();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const navigation = isAdmin 
    ? [ { name: 'Buildings', href: '/buildings' }, { name: 'Students', href: '/students' }, { name: 'Planning', href: '/planning' } ] 
    : [ { name: 'Buildings', href: '/buildings' } ];

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <>
    <header className="bg-primary text-white shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img src="/assets/icon-512x512.png" alt="Logo" className="h-8 w-8" />
            </div>
            <span className="ml-3 text-2xl font-bold">SeatPlanner</span>
          </div>
          <div className="flex items-center">
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => (
                  <NavLink key={item.name} to={item.href} className={({ isActive }) => `${isActive ? 'bg-blue-900' : 'hover:bg-blue-800'} text-white px-3 py-2 rounded-md text-sm font-medium transition-colors`}>
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-6">
                <div className="text-sm text-gray-300">
                    { !isAdmin ? (
                        <button onClick={() => setIsProfileModalOpen(true)} className="hover:underline focus:outline-none">
                            {user?.email} ({user?.role})
                        </button>
                    ) : (
                        <span>{user?.email} ({user?.role})</span>
                    )}
                </div>
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
    {!isAdmin && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />}
    </>
  );
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
