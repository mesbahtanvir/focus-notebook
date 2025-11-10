/**
 * Dexa Scan Upload Component
 * Handles Dexa scan PDF/image uploads with auto-triggered AI parsing
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Activity } from 'lucide-react';
import { ref, uploadBytes } from 'firebase/storage';
import { storage, db as firestore } from '@/lib/firebaseClient';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

interface UploadedFile {
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  scanId?: string;
  uploadedAt?: string;
}

interface ProcessingStatus {
  status: 'processing' | 'completed' | 'error';
  fileName: string;
  scanId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DexaScanUpload() {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, UploadedFile>>(new Map());
  const [isDragging, setIsDragging] = useState(false);

  // Subscribe to processing status updates
  useEffect(() => {
    if (!user?.uid) return;

    const statusRef = collection(firestore, `users/${user.uid}/dexaScanProcessingStatus`);
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
                scanId: status.scanId,
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

  const processFiles = async (files: FileList | null) => {
    if (!files || !user) return;

    const validFiles = Array.from(files).filter(
      (file) =>
        file.type === 'application/pdf' ||
        file.name.endsWith('.pdf') ||
        file.type.startsWith('image/')
    );

    if (validFiles.length === 0) {
      alert('Please upload PDF or image files only');
      return;
    }

    for (const file of validFiles) {
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
        // The onDexaScanUpload Cloud Function will auto-trigger when file is uploaded
        const storagePath = `users/${user.uid}/dexaScans/${Date.now()}_${file.name}`;
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
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
        }`}
      >
        <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
          <Activity className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Upload Dexa Scan Results
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Drag and drop your Dexa scan PDF or images here or click to browse
        </p>
        <input
          type="file"
          id="dexa-upload"
          accept=".pdf,image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <label
          htmlFor="dexa-upload"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg transition-all cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Select Files
        </label>
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          <p>Supported formats: PDF documents or image files (PNG, JPG, etc.)</p>
          <p className="mt-1">Files are auto-processed with AI to extract body composition data</p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.size > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Uploaded Scans
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
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing with AI...</span>
                  </>
                )}
                {fileData.status === 'completed' && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      Scan data extracted
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
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-semibold text-sm">Auto-Processing</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Upload triggers automatic AI analysis - no manual action needed
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500" />
            <span className="font-semibold text-sm">AI-Powered Extraction</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Body composition data extracted and analyzed with LLM automatically
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-semibold text-sm">Progress Tracking</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Track changes over time with automated comparisons and insights
          </p>
        </div>
      </div>
    </div>
  );
}
