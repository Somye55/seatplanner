import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useTheme } from '../providers/ThemeProvider';
import { Tooltip } from './ui';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const user = authService.getUser();
  const isAdmin = authService.isAdmin();

  const navigation = isAdmin 
    ? [
        { name: 'Buildings', href: '/buildings', icon: BuildingIcon },
        { name: 'Students', href: '/students', icon: UsersIcon }
      ] 
    : [
        { name: 'Buildings', href: '/buildings', icon: BuildingIcon }
      ];

  const handleLogout = () => {
    authService.logout();
    navigate('/signin');
  };

  return (
    <aside 
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-primary dark:bg-gray-900 text-white transition-all duration-300 flex flex-col h-screen fixed left-0 top-0 z-40`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-blue-700 dark:border-gray-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <img src="/assets/icon-512x512.png" alt="Logo" className="h-8 w-8" />
            <span className="text-xl font-bold">SeatPlanner</span>
          </div>
        )}
        {isCollapsed && (
          <img src="/assets/icon-512x512.png" alt="Logo" className="h-8 w-8 mx-auto" />
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 bg-primary dark:bg-gray-800 text-white rounded-full p-1 shadow-lg hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors"
      >
        {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => (
          <Tooltip key={item.name} content={item.name} placement="right" isDisabled={!isCollapsed}>
            <NavLink
              to={item.href}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-700 dark:bg-gray-800'
                    : 'hover:bg-blue-700 dark:hover:bg-gray-800'
                }`
              }
            >
              <item.icon />
              {!isCollapsed && <span className="font-medium">{item.name}</span>}
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-blue-700 dark:border-gray-800 p-4 space-y-2">
        {/* Theme Toggle */}
        <Tooltip content={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} placement="right" isDisabled={!isCollapsed}>
          <button
            onClick={toggleTheme}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} w-full px-3 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-gray-800 transition-colors`}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            {!isCollapsed && <span className="font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>
        </Tooltip>

        {/* User Info */}
        {!isCollapsed && (
          <div className="px-3 py-2 text-sm text-gray-300 dark:text-gray-400">
            <div className="font-medium truncate">{user?.email}</div>
            <div className="text-xs">{user?.role}</div>
          </div>
        )}

        {/* Logout */}
        <Tooltip content="Logout" placement="right" isDisabled={!isCollapsed}>
          <button
            onClick={handleLogout}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} w-full px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors`}
          >
            <LogoutIcon />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};

// Icons
const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
  </svg>
);

export default Sidebar;
