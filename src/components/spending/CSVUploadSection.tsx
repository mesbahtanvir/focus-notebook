/**
 * CSV Upload Section Component
 * Handles bank statement CSV uploads with auto-triggered AI processing
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { ref, uploadBytes } from 'firebase/storage';
import { storage, db as firestore } from '@/lib/firebaseClient';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

interface UploadedFile {
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  processedCount?: number;
  uploadedAt?: string;
}

interface ProcessingStatus {
  status: 'processing' | 'completed' | 'error';
  fileName: string;
  processedCount?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CSVUploadSection() {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, UploadedFile>>(new Map());
  const [isDragging, setIsDragging] = useState(false);

  // Subscribe to processing status updates
  useEffect(() => {
    if (!user?.uid) return;

    const statusRef = collection(firestore, `users/${user.uid}/csvProcessingStatus`);
    const q = query(statusRef, orderBy('updatedAt', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const status = change.doc.data() as ProcessingStatus;
        const fileName = change.doc.id;

        setUploadedFiles((prev) => {
          const newMap = new Map(prev);
          const existing = Array.from(prev.values()).find(
            (f) => f.file.name === status.fileName
          );

          if (existing) {
            // Update existing file status
            const fileId = Array.from(prev.entries()).find(
              ([_, f]) => f.file.name === status.fileName
            )?.[0];

            if (fileId) {
              newMap.set(fileId, {
                ...existing,
                status: status.status,
                error: status.error,
                processedCount: status.processedCount,
              });
            }
          }

          return newMap;
        });
      });
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || !user) return;

    const csvFiles = Array.from(files).filter(
      (file) => file.type === 'text/csv' || file.name.endsWith('.csv')
    );

    if (csvFiles.length === 0) {
      alert('Please upload CSV files only');
      return;
    }

    for (const file of csvFiles) {
      const fileId = `${file.name}-${Date.now()}`;

      // Add file to state
      setUploadedFiles((prev) => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          file,
          status: 'uploading',
          uploadedAt: new Date().toISOString(),
        });
        return newMap;
      });

      try {
        // Upload to Firebase Storage
        // The onCSVUpload Cloud Function will auto-trigger when file is uploaded
        const storagePath = `users/${user.uid}/statements/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);

        // Update status to processing (Cloud Function will take over from here)
        setUploadedFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(fileId);
          if (existing) {
            newMap.set(fileId, {
              ...existing,
              status: 'processing',
            });
          }
          return newMap;
        });

        console.log(`File uploaded: ${storagePath}. Cloud Function will process it automatically.`);
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadedFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(fileId);
          if (existing) {
            newMap.set(fileId, {
              ...existing,
              status: 'error',
              error: error instanceof Error ? error.message : 'Upload failed',
            });
          }
          return newMap;
        });
      }
    }
  }, [user]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
    },
    [processFiles]
  );

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  };

  return (
    <div className="space-y-3">
      {/* Compact Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
          isDragging
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600'
        }`}
      >
        <input
          type="file"
          id="csv-upload"
          accept=".csv"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <label
          htmlFor="csv-upload"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Upload CSV
        </label>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <p>Drag & drop or click to select</p>
        </div>
      </div>

      {/* Compact Uploaded Files List */}
      {uploadedFiles.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Processing
          </h4>
          {Array.from(uploadedFiles.entries()).map(([fileId, fileData]) => (
            <div
              key={fileId}
              className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs truncate text-gray-900 dark:text-gray-100">{fileData.file.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {(fileData.file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <div className="flex items-center gap-2">
                {fileData.status === 'uploading' && (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Uploading</span>
                  </div>
                )}
                {fileData.status === 'processing' && (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Processing</span>
                  </div>
                )}
                {fileData.status === 'completed' && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Done
                    </span>
                  </div>
                )}
                {fileData.status === 'error' && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-600 dark:text-red-400">
                      Error
                    </span>
                  </div>
                )}
                {(fileData.status === 'completed' || fileData.status === 'error') && (
                  <button
                    onClick={() => removeFile(fileId)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
