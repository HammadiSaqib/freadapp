import React, { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Star, Shield, Clock, DollarSign, CheckCircle, AlertCircle, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PersonalCard {
  id: number;
  card_image?: string;
  bank_id: number;
  bank_name?: string;
  bank_logo?: string;
  card_name: string;
  card_link: string;
  card_type: 'personal';
  funding_type: string;
  credit_bureaus: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PersonalCardsDisplayProps {
  onClose?: () => void;
}

const PersonalCardsDisplay: React.FC<PersonalCardsDisplayProps> = ({ onClose }) => {
  const [cards, setCards] = useState<PersonalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFundingType, setSelectedFundingType] = useState<string>('all');

  const fundingTypes = ['Credit Card', 'Loan', 'Sub Prime Lenders', 'Line of Credit'];

  // Fetch personal cards from API
  const fetchPersonalCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cards?type=personal&status=active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch personal cards');
      
      const data = await response.json();
      setCards(data.cards || []);
    } catch (err) {
      console.error('Error fetching personal cards:', err);
      setError('Failed to load personal funding cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalCards();
  }, []);

  const filteredCards = selectedFundingType === 'all' 
    ? cards 
    : cards.filter(card => card.funding_type === selectedFundingType);

  const getFundingTypeIcon = (type: string) => {
    switch (type) {
      case 'Credit Card':
        return <CreditCard className="h-5 w-5" />;
      case 'Loan':
        return <DollarSign className="h-5 w-5" />;
      case 'Sub Prime Lenders':
        return <AlertCircle className="h-5 w-5" />;
      case 'Line of Credit':
        return <Shield className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getFundingTypeColor = (type: string) => {
    switch (type) {
      case 'Credit Card':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Loan':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Sub Prime Lenders':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Line of Credit':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 py-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <CreditCard className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Loading Personal Funding Cards...
          </h3>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 py-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold mb-4 text-red-600">Error Loading Cards</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={fetchPersonalCards} className="bg-red-600 hover:bg-red-700">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CreditCard className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Personal Funding Cards
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
          Choose from our curated selection of personal funding options. Each card is carefully selected to help you achieve your financial goals.
        </p>
      </div>

      {/* Funding Type Filter */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <button
          onClick={() => setSelectedFundingType('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
            selectedFundingType === 'all'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Cards ({cards.length})
        </button>
        {fundingTypes.map((type) => {
          const count = cards.filter(card => card.funding_type === type).length;
          return (
            <button
              key={type}
              onClick={() => setSelectedFundingType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                selectedFundingType === type
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getFundingTypeIcon(type)}
              {type} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      {filteredCards.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredCards.map((card) => (
            <Card key={card.id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-green-300 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  {/* Bank Logo on the left */}
                  <div className="flex items-center gap-3">
                    {card.bank_logo ? (
                      <img
                        src={card.bank_logo}
                        alt={`${card.bank_name} logo`}
                        className="h-8 w-8 rounded-full object-cover shadow-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md ${card.bank_logo ? 'hidden' : ''}`}>
                      <Building className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  
                  {/* Funding Type on the right */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getFundingTypeColor(card.funding_type)}`}>
                    {getFundingTypeIcon(card.funding_type)}
                    <span className="ml-2">{card.funding_type}</span>
                  </div>
                </div>

                {/* Card Image */}
                <div className="flex justify-center mb-4">
                  {card.card_image ? (
                    <img
                      src={card.card_image}
                      alt={card.card_name}
                      className="h-24 w-38 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = '/uploads/card.png';
                      }}
                    />
                  ) : (
                    <img
                      src="/uploads/card.png"
                      alt="Default card"
                      className="h-24 w-38 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>

                <CardTitle className="text-xl font-bold text-center text-gray-800 group-hover:text-green-700 transition-colors duration-300">
                  {card.card_name}
                </CardTitle>
              </CardHeader>

              <CardContent className="relative z-10 space-y-4">
                {/* Bank Information without Logo */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-medium">{card.bank_name}</p>
                </div>

                {/* Credit Bureaus */}
                <div className="flex flex-wrap justify-center gap-2">
                  {card.credit_bureaus.map((bureau) => (
                    <span
                      key={bureau}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {bureau}
                    </span>
                  ))}
                </div>

                {/* Apply Button */}
                <Button
                  onClick={() => window.open(card.card_link, '_blank')}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>

                {/* Last Updated */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 flex items-center justify-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated {new Date(card.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Cards Available</h3>
          <p className="text-gray-500 mb-6">
            {selectedFundingType === 'all' 
              ? 'No personal funding cards are currently available.' 
              : `No ${selectedFundingType} cards are currently available.`
            }
          </p>
          <Button 
            onClick={() => setSelectedFundingType('all')}
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50"
          >
            View All Cards
          </Button>
        </div>
      )}

      {/* Close Button */}
      {onClose && (
        <div className="text-center pt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="px-8 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

export default PersonalCardsDisplay;