/**
 * Export Sources Index
 * Import this file to register all export sources
 */

// Import all export sources to ensure they're registered
import './tasksExportSource';
import './spendingExportSource';

// Add more export sources as they're created:
// import './projectsExportSource';
// import './goalsExportSource';
// import './thoughtsExportSource';
// import './moodsExportSource';
// import './focusSessionsExportSource';
// import './relationshipsExportSource';

export { exportRegistry, registerExportSource } from '../exportRegistry';
