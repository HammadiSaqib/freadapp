import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { superAdminApi } from '../../lib/api';
import { Key, Eye, EyeOff, Save, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface StripeConfig {
  id: number;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  category: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface BillingTransaction {
  id: number;
  user_id: number;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface UserSubscription {
  id: number;
  user_id: number;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  amount: number;
  currency: string;
  stripe_subscription_id?: string;
  user_email?: string;
  user_name?: string;
}

const StripeConfigManagement: React.FC = () => {
  const { toast } = useToast();
  const [stripeConfig, setStripeConfig] = useState<StripeConfig[]>([]);
  const [billingTransactions, setBillingTransactions] = useState<BillingTransaction[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StripeConfig | null>(null);
  const [newValue, setNewValue] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'transactions' | 'subscriptions'>('config');

  useEffect(() => {
    fetchStripeConfig();
    fetchBillingData();
  }, []);

  const fetchStripeConfig = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.getStripeConfig();
      if (response.data?.success) {
        // The backend returns { success: true, config: configObject }
        // Convert single config object to array format expected by component
        const config = response.data.config;
        if (config) {
          setStripeConfig([config]);
        } else {
          setStripeConfig([]);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch Stripe configuration",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching Stripe config:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Stripe configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingData = async () => {
    try {
      const [transactionsResponse, subscriptionsResponse] = await Promise.all([
        superAdminApi.getBillingTransactions(),
        superAdminApi.getUserSubscriptions()
      ]);

      if (transactionsResponse.data?.success) {
        setBillingTransactions(transactionsResponse.data.data || []);
      }

      if (subscriptionsResponse.data?.success) {
        setUserSubscriptions(subscriptionsResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    }
  };

  const handleUpdateConfig = async () => {
    if (!editingConfig || !newValue.trim()) return;

    // Client-side validation
    if (editingConfig.setting_key === 'publishable_key' && !newValue.startsWith('pk_')) {
      toast({
        title: "Invalid Publishable Key",
        description: "Publishable keys must start with 'pk_'. You entered a secret key (sk_) instead.",
        variant: "destructive",
      });
      return;
    }

    if (editingConfig.setting_key === 'secret_key' && !newValue.startsWith('sk_')) {
      toast({
        title: "Invalid Secret Key",
        description: "Secret keys must start with 'sk_'. You entered a publishable key (pk_) instead.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await superAdminApi.updateStripeConfigSetting({
        setting_key: editingConfig.setting_key,
        setting_value: newValue
      });

      if (response.data?.success) {
        toast({
          title: "Success",
          description: "Stripe configuration updated successfully",
        });
        setIsEditDialogOpen(false);
        setEditingConfig(null);
        setNewValue('');
        fetchStripeConfig();
      } else {
        toast({
          title: "Error",
          description: response.data?.error || "Failed to update configuration",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error updating config:', error);
      
      // Handle different types of errors
      let errorMessage = "Failed to update configuration";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid input. Please check your key format.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication required. Please log in again.";
      } else if (error.response?.status === 403) {
        errorMessage = "Access denied. Super admin privileges required.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openEditDialog = (config: StripeConfig) => {
    setEditingConfig(config);
    setNewValue(config.setting_value);
    setIsEditDialogOpen(true);
  };

  const maskSecret = (value: string) => {
    if (value.length <= 8) return '*'.repeat(value.length);
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: {[key: string]: string} = {
      'succeeded': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'failed': 'bg-red-100 text-red-800',
      'active': 'bg-green-100 text-green-800',
      'canceled': 'bg-gray-100 text-gray-800',
      'incomplete': 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Stripe configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'config', label: 'Stripe Configuration', icon: Key },
            { id: 'transactions', label: 'Billing Transactions', icon: RefreshCw },
            { id: 'subscriptions', label: 'User Subscriptions', icon: CheckCircle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Stripe Configuration Tab */}
      {activeTab === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2" />
              Stripe API Configuration
            </CardTitle>
            <p className="text-sm text-gray-600">
              Manage your Stripe API keys and webhook settings. Keep these secure and never share them.
            </p>
          </CardHeader>
          <CardContent>
            {stripeConfig.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Stripe Configuration Found</h3>
                <p className="text-gray-600 mb-4">Stripe API keys need to be configured for payment processing.</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Key className="h-4 w-4 mr-2" />
                      Add Stripe Configuration
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Stripe Configuration</DialogTitle>
                      <DialogDescription>
                        Enter your Stripe API keys to enable payment processing.
                      </DialogDescription>
                    </DialogHeader>
                    <AddStripeConfigForm onSuccess={fetchStripeConfig} />
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setting</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stripeConfig.map((config) => (
                    <React.Fragment key={config.id}>
                      <TableRow>
                        <TableCell>
                          <div>
                            <div className="font-medium">Publishable Key</div>
                            <div className="text-sm text-gray-500">Stripe publishable key for frontend</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {showSecrets['publishable_key'] 
                                ? config.stripe_publishable_key 
                                : maskSecret(config.stripe_publishable_key || '')
                              }
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSecretVisibility('publishable_key')}
                            >
                              {showSecrets['publishable_key'] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Stripe</Badge>
                        </TableCell>
                        <TableCell>{formatDate(config.updated_at)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog({...config, setting_key: 'publishable_key', setting_value: config.stripe_publishable_key})}
                          >
                            <Save className="h-4 w-4 mr-1" />
                             Update
                           </Button>
                         </TableCell>
                       </TableRow>
                       <TableRow>
                         <TableCell>
                           <div>
                             <div className="font-medium">Secret Key</div>
                             <div className="text-sm text-gray-500">Stripe secret key for backend</div>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center space-x-2">
                             <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                               {config.has_secret_key ? '****************' : 'Not configured'}
                             </code>
                           </div>
                         </TableCell>
                         <TableCell>
                           <Badge variant="outline">Stripe</Badge>
                         </TableCell>
                         <TableCell>{formatDate(config.updated_at)}</TableCell>
                         <TableCell>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => openEditDialog({...config, setting_key: 'secret_key', setting_value: ''})}
                           >
                             <Save className="h-4 w-4 mr-1" />
                             Update
                           </Button>
                         </TableCell>
                       </TableRow>
                       <TableRow>
                         <TableCell>
                           <div>
                             <div className="font-medium">Webhook Secret</div>
                             <div className="text-sm text-gray-500">Stripe webhook endpoint secret</div>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center space-x-2">
                             <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                               {config.has_webhook_secret ? '****************' : 'Not configured'}
                             </code>
                           </div>
                         </TableCell>
                         <TableCell>
                           <Badge variant="outline">Stripe</Badge>
                         </TableCell>
                         <TableCell>{formatDate(config.updated_at)}</TableCell>
                         <TableCell>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => openEditDialog({...config, setting_key: 'webhook_secret', setting_value: ''})}
                           >
                             <Save className="h-4 w-4 mr-1" />
                             Update
                           </Button>
                         </TableCell>
                       </TableRow>
                     </React.Fragment>
                   ))}
                 </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing Transactions Tab */}
      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Billing Transactions
            </CardTitle>
            <p className="text-sm text-gray-600">
              View all payment transactions processed through Stripe.
            </p>
          </CardHeader>
          <CardContent>
            {billingTransactions.length === 0 ? (
              <div className="text-center py-8">
                <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
                <p className="text-gray-600">No billing transactions have been processed yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <code className="text-sm">{transaction.stripe_payment_intent_id}</code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.user_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{transaction.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{formatDate(transaction.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              User Subscriptions
            </CardTitle>
            <p className="text-sm text-gray-600">
              Monitor and manage all user subscriptions.
            </p>
          </CardHeader>
          <CardContent>
            {userSubscriptions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Subscriptions Found</h3>
                <p className="text-gray-600">No user subscriptions are currently active.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Current Period</TableHead>
                    <TableHead>Stripe ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.user_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{subscription.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{subscription.plan_name}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(subscription.status)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(subscription.amount, subscription.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(subscription.current_period_start)}</div>
                          <div className="text-gray-500">to {formatDate(subscription.current_period_end)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {subscription.stripe_subscription_id ? (
                          <code className="text-sm">{subscription.stripe_subscription_id}</code>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Configuration Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stripe Configuration</DialogTitle>
            <DialogDescription>
              Update the value for {editingConfig?.setting_key}. Be careful when modifying API keys.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="setting-value">Setting Value</Label>
              <Input
                id="setting-value"
                type="password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={
                  editingConfig?.setting_key === 'publishable_key' ? 'pk_test_... or pk_live_...' :
                  editingConfig?.setting_key === 'secret_key' ? 'sk_test_... or sk_live_...' :
                  editingConfig?.setting_key === 'webhook_secret' ? 'whsec_...' :
                  'Enter new value...'
                }
              />
              {editingConfig?.setting_key === 'publishable_key' && (
                <p className="text-xs text-gray-500 mt-1">
                  Publishable keys start with 'pk_' and are safe to use in frontend code
                </p>
              )}
              {editingConfig?.setting_key === 'secret_key' && (
                <p className="text-xs text-gray-500 mt-1">
                  Secret keys start with 'sk_' and should only be used on the server
                </p>
              )}
              {editingConfig?.setting_key === 'webhook_secret' && (
                <p className="text-xs text-gray-500 mt-1">
                  Webhook secrets start with 'whsec_' and are used to verify webhook signatures
                </p>
              )}
            </div>
            {editingConfig?.description && (
              <p className="text-sm text-gray-600">{editingConfig.description}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateConfig}
              disabled={saving || !newValue.trim()}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// AddStripeConfigForm component for adding initial Stripe configuration
interface AddStripeConfigFormProps {
  onSuccess: () => void;
}

const AddStripeConfigForm: React.FC<AddStripeConfigFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    publishable_key: '',
    secret_key: '',
    webhook_secret: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.publishable_key || !formData.secret_key) {
      toast({
        title: "Error",
        description: "Publishable key and secret key are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        stripe_publishable_key: formData.publishable_key,
        stripe_secret_key: formData.secret_key,
        webhook_endpoint_secret: formData.webhook_secret || undefined
      };
      const response = await superAdminApi.createStripeConfig(payload);

      if (response.data?.success) {
        toast({
          title: "Success",
          description: "Stripe configuration added successfully",
        });
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: response.data?.error || "Failed to add configuration",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding Stripe config:', error);
      toast({
        title: "Error",
        description: "Failed to add configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="publishable_key">Publishable Key *</Label>
        <Input
          id="publishable_key"
          type="text"
          value={formData.publishable_key}
          onChange={(e) => handleInputChange('publishable_key', e.target.value)}
          placeholder="pk_test_..."
          required
        />
      </div>
      
      <div>
        <Label htmlFor="secret_key">Secret Key *</Label>
        <Input
          id="secret_key"
          type="password"
          value={formData.secret_key}
          onChange={(e) => handleInputChange('secret_key', e.target.value)}
          placeholder="sk_test_..."
          required
        />
      </div>
      
      <div>
        <Label htmlFor="webhook_secret">Webhook Secret (Optional)</Label>
        <Input
          id="webhook_secret"
          type="password"
          value={formData.webhook_secret}
          onChange={(e) => handleInputChange('webhook_secret', e.target.value)}
          placeholder="whsec_..."
        />
      </div>
      
      <DialogFooter>
        <Button
          type="submit"
          disabled={saving || !formData.publishable_key || !formData.secret_key}
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Add Configuration
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default StripeConfigManagement;