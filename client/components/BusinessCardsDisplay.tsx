import React, { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Shield, Clock, DollarSign, CheckCircle, AlertCircle, Building, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BusinessCard {
  id: number;
  card_image?: string;
  bank_id: number;
  bank_name?: string;
  bank_logo?: string;
  card_name: string;
  card_link: string;
  card_type: 'business';
  funding_type: string;
  credit_bureaus: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BusinessCardsDisplayProps {
  onClose?: () => void;
}

const BusinessCardsDisplay: React.FC<BusinessCardsDisplayProps> = ({ onClose }) => {
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFundingType, setSelectedFundingType] = useState<string>('all');

  const fundingTypes = ['Credit Card', 'Loan', 'SBA Loan', 'Merchant Cash Advance', 'Line of Credit'];

  // Fetch business cards from API
  const fetchBusinessCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cards?type=business&status=active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch business cards');
      
      const data = await response.json();
      setCards(data.cards || []);
    } catch (err) {
      console.error('Error fetching business cards:', err);
      setError('Failed to load business funding cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessCards();
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
      case 'SBA Loan':
        return <Shield className="h-5 w-5" />;
      case 'Merchant Cash Advance':
        return <AlertCircle className="h-5 w-5" />;
      case 'Line of Credit':
        return <Briefcase className="h-5 w-5" />;
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
      case 'SBA Loan':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Merchant Cash Advance':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Line of Credit':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 py-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <Briefcase className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Loading Business Funding Options
          </h3>
          <p className="text-gray-600 mb-8">
            Finding the best business funding cards for your company...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 py-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertCircle className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-4 text-red-600">
            Error Loading Business Cards
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={fetchBusinessCards} className="bg-blue-600 hover:bg-blue-700">
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
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Briefcase className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Business Funding Cards
        </h3>
        <p className="text-gray-600 mb-8">
          Discover business credit cards and funding options to grow your company
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <Button
          variant={selectedFundingType === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedFundingType('all')}
          className="rounded-full px-6 py-2 font-medium transition-all duration-200"
        >
          All Types ({cards.length})
        </Button>
        {fundingTypes.map((type) => {
          const count = cards.filter(card => card.funding_type === type).length;
          return (
            <Button
              key={type}
              variant={selectedFundingType === type ? 'default' : 'outline'}
              onClick={() => setSelectedFundingType(type)}
              className="rounded-full px-6 py-2 font-medium transition-all duration-200"
            >
              <span className="mr-2">{getFundingTypeIcon(type)}</span>
              {type} ({count})
            </Button>
          );
        })}
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-12">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-xl font-semibold text-gray-600 mb-2">
            No Business Cards Available
          </h4>
          <p className="text-gray-500">
            {selectedFundingType === 'all' 
              ? 'No business funding cards are currently available.' 
              : `No ${selectedFundingType} cards are currently available.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => (
            <Card key={card.id} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 bg-white">
              <CardContent className="p-6">
                {/* Card Layout */}
                <div className="flex items-start gap-4 mb-4">
                  {/* Bank Logo */}
                  <div className="flex-shrink-0">
                    {card.bank_logo ? (
                      <img 
                        src={card.bank_logo} 
                        alt={`${card.bank_name} logo`}
                        className="w-12 h-12 rounded-lg object-contain bg-gray-50 p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Funding Type Badge */}
                  <div className="flex-shrink-0 ml-auto">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getFundingTypeColor(card.funding_type)}`}>
                      {getFundingTypeIcon(card.funding_type)}
                      <span className="ml-1">{card.funding_type}</span>
                    </span>
                  </div>
                </div>

                {/* Card Image */}
                <div className="mb-4 flex justify-center">
                  {card.card_image ? (
                    <img 
                      src={card.card_image} 
                      alt={card.card_name}
                      className="h-32 w-auto object-contain rounded-lg shadow-md"
                      onError={(e) => {
                        e.currentTarget.src = '/uploads/card.png';
                      }}
                    />
                  ) : (
                    <img 
                      src="/uploads/card.png" 
                      alt="Default card"
                      className="h-32 w-auto object-contain rounded-lg shadow-md"
                    />
                  )}
                </div>

                {/* Card Info */}
                <div className="text-center mb-4">
                  <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {card.card_name}
                  </h4>
                  {card.bank_name && (
                    <p className="text-gray-600 font-medium">
                      {card.bank_name}
                    </p>
                  )}
                </div>

                {/* Credit Bureaus */}
                {card.credit_bureaus && card.credit_bureaus.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2 font-medium">Reports to:</p>
                    <div className="flex flex-wrap gap-2">
                      {card.credit_bureaus.map((bureau) => (
                        <span key={bureau} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                          {bureau}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group-hover:bg-blue-700"
                  onClick={() => window.open(card.card_link, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>

                {/* Last Updated */}
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500 flex items-center justify-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated {new Date(card.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Close Button */}
      {onClose && (
        <div className="text-center pt-6">
          <Button variant="outline" onClick={onClose} className="px-8 py-2">
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

export default BusinessCardsDisplay;