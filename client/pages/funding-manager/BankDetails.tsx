import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CreditCard, AlertCircle, Edit, Trash2, Plus, LayoutGrid, List as ListIcon } from 'lucide-react';
import FundingManagerLayout from '@/components/FundingManagerLayout';

interface Bank {
  id: number;
  name: string;
  logo?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  amount_approved?: number;
  no_of_usage?: number;
  average_amount?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const BankDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bank, setBank] = useState<Bank | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (id) {
      fetchBankDetails();
      fetchBankCards();
    }
  }, [id]);

  const fetchBankDetails = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/banks/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bank details');
      }

      const data = await response.json();
      setBank(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchBankCards = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/cards?bank_id=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bank cards');
      }

      const data = await response.json();
      setCards(data.cards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (cardLink: string) => {
    window.open(cardLink, '_blank');
  };

  if (loading) {
    return (
      <FundingManagerLayout title="Bank Details" description="View bank information and cards">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </FundingManagerLayout>
    );
  }

  if (error || !bank) {
    return (
      <FundingManagerLayout title="Bank Details" description="View bank information and cards">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error || 'Bank not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </FundingManagerLayout>
    );
  }

  return (
    <FundingManagerLayout title={bank.name} description="Bank details and card portfolio">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/funding-manager/banks')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Banks
          </button>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Bank Logo */}
                <div className="mr-6">
                  {bank.logo ? (
                    <img
                      src={bank.logo}
                      alt={bank.name}
                      className="h-20 w-20 rounded-lg object-contain border-2 border-gray-200 bg-white p-2"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`h-20 w-20 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-gray-200 ${bank.logo ? 'hidden' : ''}`}>
                    <Building2 className="h-10 w-10 text-blue-600" />
                  </div>
                </div>
                
                {/* Bank Info */}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{bank.name}</h1>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        bank.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {bank.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {cards.length} {cards.length === 1 ? 'Card' : 'Cards'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate('/funding-manager/cards')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Bank Cards</h2>
              <p className="text-sm text-gray-500">All credit cards offered by {bank.name}</p>
            </div>
            {cards.length > 0 && (
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden self-start md:self-auto" role="group" aria-label="Toggle card view mode">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} px-3 py-2 text-sm inline-flex items-center`}
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} px-3 py-2 text-sm inline-flex items-center border-l border-gray-300`}
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                >
                  <ListIcon className="h-4 w-4 mr-2" />
                  List
                </button>
              </div>
            )}
          </div>
          
          <div className="p-6">
            {cards.length > 0 ? (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {cards.map((card) => {
                      const creditBureaus = Array.isArray(card.credit_bureaus) ? card.credit_bureaus : [];
                      return (
                        <div
                          key={card.id}
                          onClick={() => handleCardClick(card.card_link)}
                          className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer hover:border-blue-300"
                        >
                          <div className="p-4">
                            <div className="flex flex-col items-center text-center">
                              <div className="mb-4">
                                {card.card_image ? (
                                  <img
                                    src={card.card_image}
                                    alt={card.card_name}
                                    className="h-24 w-38 object-contain rounded-lg border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.src = '/uploads/card.png';
                                    }}
                                  />
                                ) : (
                                  <img
                                    src="/uploads/card.png"
                                    alt="Default card"
                                    className="h-24 w-38 object-contain rounded-lg border border-gray-200"
                                  />
                                )}
                              </div>
                              <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{card.card_name}</h3>
                              <div className="mb-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  card.card_type === 'business' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {card.card_type === 'business' ? 'Business' : 'Personal'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{card.funding_type}</p>
                              <div className="flex flex-wrap gap-1 mb-3">
                                {creditBureaus.map((bureau) => (
                                  <span
                                    key={bureau}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {bureau}
                                  </span>
                                ))}
                              </div>
                              {(card.amount_approved || card.no_of_usage || card.average_amount) && (
                                <div className="text-xs text-gray-500 space-y-1">
                                  {card.amount_approved ? (
                                    <div>Approved: ${card.amount_approved.toLocaleString()}</div>
                                  ) : null}
                                  {card.no_of_usage ? (
                                    <div>Usage: {card.no_of_usage}</div>
                                  ) : null}
                                  {card.average_amount ? (
                                    <div>Avg: ${card.average_amount.toLocaleString()}</div>
                                  ) : null}
                                </div>
                              )}
                              <div className="mt-2">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    card.is_active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {card.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cards.map((card) => {
                      const creditBureaus = Array.isArray(card.credit_bureaus) ? card.credit_bureaus : [];
                      return (
                        <div
                          key={card.id}
                          onClick={() => handleCardClick(card.card_link)}
                          className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer hover:border-blue-300"
                        >
                          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="flex-shrink-0">
                                {card.card_image ? (
                                  <img
                                    src={card.card_image}
                                    alt={card.card_name}
                                    className="h-16 w-24 object-contain rounded-lg border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.src = '/uploads/card.png';
                                    }}
                                  />
                                ) : (
                                  <img
                                    src="/uploads/card.png"
                                    alt="Default card"
                                    className="h-16 w-24 object-contain rounded-lg border border-gray-200"
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-gray-900 truncate max-w-[240px] md:max-w-[320px]">{card.card_name}</h3>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    card.card_type === 'business'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {card.card_type === 'business' ? 'Business' : 'Personal'}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    card.is_active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {card.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{card.funding_type}</p>
                                {creditBureaus.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {creditBureaus.map((bureau) => (
                                      <span
                                        key={bureau}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                      >
                                        {bureau}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
                              <div>
                                <div className="text-gray-500">Approved</div>
                                <div className="font-medium text-gray-900">
                                  {card.amount_approved ? `$${card.amount_approved.toLocaleString()}` : '—'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Usage</div>
                                <div className="font-medium text-gray-900">
                                  {card.no_of_usage ?? '—'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Avg Amount</div>
                                <div className="font-medium text-gray-900">
                                  {card.average_amount ? `$${card.average_amount.toLocaleString()}` : '—'}
                                </div>
                              </div>
                              <div className="col-span-2 sm:col-span-1">
                                <div className="text-gray-500">Link</div>
                                <div className="font-medium text-blue-600 truncate">{card.card_link}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No cards found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This bank doesn't have any cards yet.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/funding-manager/cards')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Card
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FundingManagerLayout>
  );
};

export default BankDetails;
