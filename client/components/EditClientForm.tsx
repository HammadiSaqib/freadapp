import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { X, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { clientsApi } from '../lib/api';

interface ClientData {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  ssn_last_four?: string;
  date_of_birth?: string;
  employment_status?: string;
  annual_income?: number;
  status: 'active' | 'inactive' | 'completed' | 'on_hold';
  credit_score?: number;
  previous_credit_score?: number;
  notes?: string;
  platform?: string;
  platform_email?: string;
  platform_password?: string;
  created_at: string;
  updated_at: string;
}

interface EditClientFormProps {
  client: ClientData;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditClientForm({ client, onClose, onSuccess }: EditClientFormProps) {
  const [formData, setFormData] = useState<Partial<ClientData>>({
    first_name: client.first_name,
    last_name: client.last_name,
    email: client.email,
    phone: client.phone,
    address: client.address || '',
    ssn_last_four: client.ssn_last_four || '',
    date_of_birth: client.date_of_birth || '',
    status: client.status,
    notes: client.notes || '',
    platform: client.platform || '',
    platform_email: client.platform_email || '',
    platform_password: client.platform_password || '',
  });
  const [showPlatformPassword, setShowPlatformPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const national = digits.startsWith('1') ? digits.slice(1) : digits;
    const m = national.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!m) return value;
    const formatted = [m[1], m[2], m[3]].filter(Boolean).join(' ');
    return formatted ? `+1 ${formatted}` : '+1 ';
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phone', formatted);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const digits = String(formData.phone).replace(/\D/g, '');
      const valid = digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
      if (!valid) {
        newErrors.phone = 'Phone number must be in format +1 xxx xxx xxxx';
      }
    }

    // SSN validation (if provided)
    if (formData.ssn_last_four && !/^\d{4}$/.test(formData.ssn_last_four)) {
      newErrors.ssn_last_four = 'SSN last four must be exactly 4 digits';
    }

    // Credit score validation (if provided)
    if (formData.credit_score && (formData.credit_score < 300 || formData.credit_score > 850)) {
      newErrors.credit_score = 'Credit score must be between 300 and 850';
    }
    if (formData.previous_credit_score && (formData.previous_credit_score < 300 || formData.previous_credit_score > 850)) {
      newErrors.previous_credit_score = 'Previous credit score must be between 300 and 850';
    }

    // Annual income validation (if provided)
    if (formData.annual_income && formData.annual_income < 0) {
      newErrors.annual_income = 'Annual income must be a positive number';
    }

    // Email validation for platform email (if provided)
    if (formData.platform_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.platform_email)) {
      newErrors.platform_email = 'Please enter a valid platform email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ClientData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsLoading(true);
    try {
      const canonicalPhone = formatPhoneNumber(formData.phone || '');
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: canonicalPhone || undefined,
        address: formData.address || undefined,
        ssn_last_four: formData.ssn_last_four || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        platform: formData.platform || undefined,
        platform_email: formData.platform_email || undefined,
        platform_password: formData.platform_password || undefined,
      };

      // Remove undefined values to avoid validation issues
      const cleanedData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== '')
      );

      await clientsApi.updateClient(client.id.toString(), cleanedData);
      toast.success('Client updated successfully');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error updating client:', error);
      
      // Show specific validation errors if available
      if (error.response?.data?.details) {
        const validationErrors = error.response.data.details
          .map((err: any) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        toast.error(`Validation error: ${validationErrors}`);
      } else if (error.response?.data?.error) {
        toast.error(`Error: ${error.response.data.error}`);
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update client';
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Client Information</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ''}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={errors.first_name ? 'border-red-500' : ''}
                  />
                  {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ''}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={errors.last_name ? 'border-red-500' : ''}
                  />
                  {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 xxx xxx xxxx"
                    value={formData.phone || ''}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ssn_last_four">SSN Last Four Digits</Label>
                  <Input
                    id="ssn_last_four"
                    maxLength={4}
                    placeholder="1234"
                    value={formData.ssn_last_four || ''}
                    onChange={(e) => handleInputChange('ssn_last_four', e.target.value)}
                    className={errors.ssn_last_four ? 'border-red-500' : ''}
                  />
                  {errors.ssn_last_four && <p className="text-red-500 text-sm mt-1">{errors.ssn_last_four}</p>}
                </div>
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value as ClientData['status'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Platform Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Input
                    id="platform"
                    placeholder="e.g., Credit Karma, Experian"
                    value={formData.platform || ''}
                    onChange={(e) => handleInputChange('platform', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="platform_email">Platform Email</Label>
                  <Input
                    id="platform_email"
                    type="email"
                    placeholder="client@platform.com"
                    value={formData.platform_email || ''}
                    onChange={(e) => handleInputChange('platform_email', e.target.value)}
                    className={errors.platform_email ? 'border-red-500' : ''}
                  />
                  {errors.platform_email && <p className="text-red-500 text-sm mt-1">{errors.platform_email}</p>}
                </div>
                <div>
                  <Label htmlFor="platform_password">Platform Password</Label>
                  <div className="relative">
                    <Input
                      id="platform_password"
                      type={showPlatformPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.platform_password || ''}
                      onChange={(e) => handleInputChange('platform_password', e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPlatformPassword(!showPlatformPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPlatformPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPlatformPassword}
                      title={showPlatformPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPlatformPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about the client..."
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
