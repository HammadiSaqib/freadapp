import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building2, AlertCircle, Upload, Download, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FundingManagerLayout from '@/components/FundingManagerLayout';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';

const creditBureauOptions = ['Experian', 'Equifax', 'TransUnion'];
const US_STATES: { value: string; label: string }[] = [
  { value: 'USA', label: 'USA (Nationwide)' },
  { value: 'AL', label: 'Alabama (AL)' },
  { value: 'AK', label: 'Alaska (AK)' },
  { value: 'AZ', label: 'Arizona (AZ)' },
  { value: 'AR', label: 'Arkansas (AR)' },
  { value: 'CA', label: 'California (CA)' },
  { value: 'CO', label: 'Colorado (CO)' },
  { value: 'CT', label: 'Connecticut (CT)' },
  { value: 'DE', label: 'Delaware (DE)' },
  { value: 'FL', label: 'Florida (FL)' },
  { value: 'GA', label: 'Georgia (GA)' },
  { value: 'HI', label: 'Hawaii (HI)' },
  { value: 'ID', label: 'Idaho (ID)' },
  { value: 'IL', label: 'Illinois (IL)' },
  { value: 'IN', label: 'Indiana (IN)' },
  { value: 'IA', label: 'Iowa (IA)' },
  { value: 'KS', label: 'Kansas (KS)' },
  { value: 'KY', label: 'Kentucky (KY)' },
  { value: 'LA', label: 'Louisiana (LA)' },
  { value: 'ME', label: 'Maine (ME)' },
  { value: 'MD', label: 'Maryland (MD)' },
  { value: 'MA', label: 'Massachusetts (MA)' },
  { value: 'MI', label: 'Michigan (MI)' },
  { value: 'MN', label: 'Minnesota (MN)' },
  { value: 'MS', label: 'Mississippi (MS)' },
  { value: 'MO', label: 'Missouri (MO)' },
  { value: 'MT', label: 'Montana (MT)' },
  { value: 'NE', label: 'Nebraska (NE)' },
  { value: 'NV', label: 'Nevada (NV)' },
  { value: 'NH', label: 'New Hampshire (NH)' },
  { value: 'NJ', label: 'New Jersey (NJ)' },
  { value: 'NM', label: 'New Mexico (NM)' },
  { value: 'NY', label: 'New York (NY)' },
  { value: 'NC', label: 'North Carolina (NC)' },
  { value: 'ND', label: 'North Dakota (ND)' },
  { value: 'OH', label: 'Ohio (OH)' },
  { value: 'OK', label: 'Oklahoma (OK)' },
  { value: 'OR', label: 'Oregon (OR)' },
  { value: 'PA', label: 'Pennsylvania (PA)' },
  { value: 'RI', label: 'Rhode Island (RI)' },
  { value: 'SC', label: 'South Carolina (SC)' },
  { value: 'SD', label: 'South Dakota (SD)' },
  { value: 'TN', label: 'Tennessee (TN)' },
  { value: 'TX', label: 'Texas (TX)' },
  { value: 'UT', label: 'Utah (UT)' },
  { value: 'VT', label: 'Vermont (VT)' },
  { value: 'VA', label: 'Virginia (VA)' },
  { value: 'WA', label: 'Washington (WA)' },
  { value: 'WV', label: 'West Virginia (WV)' },
  { value: 'WI', label: 'Wisconsin (WI)' },
  { value: 'WY', label: 'Wyoming (WY)' }
];
const formatStateLabel = (code: string) => {
  const st = US_STATES.find(s => s.value === code);
  return st ? st.label : code;
};

interface Bank {
  id: number;
  name: string;
  logo?: string;
  state?: string;
  states?: string[];
  credit_bureaus?: string[];
  primary_bureau?: string;
  is_active: boolean;
  is_recommended?: boolean;
  created_at: string;
  updated_at: string;
}

interface BankStats {
  total: number;
  active: number;
  inactive: number;
}

const BankManagement: React.FC = () => {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const navigate = useNavigate();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [stats, setStats] = useState<BankStats>({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    state: '',
    states: [] as string[],
    credit_bureaus: [] as string[],
    primary_bureau: '',
    is_recommended: false,
  });
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [stateSelectOpen, setStateSelectOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100); // Default to show up to 100 per page
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 1 });

  // Fetch banks from API
  const fetchBanks = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required. Please log in as a funding manager.');
      }
      
      const response = await fetch(`${API_BASE}/api/banks?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. You need funding manager or admin privileges to view banks.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch banks (${response.status})`);
      }
      
      const data = await response.json();
      const normalizedBanks: Bank[] = (data.banks || []).map((b: any) => {
        let statesArr: string[] = [];
        try {
          if (typeof b?.state === 'string' && b.state.trim().startsWith('[')) {
            statesArr = JSON.parse(b.state);
          } else if (b?.state) {
            statesArr = [b.state];
          }
        } catch {}
        return {
          ...b,
          states: statesArr,
          credit_bureaus: Array.isArray(b?.credit_bureaus)
            ? b.credit_bureaus
            : (() => { try { return JSON.parse(b?.credit_bureaus || '[]'); } catch { return []; } })(),
        } as Bank;
      });
      setBanks(normalizedBanks);
      if (data.pagination) {
        setPagination({
          page: Number(data.pagination.page) || 1,
          limit: Number(data.pagination.limit) || limit,
          total: Number(data.pagination.total) || 0,
          totalPages: Number(data.pagination.totalPages) || 1,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch banks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required. Please log in as a funding manager.');
      }
      
      const response = await fetch(`${API_BASE}/api/banks/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. You need funding manager or admin privileges to view bank statistics.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch bank statistics (${response.status})`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchBanks();
    fetchStats();
  }, [searchTerm, statusFilter, page, limit]);

  const resetForm = () => {
    setFormData({
      name: '',
      logo: '',
      state: '',
      states: [],
      credit_bureaus: [],
      primary_bureau: '',
      is_recommended: false,
    });
    setSelectedStates([]);
    setEditingBank(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingBank ? `${API_BASE}/api/banks/${editingBank.id}` : `${API_BASE}/api/banks`;
      const method = editingBank ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        states: selectedStates.length > 0 ? selectedStates : (formData.state ? [formData.state] : []),
        state: undefined,
        credit_bureaus: formData.credit_bureaus,
        primary_bureau: formData.credit_bureaus.length === 1
          ? formData.credit_bureaus[0]
          : (formData.primary_bureau || undefined),
      } as any;
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save bank');
      }
      
      resetForm();
      fetchBanks();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bank');
    }
  };

  const handleEdit = async (bank: Bank) => {
    setEditingBank(bank);
    setShowAddForm(true);
    try {
      const res = await fetch(`${API_BASE}/api/banks/${bank.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const bureaus = Array.isArray(data?.credit_bureaus)
          ? data.credit_bureaus
          : (() => { try { return JSON.parse(data?.credit_bureaus || '[]'); } catch { return []; } })();
        let statesArr: string[] = [];
        try {
          if (typeof data?.state === 'string' && data.state.trim().startsWith('[')) {
            statesArr = JSON.parse(data.state);
          } else if (data?.state) {
            statesArr = [data.state];
          }
        } catch {}
        setFormData({
          name: data.name || bank.name,
          logo: data.logo || bank.logo || '',
          state: statesArr[0] || '',
          states: statesArr,
          credit_bureaus: bureaus,
          primary_bureau: data.primary_bureau || bank.primary_bureau || (bureaus.length === 1 ? bureaus[0] : ''),
          is_recommended: Boolean(data?.is_recommended ?? bank?.is_recommended ?? false),
        });
        setSelectedStates(statesArr);
      } else {
        setFormData({
          name: bank.name,
          logo: bank.logo || '',
          state: (bank.states && bank.states[0]) || bank.state || '',
          states: bank.states || (bank.state ? [bank.state] : []),
          credit_bureaus: bank.credit_bureaus || [],
          primary_bureau: bank.primary_bureau || ((bank.credit_bureaus || []).length === 1 ? (bank.credit_bureaus || [])[0] : ''),
          is_recommended: Boolean(bank?.is_recommended ?? false),
        });
        setSelectedStates(bank.states || (bank.state ? [bank.state] : []));
      }
    } catch {
      setFormData({
        name: bank.name,
        logo: bank.logo || '',
        state: (bank.states && bank.states[0]) || bank.state || '',
        states: bank.states || (bank.state ? [bank.state] : []),
        credit_bureaus: bank.credit_bureaus || [],
        primary_bureau: bank.primary_bureau || ((bank.credit_bureaus || []).length === 1 ? (bank.credit_bureaus || [])[0] : ''),
        is_recommended: Boolean(bank?.is_recommended ?? false),
      });
      setSelectedStates(bank.states || (bank.state ? [bank.state] : []));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bank?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/banks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete bank');
      
      fetchBanks();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bank');
    }
  };

  const toggleBankStatus = async (bank: Bank) => {
    try {
      const response = await fetch(`${API_BASE}/api/banks/${bank.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ is_active: !bank.is_active }),
      });
      
      if (!response.ok) throw new Error('Failed to update bank status');
      
      fetchBanks();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bank status');
    }
  };

  // Server handles search/status filtering via query params; use response as-is
  const filteredBanks = banks;

  if (loading) {
    return (
      <FundingManagerLayout title="Bank Management" description="Manage your banking partners and institutions">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </FundingManagerLayout>
    );
  }

  return (
    <FundingManagerLayout title="Bank Management" description="Manage your banking partners and institutions">
      <div className="p-6 max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error Loading Banks
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setError(null);
                      fetchBanks();
                      fetchStats();
                    }}
                    className="text-sm bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Banks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-green-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Banks</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-red-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive Banks</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search banks..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Per page</label>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={limit}
                  onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-sm border ${viewMode === 'table' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                <span className="sr-only">List</span>
                {/* simple icon replacement using unicode list if lucide Table not imported here */}
                List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-sm border ${viewMode === 'grid' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                <span className="sr-only">Grid</span>
                Grid
              </button>
            </div>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Bank
            </button>
            <button
              onClick={async () => {
                const params = new URLSearchParams();
                if (searchTerm) params.append('search', searchTerm);
                if (statusFilter !== 'all') params.append('status', statusFilter);
                const token = localStorage.getItem('auth_token');
                const res = await fetch(`${API_BASE}/api/banks/export?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'banks_export.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const token = localStorage.getItem('auth_token');
                  const fd = new FormData();
                  fd.append('file', file);
                  const res = await fetch(`${API_BASE}/api/banks/import`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
                  if (res.ok) { fetchBanks(); fetchStats(); }
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingBank ? 'Edit Bank' : 'Add New Bank'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter bank name"
                  />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Logo URL (Optional)
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.is_recommended}
                onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })}
              />
              <span className="text-sm text-gray-700">Recommended</span>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    States (USA) *
                  </label>
                  <Popover open={stateSelectOpen} onOpenChange={setStateSelectOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between">
                        <span className="truncate">
                          {selectedStates.length === 0 ? 'Select states' : selectedStates.includes('USA') ? 'USA (Nationwide)' : `${selectedStates.length} selected`}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0">
                      <Command>
                        <CommandInput placeholder="Search states..." />
                        <CommandList>
                          <CommandEmpty>No state found.</CommandEmpty>
                          <CommandGroup>
                            {US_STATES.map((st) => {
                              const checked = selectedStates.includes(st.value);
                              return (
                                <CommandItem
                                  key={st.value}
                                  onSelect={() => {
                                    const next = (() => {
                                      if (st.value === 'USA') {
                                        return selectedStates.includes('USA') ? [] : ['USA'];
                                      }
                                      const withoutUSA = selectedStates.filter((v) => v !== 'USA');
                                      if (withoutUSA.includes(st.value)) {
                                        return withoutUSA.filter((v) => v !== st.value);
                                      }
                                      return [...withoutUSA, st.value];
                                    })();
                                    setSelectedStates(next);
                                    setFormData((prev) => ({ ...prev, state: '', states: next }));
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <Checkbox checked={checked} onCheckedChange={() => {}} />
                                    <span>{st.label}</span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Bureaus *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {creditBureauOptions.map((bureau) => (
                      <label key={bureau} className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={formData.credit_bureaus.includes(bureau)}
                          onChange={() => {
                            setFormData((prev) => ({
                              ...prev,
                              credit_bureaus: (() => {
                                const next = prev.credit_bureaus.includes(bureau)
                                  ? prev.credit_bureaus.filter((b) => b !== bureau)
                                  : [...prev.credit_bureaus, bureau];
                                return next;
                              })(),
                              primary_bureau: (() => {
                                const next = prev.credit_bureaus.includes(bureau)
                                  ? prev.credit_bureaus.filter((b) => b !== bureau)
                                  : [...prev.credit_bureaus, bureau];
                                if (next.length === 0) return '';
                                if (next.length === 1) return next[0];
                                if (prev.primary_bureau && next.includes(prev.primary_bureau)) return prev.primary_bureau;
                                return next[0];
                              })(),
                            }));
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700">{bureau}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {formData.credit_bureaus.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Bureau *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.primary_bureau}
                    onChange={(e) => setFormData((prev) => ({ ...prev, primary_bureau: e.target.value }))}
                  >
                    <option value="">Select primary bureau</option>
                    {formData.credit_bureaus.map((bureau) => (
                      <option key={bureau} value={bureau}>{bureau}</option>
                    ))}
                  </select>
                </div>
              )}
              
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingBank ? 'Update Bank' : 'Add Bank'}
              </button>
            </div>
          </form>
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBanks.map((bank) => (
              <div
                key={bank.id}
                onClick={() => navigate(`/funding-manager/banks/${bank.id}`)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200 hover:border-blue-300"
              >
                <div className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      {bank.logo ? (
                        <img
                          src={bank.logo}
                          alt={bank.name}
                          className="h-16 w-16 rounded-lg object-contain border-2 border-gray-200 bg-white p-1"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-gray-200 ${bank.logo ? 'hidden' : ''}`}>
                        <Building2 className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{bank.name}</h3>
                    <div className="mb-2 text-sm text-gray-700">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(bank.states && bank.states.length > 0 ? bank.states : (bank.state ? [bank.state] : [])).map((code) => (
                          <span key={code} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {formatStateLabel(code)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(bank.credit_bureaus || []).map((b) => (
                          <span key={b} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bank.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {bank.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex space-x-2 w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(bank);
                        }}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(bank.id);
                        }}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Bureaus</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBanks.map((bank) => (
                  <tr key={bank.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {bank.logo ? (
                          <img
                            src={bank.logo}
                            alt={bank.name}
                            className="h-10 w-10 rounded object-contain mr-4 border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 bg-blue-100 rounded flex items-center justify-center mr-4">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{bank.name}</div>
                          <button
                            onClick={() => navigate(`/funding-manager/banks/${bank.id}`)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        {(bank.states && bank.states.length > 0 ? bank.states : (bank.state ? [bank.state] : [])).map((code) => (
                          <span key={code} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {formatStateLabel(code)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        {(bank.credit_bureaus || []).map((bureau) => (
                          <span key={bureau} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {bureau}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleBankStatus(bank)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bank.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                      >
                        {bank.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(bank)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bank.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages} • {pagination.total} total
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={pagination.page <= 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={() => setPage(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Last
            </button>
          </div>
        </div>
        
        {/* Empty State */}
        {filteredBanks.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No banks found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first bank.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
    </FundingManagerLayout>
  );
};

export default BankManagement;
