import React from 'react';
import { 
  Shield, 
  Users, 
  Settings, 
  Plug, 
  Home,
  ChevronDown,
  ChevronRight,
  Mail,
  Building,
  UserCheck,
  FileText,
  Database
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onPageChange, 
  isCollapsed,
  onToggleCollapse 
}) => {
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>(['settings']);

  const toggleMenu = (menuId: string) => {
    if (isCollapsed) return; // Don't toggle menus when collapsed
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      page: 'dashboard'
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: UserCheck,
      page: 'employees'
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      page: 'users'
    },
    {
      id: 'policies',
      label: 'Policies',
      icon: FileText,
      page: 'policies'
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Database,
      page: 'categories'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      hasSubmenu: true,
      submenu: [
        {
          id: 'integrations',
          label: 'Integrations',
          icon: Plug,
          page: 'integrations'
        },
        {
          id: 'email-server',
          label: 'Email Server',
          icon: Mail,
          page: 'settings-email'
        },
        {
          id: 'company-details',
          label: 'Company Details',
          icon: Building,
          page: 'settings-company'
        }
      ]
    }
  ];

  const isActive = (page: string) => currentPage === page;
  const isMenuExpanded = (menuId: string) => expandedMenus.includes(menuId);

  return (
    <div className={`bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300 flex flex-col h-full ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div 
        className="py-4 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-blue-400 flex-shrink-0" />
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">SecureWatch</h1>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              {/* Main menu item */}
              <div>
                {item.hasSubmenu ? (
                  <button
                    onClick={() => toggleMenu(item.id)}
                    disabled={isCollapsed}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      isMenuExpanded(item.id) && !isCollapsed ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      isMenuExpanded(item.id) && !isCollapsed ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => onPageChange(item.page!)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.page!) ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                )}
              </div>

              {/* Submenu */}
              {item.hasSubmenu && isMenuExpanded(item.id) && !isCollapsed && (
                <ul className="mt-2 ml-4 space-y-1">
                  {item.submenu?.map((subItem) => (
                    <li key={subItem.id}>
                      <button
                        onClick={() => onPageChange(subItem.page)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                          isActive(subItem.page) ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <subItem.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{subItem.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};