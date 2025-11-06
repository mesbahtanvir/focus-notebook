"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.__private__ = exports.cleanupExpiredAnonymousUsers = void 0;
exports.cleanupExpiredAnonymousUsersHandler = cleanupExpiredAnonymousUsersHandler;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ANONYMOUS_SESSION_COLLECTION = 'anonymousSessions';
const ANONYMOUS_SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const ANONYMOUS_AI_OVERRIDE_KEY = process.env.ANONYMOUS_AI_OVERRIDE_KEY || '';
async function cleanupExpiredAnonymousUsersHandler() {
    var _a, _b;
    console.log('Starting cleanup of expired anonymous users');
    let nextPageToken;
    const auth = admin.auth();
    const now = Date.now();
    const cutoff = now - ANONYMOUS_SESSION_DURATION_MS;
    do {
        const result = await auth.listUsers(1000, nextPageToken);
        for (const user of result.users) {
            const isAnonymous = user.providerData.length === 0;
            if (!isAnonymous) {
                continue;
            }
            const uid = user.uid;
            const sessionRef = admin.firestore().collection(ANONYMOUS_SESSION_COLLECTION).doc(uid);
            const sessionSnap = await sessionRef.get();
            const sessionData = sessionSnap.data();
            const overrideKeyMatch = ANONYMOUS_AI_OVERRIDE_KEY && (sessionData === null || sessionData === void 0 ? void 0 : sessionData.ciOverrideKey) === ANONYMOUS_AI_OVERRIDE_KEY;
            if (overrideKeyMatch) {
                console.log(`Skipping CI anonymous user ${uid}`);
                continue;
            }
            const expiresAtMillis = (_b = (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.expiresAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a);
            const cleanupPending = (sessionData === null || sessionData === void 0 ? void 0 : sessionData.cleanupPending) === true;
            const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
            const expiredBySession = typeof expiresAtMillis === 'number' ? expiresAtMillis <= now : false;
            const expiredByAge = createdAt > 0 ? createdAt <= cutoff : false;
            const shouldDelete = cleanupPending || expiredBySession || expiredByAge;
            if (!shouldDelete) {
                continue;
            }
            console.log(`Cleaning anonymous user ${uid}`);
            await markSessionPendingDeletion(sessionRef);
            await deleteUserData(uid);
            await sessionRef.delete().catch((error) => {
                console.warn(`Failed to delete session document for ${uid}:`, error);
            });
            try {
                await auth.deleteUser(uid);
            }
            catch (error) {
                console.error(`Failed to delete auth user ${uid}:`, error);
            }
        }
        nextPageToken = result.pageToken;
    } while (nextPageToken);
    console.log('Completed cleanup run for anonymous users');
}
exports.cleanupExpiredAnonymousUsers = functions.pubsub
    .schedule('every 60 minutes')
    .onRun(cleanupExpiredAnonymousUsersHandler);
async function markSessionPendingDeletion(sessionRef) {
    await sessionRef.set({
        cleanupPending: true,
        status: 'deleting',
        updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });
}
async function deleteUserData(uid) {
    const db = admin.firestore();
    const userDocRef = db.doc(`users/${uid}`);
    const { recursiveDelete } = db;
    if (typeof recursiveDelete === 'function') {
        try {
            await recursiveDelete(userDocRef);
            return;
        }
        catch (error) {
            console.warn(`Recursive delete failed for ${uid}, falling back to manual deletion:`, error);
        }
    }
    const subcollections = await userDocRef.listCollections();
    for (const subcollection of subcollections) {
        await deleteCollection(subcollection);
    }
    await userDocRef.delete().catch(() => undefined);
}
async function deleteCollection(collectionRef) {
    const snapshot = await collectionRef.get();
    if (snapshot.empty) {
        return;
    }
    let batch = admin.firestore().batch();
    let counter = 0;
    for (const doc of snapshot.docs) {
        await deleteNestedSubcollections(doc.ref);
        batch.delete(doc.ref);
        counter += 1;
        if (counter === 400) {
            await batch.commit();
            batch = admin.firestore().batch();
            counter = 0;
        }
    }
    if (counter > 0) {
        await batch.commit();
    }
}
async function deleteNestedSubcollections(docRef) {
    const nestedSubcollections = await docRef.listCollections();
    for (const nested of nestedSubcollections) {
        await deleteCollection(nested);
    }
}
exports.__private__ = {
    markSessionPendingDeletion,
    deleteUserData,
    deleteCollection,
    deleteNestedSubcollections,
};
//# sourceMappingURL=cleanupAnonymous.js.map