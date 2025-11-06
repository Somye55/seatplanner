import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Button, 
  Avatar, 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem,
  Switch,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Checkbox,
  Spinner,
  Breadcrumbs,
  BreadcrumbItem
} from '@heroui/react';
import { authService } from '../services/authService';
import { api } from '../services/apiService';
import { useTheme } from '../providers/ThemeProvider';
import { Student, BRANCH_OPTIONS } from '../types';
import { ACCESSIBILITY_NEEDS } from '../constants';

const POSSIBLE_NEEDS = ACCESSIBILITY_NEEDS;

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
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader>My Profile</ModalHeader>
                        <ModalBody>
                            {loading && !student ? (
                                <div className="flex justify-center py-8">
                                    <Spinner size="lg" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {student && (
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Club / Branch</label>
                                            <p className="text-sm bg-default-100 p-3 rounded-lg">
                                                {BRANCH_OPTIONS.find(b => b.id === student.branch)?.label || student.branch}
                                            </p>
                                        </div>
                                    )}
                                    <Input
                                        label="Name"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        variant="bordered"
                                    />
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Accessibility Needs</label>
                                        <div className="space-y-2">
                                            {POSSIBLE_NEEDS.map(need => (
                                                <Checkbox
                                                    key={need.id}
                                                    isSelected={needs.includes(need.id)}
                                                    onValueChange={() => handleNeedsChange(need.id)}
                                                >
                                                    {need.label}
                                                </Checkbox>
                                            ))}
                                        </div>
                                    </div>
                                    {error && <p className="text-danger text-sm">{error}</p>}
                                </div>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button color="default" variant="light" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button color="primary" onPress={handleSave} isLoading={loading}>
                                Save Changes
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getUser();
  const isAdmin = authService.isAdmin();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);

  const navigation = isAdmin 
    ? [ 
        { name: 'Buildings', href: '/buildings', icon: '🏢' }, 
        { name: 'Students', href: '/students', icon: '👥' } 
      ] 
    : [ 
        { name: 'Buildings', href: '/buildings', icon: '🏢' } 
      ];

  useEffect(() => {
    const checkExpiry = () => {
      const expiry = localStorage.getItem('tokenExpiry');
      if (expiry) {
        const timeUntilExpiry = parseInt(expiry) - Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        setShowExpiryWarning(timeUntilExpiry > 0 && timeUntilExpiry < thirtyMinutes);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Generate breadcrumbs from current path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const crumbs = [{ name: 'Home', href: '/buildings' }];
    
    if (paths.includes('buildings') && paths.length > 1) {
      crumbs.push({ name: 'Buildings', href: '/buildings' });
      if (paths.includes('rooms')) {
        crumbs.push({ name: 'Rooms', href: location.pathname });
      }
    } else if (paths.includes('rooms')) {
      crumbs.push({ name: 'Seat Map', href: location.pathname });
    } else if (paths.includes('students')) {
      crumbs.push({ name: 'Students', href: '/students' });
    }
    
    return crumbs;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-content1 border-r border-divider transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-divider">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <img src="/assets/icon-512x512.png" alt="Logo" className="h-8 w-8" />
              <span className="text-xl font-bold">SeatPlanner</span>
            </div>
          )}
          {isCollapsed && (
            <img src="/assets/icon-512x512.png" alt="Logo" className="h-8 w-8 mx-auto" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-default-100'
                } ${isCollapsed ? 'justify-center' : ''}`
              }
              title={isCollapsed ? item.name : undefined}
            >
              <span className="text-xl">{item.icon}</span>
              {!isCollapsed && <span className="font-medium">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        <Divider />

        {/* User Section */}
        <div className="p-4 space-y-3">
          {/* Dark Mode Toggle */}
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            {!isCollapsed && <span className="text-sm">Dark Mode</span>}
            <Switch
              isSelected={theme === 'dark'}
              onValueChange={toggleTheme}
              size="sm"
              title={isCollapsed ? 'Toggle Dark Mode' : undefined}
            />
          </div>

          <Divider />

          {/* User Profile */}
          <Dropdown placement="top">
            <DropdownTrigger>
              <div className={`flex items-center gap-3 cursor-pointer hover:bg-default-100 p-2 rounded-lg ${isCollapsed ? 'justify-center' : ''}`}>
                <Avatar
                  name={user?.email?.charAt(0).toUpperCase()}
                  size="sm"
                  className="flex-shrink-0"
                />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                    <p className="text-xs text-default-500">{user?.role}</p>
                  </div>
                )}
              </div>
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu">
              {!isAdmin && (
                <DropdownItem key="profile" onPress={() => setIsProfileModalOpen(true)}>
                  My Profile
                </DropdownItem>
              )}
              <DropdownItem key="logout" color="danger" onPress={handleLogout}>
                Logout
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>

          {/* Collapse Toggle */}
          <Button
            isIconOnly={isCollapsed}
            variant="light"
            onPress={() => setIsCollapsed(!isCollapsed)}
            className="w-full"
          >
            {isCollapsed ? '→' : '← Collapse'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Session Warning */}
        {showExpiryWarning && (
          <div className="bg-warning text-warning-foreground px-4 py-2 text-center text-sm font-medium">
            ⚠️ Your session will expire soon. Please save your work and refresh the page to extend your session.
          </div>
        )}

        {/* Breadcrumbs */}
        <div className="bg-content1 border-b border-divider px-6 py-3">
          <Breadcrumbs>
            {getBreadcrumbs().map((crumb, index) => (
              <BreadcrumbItem key={index} onPress={() => navigate(crumb.href)}>
                {crumb.name}
              </BreadcrumbItem>
            ))}
          </Breadcrumbs>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      {!isAdmin && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default Layout;
