import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Trash2, Edit2, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const supportedPrimaryDocumentExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']);
const supportedPrimaryDocumentMimeTypes = new Set([
  'application/pdf',
  'application/octet-stream',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/gif',
  'image/webp',
]);

function isSupportedPrimaryDocument(file: File): boolean {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const mimeType = String(file.type || '').toLowerCase();
  return supportedPrimaryDocumentExtensions.has(extension)
    && (!mimeType || supportedPrimaryDocumentMimeTypes.has(mimeType));
}

interface DocumentUploadBoxProps {
  title: string;
  description: string;
  documentType: 'dl_or_id_card' | 'poa' | 'ssc';
  currentFileUrl?: string | null;
  clientId?: number;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  className?: string;
  readOnly?: boolean;
}

const documentToneStyles = {
  dl_or_id_card: {
    card: 'border-sky-200 bg-sky-50/30 hover:shadow-sky-100',
    header: 'border-b border-sky-200 bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-50',
    title: 'text-sky-950',
    description: 'text-sky-700',
    idleZone: 'border-sky-300 bg-sky-50/70 hover:border-sky-500 hover:bg-sky-100/70',
    activeZone: 'border-sky-500 bg-sky-100/80',
    previewZone: 'border-sky-200 bg-white',
    previewBg: 'bg-sky-50/70',
    iconWrap: 'bg-sky-100',
    icon: 'text-sky-600',
    fileName: 'text-sky-800',
    helperText: 'text-sky-700',
    viewButton: 'bg-white border-sky-200 text-sky-800 hover:bg-sky-500',
    changeButton: 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-500',
    deleteButton: 'border-red-300 text-red-700 hover:bg-red-500 hover:border-red-400',
  },
  ssc: {
    card: 'border-orange-200 bg-orange-50/30 hover:shadow-orange-100',
    header: 'border-b border-orange-200 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50',
    title: 'text-orange-950',
    description: 'text-orange-700',
    idleZone: 'border-orange-300 bg-orange-50/70 hover:border-orange-500 hover:bg-orange-100/70',
    activeZone: 'border-orange-500 bg-orange-100/80',
    previewZone: 'border-orange-200 bg-white',
    previewBg: 'bg-orange-50/70',
    iconWrap: 'bg-orange-100',
    icon: 'text-orange-600',
    fileName: 'text-orange-800',
    helperText: 'text-orange-700',
    viewButton: 'bg-white border-orange-200 text-orange-800 hover:bg-orange-500',
    changeButton: 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-500',
    deleteButton: 'border-red-300 text-red-700 hover:bg-red-500 hover:border-red-400',
  },
  poa: {
    card: 'border-emerald-200 bg-emerald-50/30 hover:shadow-emerald-100',
    header: 'border-b border-emerald-200 bg-gradient-to-br from-emerald-100 via-green-50 to-lime-50',
    title: 'text-emerald-950',
    description: 'text-emerald-700',
    idleZone: 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-500 hover:bg-emerald-100/70',
    activeZone: 'border-emerald-500 bg-emerald-100/80',
    previewZone: 'border-emerald-200 bg-white',
    previewBg: 'bg-emerald-50/70',
    iconWrap: 'bg-emerald-100',
    icon: 'text-emerald-600',
    fileName: 'text-emerald-800',
    helperText: 'text-emerald-700',
    viewButton: 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-500',
    changeButton: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-500',
    deleteButton: 'border-red-300 text-red-700 hover:bg-red-500 hover:border-red-400',
  },
} as const;

export function DocumentUploadBox({
  title,
  description,
  documentType,
  currentFileUrl,
  clientId,
  onUpload,
  onDelete,
  className,
  readOnly = false
}: DocumentUploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const tone = documentToneStyles[documentType];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly) return;
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (readOnly) return;
    if (!isSupportedPrimaryDocument(file)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, GIF, WEBP, or PDF file.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      await onUpload(file);
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload document';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (readOnly) return;
    if (confirm('Are you sure you want to delete this document?')) {
      setIsLoading(true);
      try {
        await onDelete();
        toast({
          title: 'Success',
          description: 'Document deleted successfully',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete document',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const triggerFileInput = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const isPdf = currentFileUrl ? currentFileUrl.toLowerCase().split('?')[0].endsWith('.pdf') : false;

  return (
    <Card className={cn('flex flex-col border shadow-sm transition-shadow hover:shadow-md', tone.card, className)}>
      <CardHeader className={cn('p-6 rounded-t-lg', tone.header)}>
        <CardTitle className={cn('text-lg font-bold', tone.title)}>{title}</CardTitle>
        <p className={cn('text-sm mt-2 whitespace-pre-line', tone.description)}>{description}</p>
      </CardHeader>
      <CardContent className='flex flex-col p-6'>
        <div 
          className={cn(
            'relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden',
            isDragging ? tone.activeZone : tone.idleZone,
            currentFileUrl ? cn('border-solid p-0', tone.previewZone) : readOnly ? 'cursor-default' : 'cursor-pointer'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!currentFileUrl ? triggerFileInput : undefined}
        >
          {isLoading ? (
            <div className='flex flex-col items-center gap-3'>
              <Loader2 className={cn('h-12 w-12 animate-spin', tone.icon)} />
              <span className={cn('text-sm font-medium', tone.helperText)}>Processing...</span>
            </div>
          ) : currentFileUrl ? (
            <div className={cn('relative w-full h-full flex items-center justify-center', tone.previewBg)}>
              {isPdf ? (
                <div className='w-full h-full flex flex-col items-center justify-center'>
                  <FileText className={cn('h-16 w-16 mb-3', tone.icon)} />
                  <p className={cn('text-sm font-medium truncate max-w-[80%] px-4', tone.fileName)}>
                    {currentFileUrl.split('/').pop()?.split('?')[0] || 'PDF Document'}
                  </p>
                </div>
              ) : (
                <img 
                  src={currentFileUrl} 
                  alt={title} 
                  className='w-full h-full object-contain p-2'
                />
              )}
            </div>
          ) : readOnly ? (
            <div className='flex flex-col items-center text-center p-6'>
              <div className={cn('h-16 w-16 rounded-full flex items-center justify-center mb-4 shadow-sm', tone.iconWrap)}>
                <FileText className={cn('h-8 w-8', tone.icon)} />
              </div>
              <p className={cn('text-base font-semibold', tone.fileName)}>No document on file</p>
              <p className={cn('text-sm mt-2', tone.helperText)}>This document has not been uploaded yet.</p>
            </div>
          ) : (
            <div className='flex flex-col items-center text-center p-6'>
              <div className={cn('h-16 w-16 rounded-full flex items-center justify-center mb-4 shadow-sm', tone.iconWrap)}>
                <Upload className={cn('h-8 w-8', tone.icon)} />
              </div>
              <p className={cn('text-base font-semibold', tone.fileName)}>Click to Upload or Drag & Drop</p>
              <p className={cn('text-sm mt-2', tone.helperText)}>Supports JPG, PNG, GIF, WEBP, PDF blow to 10MB. Large images are compressed automatically.</p>
            </div>
          )}
          
          <input
            type='file'
            ref={fileInputRef}
            className='hidden'
            accept='.jpg,.jpeg,.png,.gif,.webp,.pdf'
            onChange={handleFileSelect}
          />
        </div>
        
        {currentFileUrl && !isLoading && (
          <div className='flex flex-col gap-3 mt-6'>
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant='outline' className={cn('w-full h-12 justify-center font-semibold shadow-sm text-base', tone.viewButton)}>
                  <Eye className='h-5 w-5 mr-2' />
                  View Document
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-slate-900 border-0 shadow-2xl'>
                 <div className='w-full h-full flex items-center justify-center relative' onClick={(e) => {
                   if (e.target === e.currentTarget) setPreviewOpen(false);
                 }}>
                   <div className='absolute top-4 right-4 z-50 flex gap-2'>
                     <Button 
                       variant='secondary' 
                       size='icon' 
                       className='bg-white/10 hover:bg-white/20 text-white rounded-full h-12 w-12'
                       onClick={() => setPreviewOpen(false)}
                     >
                       <X className='h-6 w-6' />
                     </Button>
                   </div>
                   {isPdf ? (
                     <iframe 
                       src={`${currentFileUrl}#toolbar=0`} 
                       className='w-full h-full border-0 bg-white' 
                       title='PDF Preview'
                     />
                   ) : (
                     <img 
                       src={currentFileUrl} 
                       alt={title} 
                       className='max-w-full max-h-full object-contain p-4'
                     />
                   )}
                 </div>
              </DialogContent>
            </Dialog>
            
            {!readOnly && (
            <div className='flex gap-3 w-full'>
              <Button 
                variant='outline' 
                className={cn('flex-1 h-12 font-semibold shadow-sm text-base', tone.changeButton)}
                onClick={triggerFileInput}
              >
                <Edit2 className='h-5 w-5 mr-2' />
                Change File
              </Button>
              <Button 
                variant='outline' 
                className={cn('flex-1 h-12 bg-red-50 border-red-300 text-red-700 hover:bg-red-500 hover:border-red-400 font-semibold shadow-sm text-base', tone.deleteButton)}
                onClick={handleDelete}
              >
                <Trash2 className='h-5 w-5 mr-2' />
                Delete File
              </Button>
            </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
