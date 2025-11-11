/**
 * CSV File Manager Component
 * Manage uploaded CSV files and their transactions
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSpending } from '@/store/useSpending';
import { FileText, Trash2, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebaseClient';
import type { Statement } from '@/types/spending-tool';

interface CSVFileInfo {
  id: string;
  fileName: string;
  status: 'processing' | 'completed' | 'error';
  processedCount: number;
  error?: string;
  storagePath?: string;
  uploadedAt?: any;
  updatedAt?: any;
  transactionCount: number;
}

type CSVFileManagerProps = {
  enableManualProcessing?: boolean;
};

export default function CSVFileManager({ enableManualProcessing = false }: CSVFileManagerProps) {
  const { user } = useAuth();
  const { transactions } = useSpending();
  const [csvFiles, setCSVFiles] = useState<CSVFileInfo[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<CSVFileInfo | null>(null);
  const [processingFile, setProcessingFile] = useState<string | null>(null);

  // Subscribe to CSV statements (supports both old and new collections during migration)
  useEffect(() => {
    if (!user?.uid) return;

    const filesMap = new Map<string, CSVFileInfo>();
    const unsubscribers: (() => void)[] = [];

    // Subscribe to NEW persistent statements collection
    const statementsRef = collection(firestore, `users/${user.uid}/statements`);
    const statementsQuery = query(statementsRef, where('source', '==', 'csv-upload'));

    const unsubStatements = onSnapshot(
      statementsQuery,
      (snapshot) => {
        snapshot.forEach((doc) => {
          const data = doc.data() as Statement;
          const fileName = data.fileName || doc.id;
          filesMap.set(fileName, {
            id: doc.id,
            fileName,
            status: data.status,
            processedCount: data.processedCount || 0,
            error: data.error,
            storagePath: data.storagePath,
            uploadedAt: data.uploadedAt,
            updatedAt: data.updatedAt,
            transactionCount: transactions.filter((t) => t.csvFileName === fileName).length,
          });
        });
        updateFilesList();
      },
      (error) => {
        console.warn('Error loading statements collection (might not exist yet):', error);
      }
    );
    unsubscribers.push(unsubStatements);

    // TEMPORARY: Also subscribe to OLD csvProcessingStatus collection for backwards compatibility
    const statusRef = collection(firestore, `users/${user.uid}/csvProcessingStatus`);
    const statusQuery = query(statusRef);

    const unsubStatus = onSnapshot(
      statusQuery,
      (snapshot) => {
        snapshot.forEach((doc) => {
          const data = doc.data();
          const fileName = data.fileName || doc.id;
          // Only add if not already in the new collection
          if (!filesMap.has(fileName)) {
            filesMap.set(fileName, {
              id: doc.id,
              fileName,
              status: data.status || 'completed',
              processedCount: data.processedCount || 0,
              error: data.error,
              storagePath: data.storagePath,
              uploadedAt: data.createdAt ? { toDate: () => new Date(data.createdAt) } : undefined,
              updatedAt: data.updatedAt ? { toDate: () => new Date(data.updatedAt) } : undefined,
              transactionCount: transactions.filter((t) => t.csvFileName === fileName).length,
            });
          }
        });
        updateFilesList();
      },
      (error) => {
        console.warn('Error loading old csvProcessingStatus collection:', error);
      }
    );
    unsubscribers.push(unsubStatus);

    function updateFilesList() {
      const files = Array.from(filesMap.values());
      // Sort by updatedAt in memory (newest first)
      files.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || a.updatedAt?.toDate?.().getTime() || 0;
        const bTime = b.updatedAt?.toMillis?.() || b.updatedAt?.toDate?.().getTime() || 0;
        return bTime - aTime;
      });
      setCSVFiles(files);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user?.uid, transactions]);

  const handleDelete = async (file: CSVFileInfo) => {
    if (!user) return;

    setDeletingFile(file.fileName);
    setShowConfirmDialog(null);

    try {
      const idToken = await user.getIdToken();

      const response = await fetch('/api/spending/delete-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fileName: file.fileName,
          storagePath: file.storagePath,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete CSV statement');
      }

      const result = await response.json();
      console.log(`Deleted ${result.deletedTransactions} transactions for ${file.fileName}`);
    } catch (error) {
      console.error('Error deleting CSV file:', error);
      alert(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleManualProcess = async (file: CSVFileInfo) => {
    if (!user || !file.storagePath) {
      alert('Missing storage path for this file.');
      return;
    }

    setProcessingFile(file.fileName);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/spending/process-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fileName: file.fileName,
          storagePath: file.storagePath,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to process CSV file.');
      }
      alert(`Successfully processed ${result.processedCount} transactions from ${file.fileName}.`);
    } catch (error) {
      console.error('Error processing CSV file:', error);
      alert(`Failed to process CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingFile(null);
    }
  };

  const totalTransactions = useMemo(() => {
    return transactions.filter((t) => t.source === 'csv-upload').length;
  }, [transactions]);

  if (csvFiles.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No CSV files uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{csvFiles.length}</span>
          <span>file{csvFiles.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
        <div className="flex items-center gap-1">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{totalTransactions}</span>
          <span>transaction{totalTransactions !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Compact File List */}
      <div className="space-y-2">
        {csvFiles.map((file) => (
          <div
            key={file.fileName}
            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {file.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
                {file.status === 'error' && (
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                {file.status === 'processing' && (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {file.fileName}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {file.transactionCount} transaction{file.transactionCount !== 1 ? 's' : ''}
                    {' • '}
                    {file.uploadedAt ? new Date(file.uploadedAt.toDate()).toLocaleDateString() : 'Unknown'}
                  </div>
                  {file.error && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {file.error}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {enableManualProcessing && (
                  <button
                    onClick={() => handleManualProcess(file)}
                    disabled={processingFile === file.fileName}
                    className="inline-flex items-center gap-1 rounded-md border border-purple-200 px-2 py-1 text-xs font-medium text-purple-700 dark:border-purple-800 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingFile === file.fileName ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Loader2 className="h-3 w-3" />
                        Process
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowConfirmDialog(file)}
                  disabled={deletingFile === file.fileName}
                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete file and all transactions"
                >
                  {deletingFile === file.fileName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Delete CSV File</h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Are you sure you want to delete <span className="font-semibold">{showConfirmDialog.fileName}</span>?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete <span className="font-semibold">{showConfirmDialog.transactionCount} transaction{showConfirmDialog.transactionCount !== 1 ? 's' : ''}</span> from your spending data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showConfirmDialog)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
