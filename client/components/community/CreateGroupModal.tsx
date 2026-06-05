import React, { useState } from 'react';
import { X, Users, Lock, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useToast } from '../ui/use-toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'public'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Group name is required',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onGroupCreated();
        setFormData({ name: '', description: '', privacy: 'public' });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create group',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Create New Group</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Group Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter group name"
              className="w-full"
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500">
              {formData.name.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this group is about..."
              className="w-full min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Privacy Settings
            </Label>
            <RadioGroup
              value={formData.privacy}
              onValueChange={(value) => handleInputChange('privacy', value)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="public" id="public" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-green-600" />
                    <Label htmlFor="public" className="font-medium cursor-pointer">
                      Public
                    </Label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Anyone can see and join this group
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="private" id="private" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="h-4 w-4 text-orange-600" />
                    <Label htmlFor="private" className="font-medium cursor-pointer">
                      Private
                    </Label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Only invited members can see and join this group
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Create Group
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;