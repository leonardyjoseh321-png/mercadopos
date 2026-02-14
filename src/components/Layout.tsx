import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ShoppingCart, Package, Users, Receipt, Calculator, BarChart3, Settings, LogOut, Menu, UsersRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { employeesDB } from '@/lib/db';
import type { Employee, EmployeePermission } from '@/types';

const navItems: { to: string; icon: typeof ShoppingCart; label: string; permission: EmployeePermission }[] = [
  { to: '/pos', icon: ShoppingCart, label: 'Punto de Venta', permission: 'pos' },
  { to: '/products', icon: Package, label: 'Inventario', permission: 'products' },
  { to: '/customers', icon: Users, label: 'Clientes', permission: 'customers' },
  { to: '/sales', icon: Receipt, label: 'Ventas', permission: 'sales' },
  { to: '/cash-register', icon: Calculator, label: 'Caja', permission: 'cash_register' },
  { to: '/reports', icon: BarChart3, label: 'Reportes', permission: 'reports' },
  { to: '/employees', icon: UsersRound, label: 'Empleados', permission: 'employees' },
  { to: '/settings', icon: Settings, label: 'Configuración', permission: 'settings' },
];

export default function Layout() {
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (user?.email) {
      employeesDB.getByEmail(user.email).then(emp => {
        if (emp) setEmployee(emp);
      });
    }
  }, [user]);

  const hasPermission = (permission: EmployeePermission) => {
    if (!employee) return true; // If no employee record, show all (admin/owner)
    return employee.permissions.includes(permission);
  };

  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={cn(
        "bg-sidebar flex flex-col shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className={cn("border-b border-sidebar-border flex items-center", collapsed ? "px-2 py-4 justify-center" : "px-4 py-5")}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">⚡ POS</h1>
              <p className="text-xs text-sidebar-foreground/50 mt-0.5">Punto de Venta</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu size={18} />
          </Button>
        </div>
        <nav className={cn("flex-1 py-4 space-y-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
          {visibleNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => cn(
                isActive ? 'sidebar-item-active' : 'sidebar-item',
                collapsed && 'justify-center px-0'
              )}
            >
              <item.icon size={18} />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>
        <div className={cn("py-4 border-t border-sidebar-border space-y-2", collapsed ? "px-2" : "px-3")}>
          {!collapsed && (
            <div className="px-4 py-2">
              <p className="text-xs text-sidebar-foreground/50 truncate">{employee?.name || user?.email}</p>
              {employee && (
                <p className="text-xs text-sidebar-primary font-medium">{employee.role === 'admin' ? 'Admin' : employee.role === 'supervisor' ? 'Supervisor' : 'Cajero'}</p>
              )}
            </div>
          )}
          <button
            onClick={signOut}
            title={collapsed ? 'Cerrar Sesión' : undefined}
            className={cn("sidebar-item w-full text-destructive/80 hover:text-destructive", collapsed && "justify-center px-0")}
          >
            <LogOut size={18} />
            {!collapsed && 'Cerrar Sesión'}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
