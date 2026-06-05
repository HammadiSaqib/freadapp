import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, contractsApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import AddClientDialog from '@/components/AddClientDialog';
import EliteEmployees from '@/components/EliteEmployees';
import { useScoreMachineEliteStatus } from '@/hooks/useScoreMachineEliteStatus';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { Plus, Pencil, Trash2, RefreshCw, Users, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type EmployeeUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'user' | 'funding_manager' | 'admin' | string;
  status: 'active' | 'inactive' | string;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Employee = {
  id: number;
  status: 'active' | 'inactive' | string;
  createdAt: string;
  updatedAt: string;
  user: EmployeeUser;
};

type CreateEmployeeInput = {
  email: string;
  firstName: string;
  lastName: string;
  role?: 'employee';
  status?: 'active' | 'inactive';
  password?: string;
};

type UpdateEmployeeInput = {
  firstName?: string;
  lastName?: string;
  status?: 'active' | 'inactive';
  password?: string;
};

function PageHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Employees</h1>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  children,
  variant = 'default',
  icon: Icon,
  disabled,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
}) {
  const base = 'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm';
  const variants: Record<string, string> = {
    default: 'bg-primary text-primary-foreground hover:opacity-90',
    outline: 'border border-input text-foreground hover:bg-muted',
    ghost: 'text-foreground hover:bg-muted',
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function EmployeesTable({ employees, onEdit, onToggle, onDeactivate, deactivatePending }: {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onToggle: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => void;
  deactivatePending: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Email</th>
            <th className="text-left p-3">Role</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Created</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id} className="border-t border-muted">
              <td className="p-3">{e.user.firstName} {e.user.lastName}</td>
              <td className="p-3">{e.user.email}</td>
              <td className="p-3 capitalize">{e.user.role}</td>
              <td className="p-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${e.user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                  {e.user.status}
                </span>
              </td>
              <td className="p-3">{new Date(e.createdAt).toLocaleDateString()}</td>
              <td className="p-3 text-right">
                <div className="flex justify-end gap-2">
                  <ActionButton variant="outline" icon={Pencil} onClick={() => onEdit(e)}>Edit</ActionButton>
                  <ActionButton variant="outline" icon={e.user.status === 'active' ? ToggleLeft : ToggleRight} onClick={() => onToggle(e)}>
                    {e.user.status === 'active' ? 'Deactivate' : 'Activate'}
                  </ActionButton>
                  <ActionButton variant="outline" icon={Trash2} onClick={() => onDeactivate(e)} disabled={deactivatePending}>
                    {deactivatePending ? 'Removing...' : 'Remove'}
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td className="p-6 text-center text-muted-foreground" colSpan={6}>No employees found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Employees() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const { isEliteActive } = useScoreMachineEliteStatus();

  const { data: employees = [], isLoading, refetch, isFetching } = useQuery<Employee[]>({
    queryKey: ['employees:list'],
    queryFn: async () => {
      const res = await employeesApi.getEmployees();
      return res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateEmployeeInput) => employeesApi.createEmployee(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees:list'] });
      setCreateOpen(false);
      setFormCreate({ email: '', firstName: '', lastName: '', role: 'employee', status: 'active', password: '' });
      toast({
        title: 'Success',
        description: 'Employee created successfully.',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error.message || 'Failed to create employee';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; payload: UpdateEmployeeInput }) => employeesApi.updateEmployee(vars.id, vars.payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees:list'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => employeesApi.toggleEmployeeStatus(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees:list'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => employeesApi.deactivateEmployee(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees:list'] });
      toast({
        title: 'Employee removed',
        description: 'The employee has been deactivated.',
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || 'Failed to remove employee';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);

  const [formCreate, setFormCreate] = useState<CreateEmployeeInput>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'employee',
    status: 'active',
    password: '',
  });

  const [formEdit, setFormEdit] = useState<UpdateEmployeeInput>({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const canSubmitCreate = useMemo(() => {
    return (
      formCreate.email.trim() !== '' &&
      formCreate.firstName.trim() !== '' &&
      formCreate.lastName.trim() !== ''
    );
  }, [formCreate]);

  const onOpenEdit = (employee: Employee) => {
    setEditTarget(employee);
    setFormEdit({
      firstName: employee.user.firstName,
      lastName: employee.user.lastName,
      status: (employee.user.status as 'active' | 'inactive') || 'active',
      password: '',
    });
    setEditOpen(true);
  };

  const renderContent = () => {
    if (isEliteActive) {
      return (
        <DashboardLayout 
          title="Employees" 
          description="Manage internal staff accounts and roles"
          onAddClient={() => setShowAddClient(true)}
        >
          <EliteEmployees
            employees={employees}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onEdit={onOpenEdit}
            onToggle={(e) => toggleMutation.mutate(e.id)}
            onDeactivate={(e) => deactivateMutation.mutate(e.id)}
            setCreateOpen={setCreateOpen}
            setShowAddClient={setShowAddClient}
            loading={isLoading}
            deactivatePending={deactivateMutation.isPending}
          />
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout 
        title="Employees" 
        description="Manage internal staff accounts and roles"
        onAddClient={() => setShowAddClient(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ActionButton icon={RefreshCw} variant="outline" onClick={() => refetch()} disabled={isFetching}>Refresh</ActionButton>
          </div>
          <ActionButton icon={Plus} onClick={() => setCreateOpen(true)}>Add Employee</ActionButton>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Loading employees...</div>
        ) : (
          employees?.length > 0 && (
            <EmployeesTable 
              employees={employees}
              onEdit={onOpenEdit}
              onToggle={(e) => toggleMutation.mutate(e.id)}
              onDeactivate={(e) => deactivateMutation.mutate(e.id)}
              deactivatePending={deactivateMutation.isPending}
            />
          )
        )}
      </DashboardLayout>
    );
  };

  return (
    <>
      {renderContent()}

      {/* Create Dialog */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setCreateOpen(false)} />
      )}
      {createOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${isEliteActive ? 'elite-nested-wrapper' : ''}`}>
          {isEliteActive && (
            <style dangerouslySetInnerHTML={{__html: `
              .elite-nested-wrapper .dialog-box {
                background-color: #ffffff !important;
                border: 0 !important;
                box-shadow: 0 20px 60px -15px rgba(0,0,0,0.15) !important;
                border-radius: 1.5rem !important;
                overflow: hidden !important;
                padding: 1.5rem !important;
                position: relative;
              }
              .dark .elite-nested-wrapper .dialog-box {
                background-color: #020617 !important;
                border: 1px solid #1e293b !important;
                box-shadow: 0 20px 60px -15px rgba(2, 6, 23, 0.75) !important;
              }
              .elite-nested-wrapper .dialog-box::before {
                content: '';
                position: absolute;
                top: 0; left: 0; width: 100%; height: 0.5rem;
                background: linear-gradient(to right, #00d4ff, #7000ff);
              }
              .elite-nested-wrapper label {
                font-size: 0.75rem !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
                color: #475569 !important;
              }
              .dark .elite-nested-wrapper label {
                color: #94a3b8 !important;
              }
              .elite-nested-wrapper input, .elite-nested-wrapper select {
                border-radius: 1rem !important;
                border: 1px solid #e2e8f0 !important;
                background-color: #f8fafc !important;
                color: #0f172a !important;
                font-weight: 600 !important;
                height: 3rem !important;
                box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.02) !important;
                transition: all 0.2s !important;
              }
              .dark .elite-nested-wrapper input,
              .dark .elite-nested-wrapper select {
                border-color: #334155 !important;
                background-color: #0f172a !important;
                color: #f8fafc !important;
                box-shadow: inset 0 2px 4px 0 rgb(2 6 23 / 0.35) !important;
              }
              .elite-nested-wrapper input:focus, .elite-nested-wrapper select:focus {
                background-color: #ffffff !important;
                border-color: #00d4ff !important;
                box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2) !important;
                outline: none !important;
              }
              .dark .elite-nested-wrapper input:focus,
              .dark .elite-nested-wrapper select:focus {
                background-color: #020617 !important;
                border-color: #22d3ee !important;
                box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.25) !important;
              }
              .elite-nested-wrapper h2 {
                font-size: 1.5rem !important;
                font-weight: 900 !important;
                background: linear-gradient(to right, #0f172a, #7000ff, #00d4ff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                letter-spacing: -0.025em;
              }
              .dark .elite-nested-wrapper h2 {
                background: linear-gradient(to right, #f8fafc, #a855f7, #22d3ee);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
              .elite-nested-wrapper button.btn-primary {
                background: linear-gradient(to right, #0f172a, #1e293b) !important;
                border-radius: 1rem !important;
                color: white !important;
                font-weight: 700 !important;
                height: 3rem !important;
                padding: 0 1.5rem !important;
              }
              .dark .elite-nested-wrapper button.btn-primary {
                background: linear-gradient(to right, #06b6d4, #7c3aed) !important;
                color: #f8fafc !important;
                box-shadow: 0 0 24px rgba(34, 211, 238, 0.25) !important;
              }
              .elite-nested-wrapper button.btn-outline {
                border-radius: 1rem !important;
                height: 3rem !important;
                font-weight: 700 !important;
                padding: 0 1.5rem !important;
                border: 1px solid #e2e8f0 !important;
                background: white !important;
                color: #475569 !important;
              }
              .dark .elite-nested-wrapper button.btn-outline {
                border-color: #334155 !important;
                background: #020617 !important;
                color: #e2e8f0 !important;
              }
            `}} />
          )}
          <div className={`w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg ${isEliteActive ? 'dialog-box' : ''}`} role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Employee</h2>
              <button className="text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-1" onClick={() => setCreateOpen(false)}>✕</button>
            </div>
            <div className="grid gap-4">
              <Field label="First Name">
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={formCreate.firstName}
                  onChange={(e) => setFormCreate({ ...formCreate, firstName: e.target.value })}
                />
              </Field>
              <Field label="Last Name">
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={formCreate.lastName}
                  onChange={(e) => setFormCreate({ ...formCreate, lastName: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className="w-full rounded-md border px-3 py-2"
                  value={formCreate.email}
                  onChange={(e) => setFormCreate({ ...formCreate, email: e.target.value })}
                />
              </Field>
              <Field label="Status">
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={formCreate.status || 'active'}
                  onChange={(e) => setFormCreate({ ...formCreate, status: e.target.value as 'active' | 'inactive' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    className="w-full rounded-md border px-3 py-2 pr-10"
                    value={formCreate.password || ''}
                    onChange={(e) => setFormCreate({ ...formCreate, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-slate-800"
                    onClick={() => setShowCreatePassword((v) => !v)}
                    aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className={isEliteActive ? 'btn-outline' : 'border rounded px-4 py-2 text-sm'} onClick={() => setCreateOpen(false)}>Cancel</button>
              <button
                className={isEliteActive ? 'btn-primary' : 'bg-primary text-primary-foreground rounded px-4 py-2 text-sm'}
                onClick={async () => {
                  await createMutation.mutateAsync({
                    email: formCreate.email,
                    firstName: formCreate.firstName,
                    lastName: formCreate.lastName,
                    role: 'employee',
                    status: formCreate.status || 'active',
                    password: formCreate.password || undefined,
                  });
                }}
                disabled={!canSubmitCreate || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditOpen(false)} />
      )}
      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Employee</h2>
              <button className="text-muted-foreground" onClick={() => setEditOpen(false)}>✕</button>
            </div>
            <div className="grid gap-4">
              <Field label="First Name">
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={formEdit.firstName || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, firstName: e.target.value })}
                />
              </Field>
              <Field label="Last Name">
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={formEdit.lastName || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, lastName: e.target.value })}
                />
              </Field>
              <Field label="Status">
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={formEdit.status || 'active'}
                  onChange={(e) => setFormEdit({ ...formEdit, status: e.target.value as 'active' | 'inactive' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    className="w-full rounded-md border px-3 py-2 pr-10"
                    value={formEdit.password || ''}
                    placeholder="Password"
                    onChange={(e) => setFormEdit({ ...formEdit, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                    onClick={() => setShowEditPassword((v) => !v)}
                    aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <ActionButton variant="outline" onClick={() => setEditOpen(false)}>Cancel</ActionButton>
              <ActionButton
                onClick={async () => {
                  if (!editTarget) return;
                  const payload = { ...formEdit };
                  if (!payload.password) {
                    delete (payload as any).password;
                  }
                  await updateMutation.mutateAsync({ id: editTarget.id, payload });
                  setEditOpen(false);
                  setEditTarget(null);
                  setFormEdit({});
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      <AddClientDialog
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
      />
    </>
  );
}
