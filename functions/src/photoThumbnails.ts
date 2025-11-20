import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import sharp from 'sharp';

const ORIGINAL_PREFIX = 'images/original';
const THUMB_PREFIX = 'images/thumb';
const MEDIUM_PREFIX = 'images/medium';
const SIGNED_URL_TTL_DAYS = 365 * 5;

function assertUserOwnsPath(uid: string, path: string) {
  if (!path.startsWith('images/')) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid storage path.');
  }
  const segments = path.split('/');
  if (segments.length < 4) {
    throw new functions.https.HttpsError('invalid-argument', 'Path is incomplete.');
  }
  const [, , pathUid] = segments;
  if (pathUid !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot request URLs for other users.');
  }
}

export const generatePhotoThumbnail = functions.storage.object().onFinalize(async object => {
  const filePath = object.name;
  if (!filePath || !filePath.startsWith(ORIGINAL_PREFIX)) {
    return;
  }

  const segments = filePath.split('/');
  if (segments.length < 4) {
    return;
  }
  const [, , ownerId, filename] = segments;
  const baseName = filename.replace(/\.[^/.]+$/, '');

  const bucket = admin.storage().bucket(object.bucket);
  const thumbPath = filePath.replace(ORIGINAL_PREFIX, THUMB_PREFIX);
  const mediumPath = filePath.replace(ORIGINAL_PREFIX, MEDIUM_PREFIX).replace(/\.[^/.]+$/, '.jpg');
  const thumbFile = bucket.file(thumbPath);
  const mediumFile = bucket.file(mediumPath);

  const [exists] = await thumbFile.exists();
  if (exists) {
    return;
  }

  const [buffer] = await bucket.file(filePath).download();
  const thumbBuffer = await sharp(buffer).resize(360, 360, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer();
  const mediumBuffer = await sharp(buffer).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();

  await thumbFile.save(thumbBuffer, {
    contentType: 'image/jpeg',
    metadata: {
      cacheControl: 'public,max-age=31536000,s-maxage=31536000',
    },
  });

  await mediumFile.save(mediumBuffer, {
    contentType: 'image/jpeg',
    metadata: {
      cacheControl: 'public,max-age=31536000,s-maxage=31536000',
    },
  });

  // Stamp signed URLs back onto the Firestore document for this photo
  try {
    const [thumbUrl] = await thumbFile.getSignedUrl({
      action: 'read',
      expires: new Date(Date.now() + SIGNED_URL_TTL_DAYS * 24 * 60 * 60 * 1000),
    });
    const [mediumUrl] = await mediumFile.getSignedUrl({
      action: 'read',
      expires: new Date(Date.now() + SIGNED_URL_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    const docRef = admin.firestore().doc(`users/${ownerId}/photoLibrary/${baseName}`);
    await docRef.set(
      {
        thumbnailPath: thumbPath,
        thumbnailUrl: thumbUrl,
        mediumPath: mediumPath,
        mediumUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Unable to update photo variants in Firestore for', baseName, err);
  }
});

export const getSignedImageUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign-in required.');
  }

  const { path, expiresAt } = data as { path?: string; expiresAt?: string };
  if (!path) {
    throw new functions.https.HttpsError('invalid-argument', 'Provide a storage path.');
  }

  assertUserOwnsPath(context.auth.uid, path);

  const bucket = admin.storage().bucket();
  const file = bucket.file(path);
  const expires = expiresAt ? new Date(expiresAt) : new Date(Date.now() + SIGNED_URL_TTL_DAYS * 24 * 60 * 60 * 1000);

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires,
  });

  return { url, expiresAt: expires.toISOString() };
});
