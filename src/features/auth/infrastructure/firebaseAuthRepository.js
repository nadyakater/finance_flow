import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../../../firebase";

function mapFirebaseUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.uid,
    email: user.email ?? "",
    emailVerified: user.emailVerified,
  };
}

async function createUserDocumentIfNotExists(user) {
  const userReference = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userReference);

  if (userSnapshot.exists()) {
    return;
  }

  await setDoc(userReference, {
    id: user.uid,
    ownerId: user.uid,
    email: user.email ?? "",
    role: "user",
    createdAtUtc: serverTimestamp(),
    updatedAtUtc: serverTimestamp(),
    createdBy: user.uid,
    updatedBy: user.uid,
    isDeleted: false,
    version: 1,
  });
}

// 1.GÜN - Firebase üzerinden e-posta ve şifre ile giriş işlemi oluşturuldu.
export async function loginWithEmailAndPassword(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );

  try {
    await createUserDocumentIfNotExists(userCredential.user);
  } catch (error) {
    await signOut(auth);
    throw error;
  }

  return mapFirebaseUser(userCredential.user);
}

// 1.GÜN - Firebase üzerinden çıkış işlemi oluşturuldu.
export async function logoutFromFirebase() {
  await signOut(auth);
}

// 1.GÜN - Firebase oturum değişikliklerini takip eden listener oluşturuldu.
export function subscribeToAuthChanges(onUserChanged, onError) {
  return onAuthStateChanged(
    auth,
    (user) => {
      onUserChanged(mapFirebaseUser(user));
    },
    onError,
  );
}