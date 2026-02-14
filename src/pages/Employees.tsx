import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { employeesDB } from '@/lib/db';
import type { Employee, EmployeeRole, EmployeePermission } from '@/types';
import { PERMISSION_LABELS, ROLE_LABELS, ROLE_DEFAULT_PERMISSIONS } from '@/types';
import { toast } from 'sonner';

const ALL_PERMISSIONS: EmployeePermission[] = ['pos', 'products', 'customers', 'sales', 'cash_register', 'reports', 'settings', 'employees'];

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<EmployeeRole>('cajero');
  const [permissions, setPermissions] = useState<EmployeePermission[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setEmployees(await employeesDB.getAll());
  };

  const openForm = (emp?: Employee) => {
    if (emp) {
      setEditing(emp);
      setEmail(emp.email);
      setName(emp.name);
      setRole(emp.role);
      setPermissions([...emp.permissions]);
      setIsActive(emp.isActive);
    } else {
      setEditing(null);
      setEmail('');
      setName('');
      setRole('cajero');
      setPermissions([...ROLE_DEFAULT_PERMISSIONS.cajero]);
      setIsActive(true);
    }
    setShowForm(true);
  };

  const handleRoleChange = (newRole: EmployeeRole) => {
    setRole(newRole);
    setPermissions([...ROLE_DEFAULT_PERMISSIONS[newRole]]);
  };

  const togglePermission = (perm: EmployeePermission) => {
    setPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const save = async () => {
    if (!email || !name) return;
    const emp: Employee = {
      id: editing?.id || crypto.randomUUID(),
      email: email.toLowerCase().trim(),
      name,
      role,
      permissions,
      isActive,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    await employeesDB.put(emp);
    setShowForm(false);
    toast.success(editing ? 'Empleado actualizado' : 'Empleado creado');
    loadData();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este empleado?')) return;
    await employeesDB.delete(id);
    toast.success('Empleado eliminado');
    loadData();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Empleados</h1>
          <p className="text-sm text-muted-foreground">{employees.length} registrados</p>
        </div>
        <Button onClick={() => openForm()} className="gap-2"><Plus size={16} /> Nuevo Empleado</Button>
      </div>

      <div className="p-4 bg-primary/5 rounded-lg mb-4 text-sm text-muted-foreground">
        <Shield size={16} className="inline mr-2 text-primary" />
        Primero crea el usuario en Supabase, luego regístralo aquí con el <strong>mismo email</strong> para asignarle permisos. Los usuarios sin registro aquí tendrán acceso completo (admin).
      </div>

      <div className="pos-card-flat overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Permisos</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map(emp => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                <TableCell>
                  <Badge variant={emp.role === 'admin' ? 'default' : 'secondary'}>
                    {ROLE_LABELS[emp.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={emp.isActive ? 'outline' : 'destructive'}>
                    {emp.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                  {emp.permissions.map(p => PERMISSION_LABELS[p]).join(', ')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(emp)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(emp.id)}><Trash2 size={14} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No hay empleados registrados</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} Empleado</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Email (igual al de Supabase)</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="empleado@correo.com" /></div>
            <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" /></div>
            <div>
              <Label>Rol</Label>
              <Select value={role} onValueChange={v => handleRoleChange(v as EmployeeRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Permisos</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map(perm => (
                  <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-secondary/50">
                    <Checkbox
                      checked={permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                    {PERMISSION_LABELS[perm]}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={isActive} onCheckedChange={v => setIsActive(!!v)} />
              Empleado activo
            </label>
            <Button onClick={save} className="w-full" disabled={!email || !name}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
