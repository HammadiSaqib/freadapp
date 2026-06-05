import React, { useState, useEffect } from 'react';
import { Plus, Users, Lock, Globe, Settings, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import CreateGroupModal from './CreateGroupModal';

interface Group {
  id: number;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  member_count: number;
  post_count: number;
  avatar_url?: string;
  cover_url?: string;
  created_at: string;
  creator_first_name: string;
  creator_last_name: string;
  user_role?: 'admin' | 'moderator' | 'member';
}

interface GroupsProps {
  currentUser: {
    id: number;
    role: string;
    first_name: string;
    last_name: string;
  };
}

const Groups: React.FC<GroupsProps> = ({ currentUser }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      fetchGroups();
    }
  }, [currentUser]);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to fetch groups: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load groups',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Successfully joined the group'
        });
        fetchGroups(); // Refresh the groups list
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join group');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to join group',
        variant: 'destructive'
      });
    }
  };

  const leaveGroup = async (groupId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Left Group',
          description: 'You have left the group.'
        });
        fetchGroups();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to leave group',
        variant: 'destructive'
      });
    }
  };

  const handleGroupCreated = () => {
    setShowCreateModal(false);
    fetchGroups(); // Refresh the groups list
    toast({
      title: 'Success',
      description: 'Group created successfully'
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatMemberCount = (count: number) => {
    if (count === 1) return '1 member';
    return `${count} members`;
  };

  const formatPostCount = (count: number) => {
    if (count === 0) return 'No posts';
    if (count === 1) return '1 post';
    return `${count} posts`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Groups</CardTitle>
          {currentUser.role === 'admin' && (
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
        <CardDescription>
          Connect with communities
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {groups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">
              {currentUser.role === 'admin'
                ? 'Create the first group'
                : 'No groups available'}
            </p>
            {currentUser.role === 'admin' && (
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Create Group
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {groups.slice(0, 5).map((group) => (
              <div key={group.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={group.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {getInitials(group.creator_first_name, group.creator_last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium truncate">{group.name}</h4>
                      <div className="flex items-center gap-1">
                        {group.privacy === 'private' ? (
                          <Lock className="h-3 w-3 text-gray-400" />
                        ) : (
                          <Globe className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500 capitalize">{group.privacy}</span>
                      </div>
                    </div>
                  </div>
                  {group.user_role && (
                    <Badge variant="secondary" className="text-xs">
                      {group.user_role}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {group.member_count}
                  </span>
                  <span>{group.post_count} posts</span>
                </div>

                {!group.user_role ? (
                  <Button
                    size="sm"
                    onClick={() => joinGroup(group.id)}
                    className="w-full h-7 text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Join
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs"
                    onClick={() => leaveGroup(group.id)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Leave
                  </Button>
                )}
              </div>
            ))}
            
            {groups.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View all {groups.length} groups
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </Card>
  );
};

export default Groups;