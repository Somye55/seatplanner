import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Input, 
  Button, 
  Select, 
  SelectItem, 
  Checkbox,
  Tabs,
  Tab
} from '@heroui/react';
import { authService } from '../services/authService';
import { Branch } from '../types';
import { ACCESSIBILITY_NEEDS } from '../constants';

const POSSIBLE_NEEDS = ACCESSIBILITY_NEEDS;

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-3 items-center pb-0 pt-6">
          <img src="/assets/icon-512x512.png" alt="Logo" className="h-16 w-16" />
          <h2 className="text-2xl font-bold text-center">
            {isLogin ? 'Sign in to SeatPlanner' : 'Create your account'}
          </h2>
        </CardHeader>
        <CardBody className="gap-4">
          <Tabs 
            fullWidth 
            selectedKey={isLogin ? 'login' : 'signup'}
            onSelectionChange={(key) => {
              setIsLogin(key === 'login');
              setError('');
            }}
          >
            <Tab key="login" title="Sign In" />
            <Tab key="signup" title="Sign Up" />
          </Tabs>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              variant="bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            
            <Input
              label="Password"
              type="password"
              variant="bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />

            {!isLogin && (
              <>
                <Select
                  label="Role"
                  variant="bordered"
                  selectedKeys={[role]}
                  onChange={(e) => setRole(e.target.value as 'Admin' | 'Student')}
                >
                  <SelectItem key="Student" value="Student">Student</SelectItem>
                  <SelectItem key="Admin" value="Admin">Admin</SelectItem>
                </Select>

                {role === 'Student' && (
                  <>
                    <Select
                      label="Club / Branch"
                      variant="bordered"
                      selectedKeys={[branch]}
                      onChange={(e) => setBranch(e.target.value as Branch)}
                    >
                      {BRANCHES.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </Select>

                    <div className="border border-default-200 rounded-lg p-4">
                      <label className="block text-sm font-medium mb-3">
                        Accessibility Needs (Optional)
                      </label>
                      <div className="space-y-2">
                        {POSSIBLE_NEEDS.map(need => (
                          <Checkbox
                            key={need.id}
                            isSelected={accessibilityNeeds.includes(need.id)}
                            onValueChange={() => handleNeedsChange(need.id)}
                          >
                            {need.label}
                          </Checkbox>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="bg-danger-50 dark:bg-danger-900/20 text-danger border border-danger-200 dark:border-danger-800 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={loading}
              className="w-full"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign up')}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default LoginPage;
