'use client';

import React from 'react';

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  // Note: Data loading is now handled by FirestoreSubscriber component
  // which subscribes to Firestore collections when user is authenticated
  // No manual loading needed here
  
  return <>{children}</>;
}
