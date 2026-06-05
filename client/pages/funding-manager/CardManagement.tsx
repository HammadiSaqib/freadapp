import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, CreditCard, AlertCircle, Upload, Download, X, LayoutGrid, Table, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import FundingManagerLayout from '@/components/FundingManagerLayout';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';

interface Bank {
  id: number;
  name: string;
  logo?: string;
  is_active: boolean;
}

interface Card {
  id: number;
  card_image?: string;
  bank_id: number;
  bank_name?: string;
  card_name: string;
  card_link: string;
  card_type: 'business' | 'personal';
  funding_type: string;
  credit_bureaus: string[];
  states?: string[];
  state?: string;
  amount_approved?: number;
  no_of_usage?: number;
  average_amount?: number;
  // Optional fields for new metrics; shown if backend provides them
  total_amount_approved?: number;
  approved_clients_count?: number;
  highest_amount_approved?: number;
  rejected_clients_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CardStats {
  total: number;
  active: number;
  inactive: number;
  business: number;
  personal: number;
}

const CardManagement: React.FC = () => {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const [cards, setCards] = useState<Card[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [stats, setStats] = useState<CardStats>({ total: 0, active: 0, inactive: 0, business: 0, personal: 0 });
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'business' | 'personal'>('all');
  const [bankFilter, setBankFilter] = useState<'all' | string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [formData, setFormData] = useState({
    card_image: '',
    bank_id: '',
    card_name: '',
    card_link: '',
    card_type: 'business' as 'business' | 'personal',
    funding_type: '',
    credit_bureaus: [] as string[],
  });
  
  const [bankFilterOpen, setBankFilterOpen] = useState(false);
  const [bankSelectOpen, setBankSelectOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('API_BASE', API_BASE);
  }, []);

  // Funding type options based on card type
  const fundingTypeOptions = {
    business: ['Credit Card', 'Loans', 'SBA Loans', 'Merchant Cash Advance', 'Line of Credit'],
    personal: [
      'Credit Card',
      'Loans',
      'Sub Prime Lenders',
      'Line of Credit',
      'Home Loan',
      'Auto Loan',
      'Mortgages',
      'Home Equity Loans',
      'Home Lines of Credit'
    ]
  };

  

  // United States states (labels include short code in parentheses)
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

  // Fetch all banks for dropdown (paginate to retrieve all pages)
  const fetchBanks = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      const limit = 100; // server caps at 100 per page
      let page = 1;
      let allBanks: Bank[] = [];
      let totalPages = 1;

      // First page
      const firstRes = await fetch(`${API_BASE}/api/banks?status=active&limit=${limit}&page=${page}` , {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!firstRes.ok) throw new Error('Failed to fetch banks');
      const firstData = await firstRes.json();
      allBanks = (firstData.banks || []) as Bank[];
      totalPages = Number(firstData?.pagination?.totalPages || 1);

      // Subsequent pages
      while (page < totalPages) {
        page += 1;
        const res = await fetch(`${API_BASE}/api/banks?status=active&limit=${limit}&page=${page}` , {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch banks');
        const data = await res.json();
        allBanks = allBanks.concat((data.banks || []) as Bank[]);
      }

      setBanks(allBanks);
    } catch (err) {
      console.error('Error fetching banks:', err);
    }
  };

  // Fetch cards from API
  const fetchCards = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (bankFilter !== 'all') params.append('bank_id', bankFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const response = await fetch(`${API_BASE}/api/cards?${params.toString()}`, {
         headers: {
           'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
         },
       });
      
      if (!response.ok) throw new Error('Failed to fetch cards');
      
      const data = await response.json();
      console.log('cards api raw data', data.cards);
      const normalizedCards: Card[] = (data.cards || []).map((c: any) => {
        const rawStates = c?.states;
        const parsedStates = Array.isArray(rawStates)
          ? rawStates
          : (() => {
              try {
                const parsed = JSON.parse(rawStates || '[]');
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })();

        const rawBureaus = c?.credit_bureaus;
        let creditBureaus: string[] = [];
        if (Array.isArray(rawBureaus)) {
          creditBureaus = rawBureaus.filter((bureau): bureau is string => typeof bureau === 'string' && bureau.trim().length > 0);
        } else if (typeof rawBureaus === 'string' && rawBureaus.trim().length > 0) {
          try {
            const parsed = JSON.parse(rawBureaus);
            if (Array.isArray(parsed)) {
              creditBureaus = parsed.filter((bureau): bureau is string => typeof bureau === 'string' && bureau.trim().length > 0);
            } else {
              creditBureaus = rawBureaus
                .split(',')
                .map((bureau) => bureau.trim())
                .filter((bureau) => bureau.length > 0);
            }
          } catch {
            creditBureaus = rawBureaus
              .split(',')
              .map((bureau) => bureau.trim())
              .filter((bureau) => bureau.length > 0);
          }
        }

        return {
          ...c,
          credit_bureaus: creditBureaus,
          states: parsedStates,
        };
      });
      console.log('normalized cards states sample', normalizedCards.map((c) => ({ id: c.id, states: c.states, state: c.state })).slice(0, 10));
      setCards(normalizedCards);
      if (data.pagination) {
        setPagination({
          page: Number(data.pagination.page) || 1,
          limit: Number(data.pagination.limit) || limit,
          total: Number(data.pagination.total) || 0,
          totalPages: Number(data.pagination.pages) || 1,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cards');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Fetch card statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/cards/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchBanks();
    fetchCards();
    fetchStats();
  }, [searchTerm, statusFilter, typeFilter, bankFilter, page, limit]);

  const resetForm = () => {
    setFormData({
      card_image: '',
      bank_id: '',
      card_name: '',
      card_link: '',
      card_type: 'business',
      funding_type: '',
      credit_bureaus: [],
    });
    setEditingCard(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCard ? `${API_BASE}/api/cards/${editingCard.id}` : `${API_BASE}/api/cards`;
      const method = editingCard ? 'PUT' : 'POST';
      const payload = {
        ...formData,
      };
      console.log('submit payload', payload);
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
        throw new Error(errorData.error || 'Failed to save card');
      }
      
      resetForm();
      fetchCards();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card');
    }
  };

  const handleEdit = async (card: Card) => {
    setEditingCard(card);
    setShowAddForm(true);
    try {
      const res = await fetch(`${API_BASE}/api/cards/${card.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const fetched = data?.card || card;
        setFormData({
          card_image: fetched.card_image || '',
          bank_id: fetched.bank_id.toString(),
          card_name: fetched.card_name,
          card_link: fetched.card_link,
          card_type: fetched.card_type,
          funding_type: fetched.funding_type,
          credit_bureaus: Array.isArray(fetched.credit_bureaus)
            ? fetched.credit_bureaus
            : typeof fetched.credit_bureaus === 'string' && fetched.credit_bureaus.trim().length > 0
              ? fetched.credit_bureaus.split(',').map((bureau: string) => bureau.trim()).filter((bureau: string) => bureau.length > 0)
              : [],
        });
      } else {
        // Fallback to existing list data
        setFormData({
          card_image: card.card_image || '',
          bank_id: card.bank_id.toString(),
          card_name: card.card_name,
          card_link: card.card_link,
          card_type: card.card_type,
          funding_type: card.funding_type,
          credit_bureaus: card.credit_bureaus || [],
        });
      }
    } catch {
      // Network error: fallback to existing list data
      setFormData({
        card_image: card.card_image || '',
        bank_id: card.bank_id.toString(),
        card_name: card.card_name,
        card_link: card.card_link,
        card_type: card.card_type,
        funding_type: card.funding_type,
        credit_bureaus: card.credit_bureaus || [],
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/cards/${id}`, {
        method: 'DELETE',
        headers: {
           'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
         },
      });
      
      if (!response.ok) throw new Error('Failed to delete card');
      
      fetchCards();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card');
    }
  };

  const toggleCardStatus = async (card: Card) => {
    try {
      const response = await fetch(`${API_BASE}/api/cards/${card.id}`, {
        method: 'PUT',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
         },
        body: JSON.stringify({ is_active: !card.is_active }),
      });
      
      if (!response.ok) throw new Error('Failed to update card status');
      
      fetchCards();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update card status');
    }
  };

  const handleCreditBureauChange = (bureau: string) => {
    setFormData(prev => ({
      ...prev,
      credit_bureaus: prev.credit_bureaus.includes(bureau)
        ? prev.credit_bureaus.filter(b => b !== bureau)
        : [...prev.credit_bureaus, bureau]
    }));
  };

  const handleCardTypeChange = (type: 'business' | 'personal') => {
    setFormData(prev => ({
      ...prev,
      card_type: type,
      funding_type: '', // Reset funding type when card type changes
    }));
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.card_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.bank_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && card.is_active) ||
      (statusFilter === 'inactive' && !card.is_active);
    const matchesType = typeFilter === 'all' || card.card_type === typeFilter;
    const matchesBank = bankFilter === 'all' || card.bank_id.toString() === bankFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesBank;
  });

  if (initialLoad && loading) {
    return (
      <FundingManagerLayout title="Card Management" description="Manage your credit cards and funding options">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </FundingManagerLayout>
    );
  }

  return (
    <FundingManagerLayout title="Card Management" description="Manage your credit cards and funding options">
      <div className="p-6 w-full">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cards</p>
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
              <p className="text-sm font-medium text-gray-600">Active</p>
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
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-purple-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Business</p>
              <p className="text-2xl font-bold text-purple-600">{stats.business}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-orange-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Personal</p>
              <p className="text-2xl font-bold text-orange-600">{stats.personal}</p>
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
                  placeholder="Search cards..."
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

              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'business' | 'personal')}
              >
                <option value="all">All Types</option>
                <option value="business">Business</option>
                <option value="personal">Personal</option>
              </select>

              {/* Bank Filter (Searchable Combobox) */}
              <Popover open={bankFilterOpen} onOpenChange={setBankFilterOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-[220px] flex items-center justify-between">
                    <span>
                      {bankFilter === 'all' ? 'All Banks' : (banks.find(b => b.id.toString() === bankFilter)?.name || 'Select bank')}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0">
                  <Command>
                    <CommandInput placeholder="Search banks..." />
                    <CommandList>
                      <CommandEmpty>No bank found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setBankFilter('all'); setBankFilterOpen(false); }}>
                          All Banks
                        </CommandItem>
                        {banks.map((bank) => (
                          <CommandItem key={bank.id} onSelect={() => { setBankFilter(bank.id.toString()); setBankFilterOpen(false); }}>
                            {bank.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} px-3 py-2 text-sm inline-flex items-center`}
                >
                  <Table className="h-4 w-4 mr-2" />
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} px-3 py-2 text-sm inline-flex items-center border-l border-gray-300`}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </button>
              </div>
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
              
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </button>
              <button
                onClick={async () => {
                  const params = new URLSearchParams();
                  if (searchTerm) params.append('search', searchTerm);
                  if (statusFilter !== 'all') params.append('status', statusFilter);
                  if (typeFilter !== 'all') params.append('type', typeFilter);
                  if (bankFilter !== 'all') params.append('bank_id', bankFilter);
                  const token = localStorage.getItem('auth_token');
                  const res = await fetch(`${API_BASE}/api/cards/export?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
                  if (!res.ok) return;
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'cards_export.csv';
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
                  ref={fileInputRef}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const token = localStorage.getItem('auth_token');
                    const fd = new FormData();
                    fd.append('file', file);
                    try {
                      const res = await fetch(`${API_BASE}/api/cards/import`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
                      if (res.ok) {
                        const data = await res.json();
                        toast({ title: 'Import completed', description: `Inserted ${data.inserted || 0}, Updated ${data.updated || 0}` });
                        fetchCards();
                        fetchStats();
                      } else {
                        const err = await res.json().catch(() => ({ error: 'Import failed' }));
                        toast({ title: 'Import failed', description: err.error || 'Unable to import CSV' });
                        setError(err.error || 'Failed to import CSV');
                      }
                    } catch (ex) {
                      toast({ title: 'Import error', description: 'Network or server error during import' });
                      setError('Network or server error during import');
                    }
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingCard ? 'Edit Card' : 'Add New Card'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Image */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.card_image}
                    onChange={(e) => setFormData({ ...formData, card_image: e.target.value })}
                    placeholder="https://example.com/card-image.png"
                  />
                </div>

                {/* Select Bank (Searchable Combobox) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Bank *
                  </label>
                  <Popover open={bankSelectOpen} onOpenChange={setBankSelectOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between">
                        <span>{banks.find(b => b.id.toString() === formData.bank_id)?.name || 'Select a bank'}</span>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0">
                      <Command>
                        <CommandInput placeholder="Search banks..." />
                        <CommandList>
                          <CommandEmpty>No bank found.</CommandEmpty>
                          <CommandGroup>
                            {banks.map((bank) => (
                              <CommandItem key={bank.id} onSelect={() => { setFormData({ ...formData, bank_id: bank.id.toString() }); setBankSelectOpen(false); }}>
                                {bank.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Card Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.card_name}
                    onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
                    placeholder="Enter card name"
                  />
                </div>

                {/* Card Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Link *
                  </label>
                  <input
                    type="url"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.card_link}
                    onChange={(e) => setFormData({ ...formData, card_link: e.target.value })}
                    placeholder="https://example.com/apply"
                  />
                </div>

                {/* Card Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Type *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.card_type}
                    onChange={(e) => handleCardTypeChange(e.target.value as 'business' | 'personal')}
                  >
                    <option value="business">Business</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                {/* Funding Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Funding Type *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.funding_type}
                    onChange={(e) => setFormData({ ...formData, funding_type: e.target.value })}
                  >
                    <option value="">Select funding type</option>
                    {(
                      (() => {
                        const base = fundingTypeOptions[formData.card_type];
                        return formData.funding_type && !base.includes(formData.funding_type)
                          ? [formData.funding_type, ...base]
                          : base;
                      })()
                    ).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
              
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
                  {editingCard ? 'Update Card' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Cards Table */}
        {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Card
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Funding Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount Approve
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No of Client Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hight Amount Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No of Client Rejeted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCards.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {card.card_image ? (
                        <img
                          src={card.card_image}
                          alt={card.card_name}
                          className="h-10 w-16 rounded object-cover mr-4"
                          onError={(e) => {
                            e.currentTarget.src = '/uploads/card.png';
                          }}
                        />
                      ) : (
                        <img
                          src="/uploads/card.png"
                          alt="Default card"
                          className="h-10 w-16 rounded object-cover mr-4"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{card.card_name}</div>
                        <a
                          href={card.card_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Application
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {card.bank_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      card.card_type === 'business' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {card.card_type.charAt(0).toUpperCase() + card.card_type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {card.funding_type}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {card.total_amount_approved != null
                      ? `$${card.total_amount_approved.toLocaleString()}`
                      : card.amount_approved != null
                        ? `$${card.amount_approved.toLocaleString()}`
                        : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {card.approved_clients_count != null
                      ? card.approved_clients_count
                      : card.no_of_usage != null
                        ? card.no_of_usage
                        : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {card.highest_amount_approved != null
                      ? `$${card.highest_amount_approved.toLocaleString()}`
                      : card.average_amount != null
                        ? `$${card.average_amount.toLocaleString()}`
                        : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {card.rejected_clients_count != null ? card.rejected_clients_count : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleCardStatus(card)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        card.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {card.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(card)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
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
          
          {filteredCards.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No cards found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first card.'
                }
              </p>
            </div>
          )}
        </div>
        )}

        {/* Cards Grid */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card) => (
              <div key={card.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center mb-4">
                  {card.card_image ? (
                    <img
                      src={card.card_image}
                      alt={card.card_name}
                      className="h-12 w-20 rounded object-cover mr-4"
                      onError={(e) => {
                        e.currentTarget.src = '/uploads/card.png';
                      }}
                    />
                  ) : (
                    <img
                      src="/uploads/card.png"
                      alt="Default card"
                      className="h-12 w-20 rounded object-cover mr-4"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{card.card_name}</div>
                    <div className="text-xs text-gray-500 truncate">{card.bank_name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    card.card_type === 'business' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {card.card_type.charAt(0).toUpperCase() + card.card_type.slice(1)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {card.funding_type}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {(card.credit_bureaus && card.credit_bureaus.length > 0 ? card.credit_bureaus : []).map((bureau) => (
                      <span
                        key={bureau}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {bureau}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-4">
                  <div>
                    <div className="text-xs text-gray-500">Total Amount Approve</div>
                    <div>
                      {card.total_amount_approved != null
                        ? `$${card.total_amount_approved.toLocaleString()}`
                        : card.amount_approved != null
                          ? `$${card.amount_approved.toLocaleString()}`
                          : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">No of Client Approved</div>
                    <div>
                      {card.approved_clients_count != null
                        ? card.approved_clients_count
                        : card.no_of_usage != null
                          ? card.no_of_usage
                          : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Hight Amount Approved</div>
                    <div>
                      {card.highest_amount_approved != null
                        ? `$${card.highest_amount_approved.toLocaleString()}`
                        : card.average_amount != null
                          ? `$${card.average_amount.toLocaleString()}`
                          : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">No of Client Rejeted</div>
                    <div>{card.rejected_clients_count != null ? card.rejected_clients_count : '-'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleCardStatus(card)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      card.is_active
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {card.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <div className="flex items-center gap-2">
                    <a
                      href={card.card_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View Application
                    </a>
                    <button
                      onClick={() => handleEdit(card)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredCards.length === 0 && (
              <div className="col-span-full text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No cards found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || bankFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first card.'
                  }
                </p>
              </div>
            )}
        </div>
        )}

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
      </div>
    </div>
    </FundingManagerLayout>
  );
};

export default CardManagement;
