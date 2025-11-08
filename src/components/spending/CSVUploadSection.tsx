/**
 * CSV Upload Section Component
 * Handles bank statement CSV uploads with AI-powered data enhancement
 */

'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebaseClient';

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  downloadURL?: string;
  processedCount?: number;
}

export default function CSVUploadSection() {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, UploadedFile>>(new Map());
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = async (files: FileList | null) => {
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
        });
        return newMap;
      });

      try {
        // Upload to Firebase Storage
        const storagePath = `users/${user.uid}/statements/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        // Update status to processing
        setUploadedFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(fileId);
          if (existing) {
            newMap.set(fileId, {
              ...existing,
              status: 'processing',
              downloadURL,
            });
          }
          return newMap;
        });

        // Call cloud function to process CSV
        const response = await fetch('/api/spending/process-csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl: downloadURL,
            fileName: file.name,
            storagePath,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to process CSV: ${response.statusText}`);
        }

        const result = await response.json();

        // Update status to completed
        setUploadedFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(fileId);
          if (existing) {
            newMap.set(fileId, {
              ...existing,
              status: 'completed',
              processedCount: result.processedCount || 0,
            });
          }
          return newMap;
        });
      } catch (error) {
        console.error('Error processing file:', error);
        setUploadedFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(fileId);
          if (existing) {
            newMap.set(fileId, {
              ...existing,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
          return newMap;
        });
      }
    }
  };

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
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          isDragging
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600'
        }`}
      >
        <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
          <Upload className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Upload Bank Statement CSV
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Drag and drop your CSV files here or click to browse
        </p>
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
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:shadow-lg transition-all cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Select Files
        </label>
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          <p>Supported format: CSV files from your bank statement</p>
          <p className="mt-1">Your data will be processed with AI to extract and categorize transactions</p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.size > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Uploaded Files
          </h4>
          {Array.from(uploadedFiles.entries()).map(([fileId, fileData]) => (
            <div
              key={fileId}
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <FileText className="h-6 w-6 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{fileData.file.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {(fileData.file.size / 1024).toFixed(2)} KB
                </div>
              </div>
              <div className="flex items-center gap-3">
                {fileData.status === 'uploading' && (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                  </>
                )}
                {fileData.status === 'processing' && (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
                  </>
                )}
                {fileData.status === 'completed' && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {fileData.processedCount} transactions processed
                    </span>
                  </>
                )}
                {fileData.status === 'error' && (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {fileData.error || 'Failed to process'}
                    </span>
                  </>
                )}
                {(fileData.status === 'completed' || fileData.status === 'error') && (
                  <button
                    onClick={() => removeFile(fileId)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="font-semibold text-sm">AI-Powered Processing</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Transactions are automatically categorized and enhanced using GPT-4
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-semibold text-sm">Smart Merchant Detection</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Merchant names are cleaned up and standardized automatically
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-semibold text-sm">Secure Storage</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            CSV files are encrypted and stored securely in Firebase Storage
          </p>
        </div>
      </div>
    </div>
  );
}
