/**
 * Spending Tool Types (subset for Cloud Functions)
 */

export type ItemStatus =
  | 'ok'
  | 'needs_relink'
  | 'pending_expiration'
  | 'institution_down'
  | 'paused'
  | 'error';

export interface ItemError {
  code: string;
  message: string;
  at: number;
}

export interface PlaidItem {
  uid: string;
  institutionId: string;
  institutionName?: string;
  status: ItemStatus;
  error?: ItemError;
  cursor?: string;
  kmsRef: string;
  lastSyncAt: number;
  createdAt: number;
  updatedAt?: number;
}
