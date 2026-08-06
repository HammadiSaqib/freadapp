import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Building, Plus } from "lucide-react";

interface BusinessDirectory {
  id: number;
  business_name: string;
  business_email: string;
  business_phone_number: string;
  business_address?: string;
  description?: string;
  logo_url?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
  created_at?: string | null;
}

interface BasicDirectoryTabProps {
  businessDirectories: BusinessDirectory[];
  businessDirectoriesLoading: boolean;
  businessDirectoriesError: string | null;
  canApplyForDirectory?: boolean;
  onApplyForDirectory?: () => void;
  myDirectoryApplications?: BusinessDirectory[];
  myDirectoryApplicationsLoading?: boolean;
  onSelectDirectory?: (directory: BusinessDirectory) => void;
}

function normalizeStatus(status: BusinessDirectory['status'] | undefined): 'pending' | 'approved' | 'rejected' {
  if (status === 'pending' || status === 'rejected') {
    return status;
  }
  return 'approved';
}

function getStatusClassName(status: 'pending' | 'approved' | 'rejected'): string {
  if (status === 'pending') {
    return 'border-amber-300 bg-amber-50 text-amber-800';
  }
  if (status === 'rejected') {
    return 'border-red-300 bg-red-50 text-red-700';
  }
  return 'border-emerald-300 bg-emerald-50 text-emerald-700';
}

export default function BasicDirectoryTab({
  businessDirectories,
  businessDirectoriesLoading,
  businessDirectoriesError,
  canApplyForDirectory = false,
  onApplyForDirectory,
  myDirectoryApplications = [],
  myDirectoryApplicationsLoading = false,
  onSelectDirectory,
}: BasicDirectoryTabProps) {
    const pendingCount = myDirectoryApplications.filter((item) => normalizeStatus(item.status) === 'pending').length;

    return (
        
    <Card className="bg-white border border-slate-300">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Building className="h-5 w-5" /> Business Directory
          </CardTitle>
          <CardDescription>Discover business listings.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {canApplyForDirectory ? (
            <Button type="button" onClick={onApplyForDirectory} className="gradient-primary hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Apply for Directory
            </Button>
          ) : null}
          <Badge variant="outline">{businessDirectories.length} Listed</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {canApplyForDirectory ? (
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">Your applications</p>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                {pendingCount} Pending
              </Badge>
            </div>
            {myDirectoryApplicationsLoading ? (
              <p className="mt-2 text-sm text-slate-600">Loading your directory applications...</p>
            ) : myDirectoryApplications.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No directory applications yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {myDirectoryApplications.slice(0, 3).map((application) => {
                  const status = normalizeStatus(application.status);
                  return (
                    <div key={application.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                      <div className="text-sm text-slate-800">{application.business_name}</div>
                      <Badge variant="outline" className={getStatusClassName(status)}>
                        {status === 'pending' ? 'Pending Approval' : status === 'rejected' ? 'Rejected' : 'Approved'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {businessDirectoriesLoading ? (
          <div className="py-16 text-center">Loading...</div>
        ) : businessDirectoriesError ? (
          <div className="p-4 text-red-800 bg-red-50 border border-red-200">{businessDirectoriesError}</div>
        ) : businessDirectories.length === 0 ? (
          <div className="py-16 text-center">No businesses listed yet.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Business Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businessDirectories.map((directory) => (
                  <TableRow
                    key={directory.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => onSelectDirectory?.(directory)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectDirectory?.(directory);
                      }
                    }}
                  >
                    <TableCell className="font-semibold">{directory.business_name}</TableCell>
                    <TableCell>{directory.business_email}</TableCell>
                    <TableCell>{directory.business_phone_number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    
    );
}
