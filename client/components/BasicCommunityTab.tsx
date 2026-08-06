import React from 'react';
import BasicCommunityFeed from "./BasicCommunityFeed";
import Groups from "./community/Groups";

export default function BasicCommunityTab({ currentUser, userLoading }: { currentUser: any, userLoading: boolean }) {
    return (
        <div className="space-y-6">
      {userLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-sm h-8 w-8 border-b-2 border-slate-800 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading community feed...</p>
          </div>
        </div>
      ) : currentUser ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BasicCommunityFeed currentUser={{ ...currentUser, role: currentUser.role || 'user' }} />
          </div>
          <div className="lg:col-span-1">
            {/* Groups can remain as is if it's basic enough, or we strip it. Let's just use Groups for now. */}
            <Groups currentUser={{ ...currentUser, role: currentUser.role || 'user' }} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-slate-600">Unable to load community feed. Please try refreshing the page.</p>
          </div>
        </div>
      )}
    </div>
    );
}
