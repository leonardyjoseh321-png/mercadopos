import { NavLink, Outlet } from 'react-router-dom';
import { ShoppingCart, Package, Users, Receipt, Calculator, BarChart3, Settings, LogOut, Database } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/pos', icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/products', icon: Package, label: 'Inventario' },
  { to: '/customers', icon: Users, label: 'Clientes' },
  { to: '/sales', icon: Receipt, label: 'Ventas' },
  { to: '/cash-register', icon: Calculator, label: 'Caja' },
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

export default function Layout() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-sidebar flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">⚡ POS System</h1>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5">Punto de Venta</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? 'sidebar-item-active' : 'sidebar-item'}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <div className="px-4 py-2">
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
          <button onClick={signOut} className="sidebar-item w-full text-destructive/80 hover:text-destructive">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
