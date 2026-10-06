import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  FileText, 
  Receipt, 
  LineChart, 
  UserCheck, 
  LogOut, 
  Menu, 
  X, 
  Shield, 
  Bell,
  Scale, 
  FileCheck, 
  Settings, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Sun, 
  Moon,
  Search,
  Plus,
  Palette,
  Check,
  ChevronDown,
  Building,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout, role, isAdmin, isManager, isStaff } = useAuth();
  const { settings } = useSettings();
  const { theme, toggleTheme, accent, setAccent, accentsList } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Keyboard shortcut Ctrl+K / Cmd+K to open global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowQuickActionMenu(false);
        setShowAccentPicker(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Role-Based Navigation Items
  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
    { name: 'Create Lead', path: '/create-lead', icon: UserPlus, roles: ['admin', 'manager', 'staff'] },
    { name: 'External Lead', path: '/leads', icon: Users, roles: ['admin', 'manager', 'staff'] },
    { name: 'Loan Applications', path: '/loans', icon: FileText, roles: ['admin', 'manager', 'staff'] },
    { name: 'Receipting', path: '/emis', icon: Receipt, roles: ['admin', 'manager', 'staff'] },
    { name: 'Loan Statement', path: '/emi-report', icon: FileCheck, roles: ['admin', 'manager', 'staff'] },
    { name: 'Profit / Loss Report', path: '/reports', icon: LineChart, roles: ['admin'] },
    { name: 'Total Profit & Loss', path: '/total-profit-loss', icon: Scale, roles: ['admin'] },
    { name: 'Registered Users', path: '/users', icon: UserCheck, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
    { name: 'Public Website', path: '/public', icon: Globe, roles: ['admin', 'manager', 'staff'] },
  ];

  // Dynamic Navigation Items Filtered by User Role
  const navItems = allNavItems.filter(item => !item.roles || item.roles.includes(role || 'staff'));

  // Quick Search Index
  const filteredSearchResults = searchQuery.trim() === ''
    ? navItems
    : navItems.filter(item => 
        String(item?.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
      );

  // Dynamic Breadcrumb Label
  const getBreadcrumb = () => {
    const path = location.pathname;
    const current = navItems.find(item => item.path === path);
    return current ? current.name : 'Dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 bg-[#fafafa] dark:bg-[#0f0f0f] transition-colors duration-200">
      
      {/* Mobile Top App Bar */}
      <div className="print:hidden md:hidden bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white flex items-center justify-between px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--crm-gradient)' }}>
            <Shield className="h-3.5 w-3.5" />
          </div>
          <div>
            <h1 className="font-semibold text-xs tracking-tight truncate max-w-[190px]">
              {settings.institution_name || 'Kaspr Microfinance'}
            </h1>
            <p className="text-[9px] text-slate-400 font-medium">NBFC-MFI CRM Suite</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Search className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-slate-900/60 animate-in fade-in duration-150"
        />
      )}

      {/* Modern CRM Collapsible Sidebar */}
      <aside className={`
        print:hidden fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-200 transform transition-all duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:flex md:flex-col border-r border-slate-200 dark:border-slate-800
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'md:w-[64px]' : 'md:w-[230px]'}
        w-[230px]
      `}>
        
        {/* Brand Header */}
        <div className={`h-12 flex items-center border-b border-slate-200 dark:border-slate-800 transition-all ${isCollapsed ? 'px-2.5 justify-center' : 'px-3.5 justify-between'}`}>
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div 
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ background: 'var(--crm-gradient)' }}
            >
              <Shield className="h-3.5 w-3.5" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-semibold text-slate-900 dark:text-white text-xs leading-snug truncate">
                  {settings.institution_name || 'Kaspr Microfinance'}
                </h1>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                    {settings.branch_code || 'BR-01'} • Active
                  </p>
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Original Sidebar Navigation Links */}
        <nav className="flex-1 px-2.5 py-2.5 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={({ isActive }) => `
                  flex items-center rounded-lg text-xs font-medium transition-all duration-150 group relative
                  ${isCollapsed ? 'justify-center p-2 my-0.5' : 'px-2.5 py-1.5 justify-between'}
                  ${isActive 
                    ? 'text-white font-medium' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}
                `}
                style={({ isActive }) => isActive ? { background: 'var(--crm-gradient)' } : {}}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer User Profile */}
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center space-x-2 overflow-hidden">
              <div 
                className="h-7 w-7 rounded-lg flex items-center justify-center font-medium text-xs text-white shrink-0"
                style={{ background: 'var(--crm-primary)' }}
              >
                {user?.name?.charAt(0) || 'A'}
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{user?.name || 'Authorized Officer'}</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 capitalize font-bold truncate">
                    {isAdmin ? 'System Admin' : (isManager ? 'Branch Manager' : 'Field Staff')}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                title="Logout Session"
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

      </aside>

      {/* Main CRM Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        
        {/* Modern CRM Top Header Bar */}
        <header className="print:hidden hidden md:flex h-12 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-slate-800 items-center justify-between px-4 sticky top-0 z-30">
          
          {/* Left: Sidebar Toggle & Breadcrumb */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Breadcrumb path */}
            <div className="flex items-center space-x-2 text-xs">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium text-slate-400">Portal</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{getBreadcrumb()}</span>
            </div>
          </div>

          {/* Center: Global Search Bar */}
          <div className="flex-1 max-w-md mx-6">
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all text-xs cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <span>Quick search loan #, customer, lead, ledger...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right: Quick Actions, Theme Customizer, Notifications, Profile */}
          <div className="flex items-center space-x-2.5">
            
            {/* Quick Action Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActionMenu(!showQuickActionMenu)}
                className="crm-btn-primary h-8 px-3 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Quick Action</span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>

              {showQuickActionMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1.5 text-xs z-50 animate-in fade-in duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-medium uppercase text-slate-400 tracking-wider">
                    Fast Workflows
                  </div>
                  <button
                    onClick={() => { setShowQuickActionMenu(false); navigate('/loans'); }}
                    className="w-full text-left px-2.5 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                    <span>New Loan Application</span>
                  </button>
                  <button
                    onClick={() => { setShowQuickActionMenu(false); navigate('/emis'); }}
                    className="w-full text-left px-2.5 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Record EMI Payment</span>
                  </button>
                  <button
                    onClick={() => { setShowQuickActionMenu(false); navigate('/create-lead'); }}
                    className="w-full text-left px-2.5 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-teal-500" />
                    <span>Create New Lead</span>
                  </button>
                  <button
                    onClick={() => { setShowQuickActionMenu(false); navigate('/reports'); }}
                    className="w-full text-left px-2.5 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2 text-slate-800 dark:text-slate-200 cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1 pt-1"
                  >
                    <LineChart className="h-3.5 w-3.5 text-blue-500" />
                    <span>Branch P&L Audit</span>
                  </button>
                </div>
              )}
            </div>

            {/* Dynamic Accent Color Switcher Popover */}
            <div className="relative">
              <button 
                onClick={() => setShowAccentPicker(!showAccentPicker)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Dynamic CRM Theme Accents"
              >
                <Palette className="h-4 w-4" />
              </button>

              {showAccentPicker && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2 text-xs z-50 animate-in fade-in duration-150">
                  <div className="px-2 py-1 text-[10px] font-medium uppercase text-slate-400 tracking-wider">
                    CRM Theme Accent
                  </div>
                  <div className="space-y-1 mt-1">
                    {accentsList.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setAccent(item.id); setShowAccentPicker(false); }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                          accent === item.id 
                            ? 'bg-slate-100 dark:bg-slate-800 font-medium text-slate-900 dark:text-white' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.hex }} />
                          <span>{item.name}</span>
                        </div>
                        {accent === item.id && <Check className="h-3.5 w-3.5 text-slate-800 dark:text-slate-200" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Dark / Light Mode"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
              >
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500"></span>
                <Bell className="h-4 w-4" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3 text-xs z-50 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                    <span className="font-medium text-slate-900 dark:text-white">Live System Alerts</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded">All Good</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <p className="font-bold text-slate-800 dark:text-slate-200">RBI Master Direction Active</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">KFS APR disclosure and microfinance limits are enforced.</p>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <p className="font-bold text-slate-800 dark:text-slate-200">KYC Re-Apply Scan</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time cross-search active for Aadhaar, PAN, and Guarantors.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Officer Profile Badge */}
            <div className="flex items-center space-x-2 pl-1">
              <div 
                className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0"
                style={{ background: 'var(--crm-primary)' }}
              >
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name || 'Loan Officer'}</p>
                <p className="text-[10px] text-slate-400 capitalize font-medium">
                  {isAdmin ? 'System Admin' : (isManager ? 'Branch Manager' : 'Field Staff')}
                </p>
              </div>
            </div>

          </div>
        </header>

        {/* Global Quick Search Modal (Ctrl + K) */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-start justify-center pt-20 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-3">
                <Search className="h-4 w-4 text-slate-400 ml-1" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Type a screen, loan, customer, or report name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                />
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">ESC</kbd>
              </div>

              <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setShowSearchModal(false);
                          setSearchQuery('');
                          navigate(item.path);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 cursor-pointer text-left transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.path === '/' ? '/dashboard' : item.path}</p>
                          </div>
                        </div>
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No matching CRM screen or module found for "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Page Content Outlet */}
        <main className="flex-1 overflow-y-auto print:overflow-visible print:p-0 p-3 sm:p-4 lg:p-5">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
