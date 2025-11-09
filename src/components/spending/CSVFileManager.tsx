/**
 * CSV File Manager Component
 * Manage uploaded CSV files and their transactions
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSpending } from '@/store/useSpending';
import { FileText, Trash2, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebaseClient';

interface ProcessingStatus {
  status: 'processing' | 'completed' | 'error';
  fileName: string;
  processedCount?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface CSVFileInfo extends ProcessingStatus {
  transactionCount: number;
  storagePath?: string;
}

export default function CSVFileManager() {
  const { user } = useAuth();
  const { transactions } = useSpending();
  const [csvFiles, setCSVFiles] = useState<CSVFileInfo[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<CSVFileInfo | null>(null);

  // Subscribe to CSV processing status
  useEffect(() => {
    if (!user?.uid) return;

    const statusRef = collection(firestore, `users/${user.uid}/csvProcessingStatus`);
    const q = query(statusRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const files: ProcessingStatus[] = [];
      snapshot.forEach((doc) => {
        files.push(doc.data() as ProcessingStatus);
      });

      // Combine with transaction counts
      const filesWithCounts = files.map((file) => ({
        ...file,
        transactionCount: transactions.filter((t) => t.csvFileName === file.fileName).length,
      }));

      setCSVFiles(filesWithCounts);
    });

    return () => unsubscribe();
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

  const totalTransactions = useMemo(() => {
    return transactions.filter((t) => t.source === 'csv-upload').length;
  }, [transactions]);

  if (csvFiles.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No CSV files uploaded yet.</p>
        <p className="text-sm mt-2">Upload a CSV file to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total CSV Files</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{csvFiles.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalTransactions}</p>
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Uploaded Files</h3>
        {csvFiles.map((file) => (
          <div
            key={file.fileName}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <FileText className="h-6 w-6 text-purple-500 flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {file.fileName}
                  </span>
                  {file.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  {file.status === 'error' && (
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  {file.status === 'processing' && (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {file.transactionCount} transaction{file.transactionCount !== 1 ? 's' : ''}
                  {' • '}
                  <span className="text-xs">
                    Uploaded {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {file.error && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Error: {file.error}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowConfirmDialog(file)}
                disabled={deletingFile === file.fileName}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete file and all transactions"
              >
                {deletingFile === file.fileName ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
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
