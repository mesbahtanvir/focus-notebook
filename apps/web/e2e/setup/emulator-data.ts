import { Page } from '@playwright/test';

/**
 * Firebase Emulator Data Seeding
 *
 * Functions to seed baseline data into Firebase emulators
 * for screenshot tests.
 */

/**
 * Configure Firebase to use emulators
 */
export async function connectToEmulators(page: Page) {
  await page.addInitScript(() => {
    // Flag that we're using emulators
    (window as any).__USE_FIREBASE_EMULATORS__ = true;

    // Store emulator config
    (window as any).__EMULATOR_CONFIG__ = {
      auth: { host: 'localhost', port: 9099 },
      firestore: { host: 'localhost', port: 8080 },
    };
  });
}

/**
 * Initialize Firebase with emulator connection
 * This replaces mockFirebase - we use real Firebase against emulators
 */
export async function initializeFirebaseWithEmulators(page: Page) {
  await page.addInitScript(() => {
    // Wait for Firebase to be available
    const initEmulators = () => {
      const firebase = (window as any).firebase;
      if (!firebase) {
        console.warn('Firebase not available yet');
        return;
      }

      try {
        // Connect Auth to emulator
        if (firebase.auth) {
          const auth = firebase.auth();
          auth.useEmulator('http://localhost:9099');
          console.log('✅ Connected to Auth emulator');
        }

        // Connect Firestore to emulator
        if (firebase.firestore) {
          const firestore = firebase.firestore();
          firestore.useEmulator('localhost', 8080);
          console.log('✅ Connected to Firestore emulator');
        }
      } catch (error) {
        console.warn('Emulator connection error:', error);
      }
    };

    // Try to initialize immediately
    initEmulators();

    // Also try after a delay in case Firebase loads later
    setTimeout(initEmulators, 100);
    setTimeout(initEmulators, 500);
  });
}

/**
 * Create a test user in the Auth emulator
 */
export async function createTestUser(
  page: Page,
  user: {
    uid: string;
    email: string;
    password?: string;
    displayName?: string;
  }
) {
  await page.evaluate(async (userData) => {
    const firebase = (window as any).firebase;
    if (!firebase?.auth) {
      throw new Error('Firebase Auth not available');
    }

    try {
      const auth = firebase.auth();

      // Create user
      const userCredential = await auth.createUserWithEmailAndPassword(
        userData.email,
        userData.password || 'test-password-123'
      );

      // Update profile if displayName provided
      if (userData.displayName && userCredential.user) {
        await userCredential.user.updateProfile({
          displayName: userData.displayName,
        });
      }

      console.log('✅ Test user created:', userData.email);
    } catch (error: any) {
      // If user already exists, sign in
      if (error.code === 'auth/email-already-in-use') {
        await firebase.auth().signInWithEmailAndPassword(
          userData.email,
          userData.password || 'test-password-123'
        );
        console.log('✅ Signed in existing test user:', userData.email);
      } else {
        throw error;
      }
    }
  }, user);
}

/**
 * Seed baseline data into Firestore emulator
 */
export async function seedDataToEmulator(
  page: Page,
  data: {
    tasks?: any[];
    thoughts?: any[];
    goals?: any[];
    projects?: any[];
    focusSessions?: any[];
  }
) {
  await page.evaluate(async (seedData) => {
    const firebase = (window as any).firebase;
    if (!firebase?.firestore) {
      throw new Error('Firebase Firestore not available');
    }

    const db = firebase.firestore();
    const userId = firebase.auth().currentUser?.uid;

    if (!userId) {
      throw new Error('No authenticated user');
    }

    try {
      // Seed tasks
      if (seedData.tasks) {
        for (const task of seedData.tasks) {
          await db.collection('tasks').doc(task.id).set({
            ...task,
            userId,
          });
        }
        console.log(`✅ Seeded ${seedData.tasks.length} tasks`);
      }

      // Seed thoughts
      if (seedData.thoughts) {
        for (const thought of seedData.thoughts) {
          await db.collection('thoughts').doc(thought.id).set({
            ...thought,
            userId,
          });
        }
        console.log(`✅ Seeded ${seedData.thoughts.length} thoughts`);
      }

      // Seed goals
      if (seedData.goals) {
        for (const goal of seedData.goals) {
          await db.collection('goals').doc(goal.id).set({
            ...goal,
            userId,
          });
        }
        console.log(`✅ Seeded ${seedData.goals.length} goals`);
      }

      // Seed projects
      if (seedData.projects) {
        for (const project of seedData.projects) {
          await db.collection('projects').doc(project.id).set({
            ...project,
            userId,
          });
        }
        console.log(`✅ Seeded ${seedData.projects.length} projects`);
      }

      // Seed focus sessions
      if (seedData.focusSessions) {
        for (const session of seedData.focusSessions) {
          await db.collection('focusSessions').doc(session.id).set({
            ...session,
            userId,
          });
        }
        console.log(`✅ Seeded ${seedData.focusSessions.length} focus sessions`);
      }

      console.log('✅ All data seeded to emulator');
    } catch (error) {
      console.error('❌ Error seeding data:', error);
      throw error;
    }
  }, data);
}

/**
 * Wait for data to sync from emulator
 */
export async function waitForEmulatorSync(page: Page, timeout: number = 10000) {
  await page.waitForFunction(
    () => {
      // Check if Firebase has loaded data
      const firebase = (window as any).firebase;
      if (!firebase) return false;

      // Check if auth is ready
      const auth = firebase.auth();
      if (!auth.currentUser) return false;

      // Data should be ready
      return true;
    },
    { timeout }
  );

  // Additional wait for data to load into UI
  await page.waitForTimeout(1000);
}

/**
 * Clear all data from emulator for a specific user
 */
export async function clearUserDataFromEmulator(page: Page) {
  await page.evaluate(async () => {
    const firebase = (window as any).firebase;
    if (!firebase?.firestore) return;

    const db = firebase.firestore();
    const userId = firebase.auth().currentUser?.uid;

    if (!userId) return;

    try {
      const collections = ['tasks', 'thoughts', 'goals', 'projects', 'focusSessions'];

      for (const collectionName of collections) {
        const snapshot = await db
          .collection(collectionName)
          .where('userId', '==', userId)
          .get();

        const batch = db.batch();
        snapshot.docs.forEach((doc: any) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
      }

      console.log('✅ User data cleared from emulator');
    } catch (error) {
      console.warn('⚠️  Error clearing user data:', error);
    }
  });
}

/**
 * Export current emulator data (for debugging)
 */
export async function exportEmulatorData(page: Page): Promise<any> {
  return await page.evaluate(async () => {
    const firebase = (window as any).firebase;
    if (!firebase?.firestore) return null;

    const db = firebase.firestore();
    const userId = firebase.auth().currentUser?.uid;

    if (!userId) return null;

    const data: any = {};

    try {
      const collections = ['tasks', 'thoughts', 'goals', 'projects', 'focusSessions'];

      for (const collectionName of collections) {
        const snapshot = await db
          .collection(collectionName)
          .where('userId', '==', userId)
          .get();

        data[collectionName] = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  });
}
