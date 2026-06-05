import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Clock, DollarSign, FileX, TrendingDown } from 'lucide-react';

interface NegativeAccountData {
  latePayments: {
    start: number;
    update: number;
    removed: number;
  };
  collectionsChargeOff: {
    start: number;
    update: number;
    removed: number;
  };
  publicRecords: {
    start: number;
    update: number;
    removed: number;
  };
  hardInquiries: {
    start: number;
    update: number;
    removed: number;
  };
}

interface NegativeAccountsCardProps {
  data?: NegativeAccountData;
}

const defaultData: NegativeAccountData = {
  latePayments: { start: 47, update: 21, removed: 26 },
  collectionsChargeOff: { start: 10, update: 5, removed: 5 },
  publicRecords: { start: 1, update: 1, removed: 0 },
  hardInquiries: { start: 21, update: 10, removed: 11 }
};

const NegativeAccountsCard: React.FC<NegativeAccountsCardProps> = ({ data = defaultData }) => {
  const accountTypes = [
    {
      title: 'Late Payments',
      icon: Clock,
      data: data.latePayments,
      gradient: 'from-red-500 to-pink-500',
      bgGradient: 'from-red-50 to-pink-50',
      textColor: 'text-red-700',
      iconColor: 'text-red-500'
    },
    {
      title: 'Collections/ Charge off',
      icon: AlertTriangle,
      data: data.collectionsChargeOff,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
      textColor: 'text-orange-700',
      iconColor: 'text-orange-500'
    },
    {
      title: 'Public Records',
      icon: FileX,
      data: data.publicRecords,
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
      textColor: 'text-purple-700',
      iconColor: 'text-purple-500'
    },
    {
      title: 'Hard Inquiries',
      icon: TrendingDown,
      data: data.hardInquiries,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-500'
    }
  ];

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 overflow-hidden">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent dark:from-white dark:to-gray-200">
          Types of negative accounts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {accountTypes.map((account, index) => {
            const Icon = account.icon;
            return (
              <div
                key={index}
                className={`relative group bg-gradient-to-br ${account.bgGradient} dark:from-slate-700 dark:to-slate-600 rounded-xl p-6 border border-gray-200/50 dark:border-slate-500/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${account.gradient} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-300`}></div>
                
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full bg-gradient-to-br ${account.gradient} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-lg font-semibold text-center mb-6 ${account.textColor} dark:text-gray-200`}>
                  {account.title}
                </h3>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-gray-200/30 dark:border-slate-600/30">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">start</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">{account.data.start}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-gray-200/30 dark:border-slate-600/30">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">update</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{account.data.update}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-gray-200/30 dark:border-slate-600/30">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Removed</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">{account.data.removed}</span>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((account.data.removed / account.data.start) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                    <div 
                      className={`bg-gradient-to-r ${account.gradient} h-2 rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${Math.min((account.data.removed / account.data.start) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-br from-white to-gray-200 rounded-full opacity-60"></div>
                <div className="absolute bottom-2 left-2 w-1 h-1 bg-gradient-to-br from-white to-gray-200 rounded-full opacity-40"></div>
              </div>
            );
          })}
        </div>

        {/* Summary section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl border border-gray-200/50 dark:border-slate-500/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {data.latePayments.start + data.collectionsChargeOff.start + data.publicRecords.start + data.hardInquiries.start}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Started</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.latePayments.update + data.collectionsChargeOff.update + data.publicRecords.update + data.hardInquiries.update}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {data.latePayments.removed + data.collectionsChargeOff.removed + data.publicRecords.removed + data.hardInquiries.removed}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Removed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(((data.latePayments.removed + data.collectionsChargeOff.removed + data.publicRecords.removed + data.hardInquiries.removed) / 
                (data.latePayments.start + data.collectionsChargeOff.start + data.publicRecords.start + data.hardInquiries.start)) * 100)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Success Rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NegativeAccountsCard;