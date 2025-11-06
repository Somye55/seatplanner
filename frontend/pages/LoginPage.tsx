import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  CardFooter,
  Input, 
  Button, 
  Select, 
  SelectItem, 
  Checkbox,
  CheckboxGroup,
  Tabs,
  Tab,
  Divider,
  Chip
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

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25C22.56 11.45 22.49 10.68 22.36 9.92H12V14.4H18.19C17.93 15.89 17.15 17.16 15.98 17.96V20.7H19.8C21.66 18.94 22.56 15.93 22.56 12.25Z" fill="#4285F4"/>
    <path d="M12 23C15.24 23 17.95 21.92 19.8 20.7L15.98 17.96C14.91 18.66 13.56 19.08 12 19.08C9.38 19.08 7.15 17.38 6.3 15.08L2.31 15.08V17.9C4.17 21.04 7.85 23 12 23Z" fill="#34A853"/>
    <path d="M6.3 15.08C6.1 14.5 6 13.86 6 13.2C6 12.54 6.1 11.9 6.3 11.32V8.52L2.31 8.52C1.56 10.04 1.11 11.57 1.11 13.2C1.11 14.83 1.56 16.36 2.31 17.9L6.3 15.08Z" fill="#FBBC05"/>
    <path d="M12 7.32C13.63 7.32 14.99 7.89 15.98 8.82L19.87 4.93C17.95 3.08 15.24 2 12 2C7.85 2 4.17 4.96 2.31 8.52L6.3 11.32C7.15 9.02 9.38 7.32 12 7.32Z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.942.359.308.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
    </svg>
);


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
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-primary-100 via-secondary-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-black p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary-100/40 via-transparent to-transparent dark:from-primary-900/30" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-secondary-100/40 via-transparent to-transparent dark:from-secondary-900/30" />
            
            <div className="relative z-10 flex flex-col items-center">
                <img 
                    src="/assets/icon-512x512.png" 
                    alt="SeatPlanner Logo" 
                    className="h-32 w-32 mx-auto mb-8 drop-shadow-2xl"
                />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400 bg-clip-text text-transparent mb-4">
                    Welcome to SeatPlanner
                </h1>
                <p className="text-lg text-default-600 dark:text-default-300 max-w-md mx-auto">
                    Streamlining event seating for clubs and organizations with accessibility in mind.
                </p>
            </div>
        </div>

        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-950">
            <div className="w-full max-w-md">
                <Card 
                    className="w-full shadow-2xl border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg"
                    shadow="lg"
                >
                    <CardHeader className="flex flex-col gap-4 items-center pb-2 pt-8 px-8">
                        <div className="text-center space-y-1">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400 bg-clip-text text-transparent">
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </h1>
                            <p className="text-sm text-default-500">
                                {isLogin ? 'Welcome back! Enter your details to continue' : 'Join us today! It only takes a minute'}
                            </p>
                        </div>
                    </CardHeader>

                    <CardBody className="gap-6 px-8 py-6">
                        <Tabs 
                            fullWidth 
                            size="lg"
                            color="primary"
                            variant="underlined"
                            selectedKey={isLogin ? 'login' : 'signup'}
                            onSelectionChange={(key) => { setIsLogin(key === 'login'); setError(''); }}
                            classNames={{
                                tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                                cursor: "w-full bg-primary-500",
                                tab: "max-w-fit px-0 h-12",
                                tabContent: "group-data-[selected=true]:text-primary-600 dark:group-data-[selected=true]:text-primary-400 font-semibold"
                            }}
                        >
                            <Tab key="login" title="Sign In" />
                            <Tab key="signup" title="Sign Up" />
                        </Tabs>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <Input
                                label="Email Address"
                                type="email"
                                variant="bordered"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="you@example.com"
                                classNames={{
                                    inputWrapper: "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500"
                                }}
                            />
                            
                            <Input
                                label="Password"
                                type="password"
                                variant="bordered"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                                classNames={{
                                    inputWrapper: "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500"
                                }}
                            />

                            {!isLogin && (
                                <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Select
                                        label="Select Your Role"
                                        variant="bordered"
                                        selectedKeys={[role]}
                                        onChange={(e) => setRole(e.target.value as 'Admin' | 'Student')}
                                        classNames={{ trigger: "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500" }}
                                    >
                                        <SelectItem key="Student">Student</SelectItem>
                                        <SelectItem key="Admin">Admin</SelectItem>
                                    </Select>

                                    {role === 'Student' && (
                                        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <Select
                                                label="Club / Branch"
                                                variant="bordered"
                                                selectedKeys={[branch]}
                                                onChange={(e) => setBranch(e.target.value as Branch)}
                                                classNames={{ trigger: "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500" }}
                                            >
                                                {BRANCHES.map(b => <SelectItem key={b.id}>{b.label}</SelectItem>)}
                                            </Select>

                                            <div className="border-2 border-dashed border-default-200 dark:border-default-100 rounded-xl p-4 bg-default-50 dark:bg-default-50/5">
                                                <label className="text-sm font-semibold text-default-700">Accessibility Needs (Optional)</label>
                                                <p className="text-xs text-default-500 mt-1 mb-3">Select any requirements to help us provide better seating.</p>
                                                <CheckboxGroup value={accessibilityNeeds} onValueChange={setAccessibilityNeeds} classNames={{ wrapper: "gap-3" }}>
                                                    {POSSIBLE_NEEDS.map(need => <Checkbox key={need.id} value={need.id} classNames={{ label: "text-sm" }}>{need.label}</Checkbox>)}
                                                </CheckboxGroup>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {error && (
                                <div className="bg-danger-50 text-danger-600 border border-danger-200 rounded-lg p-3 text-sm flex items-start gap-3">
                                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                    <span>{error}</span>
                                </div>
                            )}

                            <Button type="submit" color="primary" size="lg" isLoading={loading} className="w-full font-semibold shadow-lg shadow-primary-500/30 dark:shadow-primary-500/20">
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </Button>
                        </form>
                        
                        <div className="flex items-center gap-4">
                            <Divider className="flex-1" />
                            <span className="text-xs text-default-500">OR</span>
                            <Divider className="flex-1" />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button variant="bordered" className="w-full" startContent={<GoogleIcon />}>Continue with Google</Button>
                            <Button variant="bordered" className="w-full" startContent={<GitHubIcon />}>Continue with GitHub</Button>
                        </div>

                    </CardBody>
                    <CardFooter className="px-8 pb-8 pt-4">
                        <p className="text-xs text-center text-default-400 w-full">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-semibold text-primary-500 hover:underline ml-1">
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
