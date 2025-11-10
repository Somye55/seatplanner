import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  CheckboxGroup,
  Spinner,
  Breadcrumbs,
  BreadcrumbItem,
} from "@heroui/react";
import { authService } from "../services/authService";
import { api } from "../services/apiService";
import { useTheme } from "../providers/ThemeProvider";
import { Student, BRANCH_OPTIONS } from "../types";
import { ACCESSIBILITY_NEEDS } from "../constants";
import { toast } from "../utils/toast";

const POSSIBLE_NEEDS = ACCESSIBILITY_NEEDS;

const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [name, setName] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [originalNeeds, setOriginalNeeds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError("");
      api
        .getStudentProfile()
        .then((profile) => {
          setStudent(profile);
          setName(profile.name);
          setNeeds(profile.accessibilityNeeds);
          setOriginalName(profile.name);
          setOriginalNeeds(profile.accessibilityNeeds);
        })
        .catch(() => setError("Failed to load profile."))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!student) return;
    setLoading(true);
    setError("");
    try {
      await api.updateStudentProfile({ name, accessibilityNeeds: needs });
      onClose();
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      toast.error("Failed to update profile", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleNeedsChange = (selectedNeeds: string[]) => {
    setNeeds(selectedNeeds);
  };

  // Check if any data has changed
  const hasChanges = () => {
    if (name !== originalName) return true;
    if (needs.length !== originalNeeds.length) return true;
    const sortedNeeds = [...needs].sort();
    const sortedOriginalNeeds = [...originalNeeds].sort();
    return !sortedNeeds.every(
      (need, index) => need === sortedOriginalNeeds[index]
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
                      <label className="block text-sm font-medium mb-2">
                        Club / Branch
                      </label>
                      <p className="text-sm bg-default-100 p-3 rounded-lg">
                        {BRANCH_OPTIONS.find((b) => b.id === student.branch)
                          ?.label || student.branch}
                      </p>
                    </div>
                  )}
                  <Input
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    variant="bordered"
                  />
                  <div className="border-2 border-dashed border-default-200 dark:border-default-100 rounded-xl p-4 bg-default-50 dark:bg-default-50/5">
                    <label className="text-sm font-semibold text-default-700">
                      Accessibility Needs (Optional)
                    </label>
                    <p className="text-xs text-default-500 mt-1 mb-3">
                      Select any requirements to help us provide better seating.
                    </p>
                    <CheckboxGroup
                      value={needs}
                      onValueChange={handleNeedsChange}
                      classNames={{ wrapper: "gap-3" }}
                    >
                      {POSSIBLE_NEEDS.map((need) => (
                        <Checkbox
                          key={need.id}
                          value={need.id}
                          classNames={{ label: "text-sm" }}
                        >
                          {need.label}
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  </div>
                  {error && <p className="text-danger text-sm">{error}</p>}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="light" onPress={onClose}>
                Cancel
              </Button>
              {hasChanges() && (
                <Button
                  color="primary"
                  onPress={handleSave}
                  isLoading={loading}
                >
                  Save Changes
                </Button>
              )}
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
  const isTeacher = user?.role === "Teacher";
  const isStudent = user?.role === "Student";
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);

  const isSuperAdmin = authService.isSuperAdmin();

  const navigation = isAdmin
    ? [
        { name: "Locations", href: "/locations", icon: "📍" },
        { name: "Blocks", href: "/blocks", icon: "🏗️" },
        { name: "Buildings", href: "/buildings", icon: "🏢" },
        { name: "Floors", href: "/floors", icon: "📐" },
        { name: "Students", href: "/students", icon: "👥" },
        { name: "Faculty", href: "/faculty", icon: "👨‍🏫" },
        ...(isSuperAdmin
          ? [{ name: "Admins", href: "/admins", icon: "👑" }]
          : []),
      ]
    : isTeacher
    ? [
        { name: "Find Room", href: "/find-room", icon: "🔍" },
        { name: "My Bookings", href: "/my-bookings", icon: "📅" },
        { name: "Locations", href: "/locations", icon: "📍" },
      ]
    : isStudent
    ? [
        { name: "My Bookings", href: "/student-bookings", icon: "📅" },
        { name: "Locations", href: "/locations", icon: "📍" },
      ]
    : [{ name: "Locations", href: "/locations", icon: "📍" }];

  useEffect(() => {
    const checkExpiry = () => {
      const expiry = localStorage.getItem("tokenExpiry");
      if (expiry) {
        const timeUntilExpiry = parseInt(expiry) - Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        setShowExpiryWarning(
          timeUntilExpiry > 0 && timeUntilExpiry < thirtyMinutes
        );
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/signin");
  };

  const toggleSidebar = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newCollapsed));
  };

  // Generate breadcrumbs from current path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean);
    const crumbs = [
      {
        name: "Home",
        href: isTeacher
          ? "/find-room"
          : isStudent
          ? "/student-bookings"
          : "/locations",
      },
    ];

    if (paths.includes("find-room")) {
      crumbs.push({ name: "Find Room", href: "/find-room" });
    } else if (paths.includes("my-bookings")) {
      crumbs.push({ name: "My Bookings", href: "/my-bookings" });
    } else if (paths.includes("student-bookings")) {
      crumbs.push({ name: "My Bookings", href: "/student-bookings" });
    } else if (paths.includes("locations")) {
      crumbs.push({ name: "Locations", href: "/locations" });
    } else if (paths.includes("blocks")) {
      crumbs.push({ name: "Blocks", href: "/blocks" });
    } else if (paths.includes("floors")) {
      crumbs.push({ name: "Floors", href: "/floors" });
    } else if (paths.includes("buildings") && paths.length > 1) {
      crumbs.push({ name: "Buildings", href: "/buildings" });
      if (paths.includes("rooms")) {
        crumbs.push({ name: "Rooms", href: location.pathname });
      }
    } else if (paths.includes("rooms")) {
      crumbs.push({ name: "Seat Map", href: location.pathname });
    } else if (paths.includes("students")) {
      crumbs.push({ name: "Students", href: "/students" });
    } else if (paths.includes("faculty")) {
      crumbs.push({ name: "Faculty", href: "/faculty" });
    } else if (paths.includes("admins")) {
      crumbs.push({ name: "Admins", href: "/admins" });
    }

    return crumbs;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } bg-content1 border-r border-divider transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-divider">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center px-2" : "px-4"
            } py-3 transition-all duration-300`}
          >
            <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
              <img
                src="/assets/icon-512x512.png"
                alt="Logo"
                className="h-8 w-8"
              />
            </div>
            {!isCollapsed && (
              <span className="font-medium ml-3 transition-opacity duration-300 text-xl font-bold whitespace-nowrap">
                SeatPlanner
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? "justify-center px-2" : "px-4"
                } py-3 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-default-100"
                }`
              }
              title={isCollapsed ? item.name : undefined}
            >
              <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                <span className="text-xl leading-none">{item.icon}</span>
              </div>
              {!isCollapsed && (
                <span className="font-medium ml-3 transition-opacity duration-300 whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <Divider />

        {/* User Section */}
        <div className="p-4 space-y-3">
          {/* User Profile */}
          <Dropdown placement="top">
            <DropdownTrigger>
              <div
                className={`flex items-center cursor-pointer hover:bg-default-100 p-2 rounded-lg transition-all duration-300 ${
                  isCollapsed ? "justify-center" : ""
                }`}
              >
                <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                  <Avatar
                    name={user?.email?.charAt(0).toUpperCase()}
                    size="sm"
                    className="w-6 h-6"
                  />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 ml-3 transition-opacity duration-300">
                    <p className="text-sm font-medium truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-default-500">{user?.role}</p>
                  </div>
                )}
              </div>
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu">
              {isStudent && (
                <DropdownItem
                  key="profile"
                  onPress={() => setIsProfileModalOpen(true)}
                >
                  My Profile
                </DropdownItem>
              )}
              <DropdownItem key="logout" color="danger" onPress={handleLogout}>
                Logout
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Session Warning */}
        {showExpiryWarning && (
          <div className="bg-warning text-warning-foreground px-4 py-2 text-center text-sm font-medium">
            ⚠️ Your session will expire soon. Please save your work and refresh
            the page to extend your session.
          </div>
        )}

        {/* Breadcrumbs */}
        <div className="bg-content1 border-b border-divider px-6 py-3 flex items-center justify-between">
          <Breadcrumbs>
            {getBreadcrumbs().map((crumb, index) => (
              <BreadcrumbItem key={index} onPress={() => navigate(crumb.href)}>
                {crumb.name}
              </BreadcrumbItem>
            ))}
          </Breadcrumbs>

          <div className="flex items-center gap-2">
            {/* Collapse Button */}
            <Button
              isIconOnly
              variant="light"
              onPress={toggleSidebar}
              size="sm"
              title="Toggle Sidebar"
            >
              <div className="flex items-center justify-center w-6 h-6">
                <img
                  src={
                    isCollapsed
                      ? "/assets/show-sidebar.svg"
                      : "/assets/hide-sidebar.svg"
                  }
                  alt={isCollapsed ? "Show sidebar" : "Hide sidebar"}
                  className="w-5 h-5 dark:invert"
                />
              </div>
            </Button>

            {/* Dark Mode Toggle */}
            <div className="flex items-center gap-2 bg-content1/70 dark:bg-content1/70 backdrop-blur-md p-2 rounded-full shadow-lg border border-default-200 dark:border-default-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
              <Switch
                isSelected={theme === "dark"}
                onValueChange={toggleTheme}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      {isStudent && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
