'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { errorEmitter } from './error-emitter';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((error) => {
    errorEmitter.emit('auth-error', { code: error.code, message: error.message });
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(
  authInstance: Auth, 
  db: Firestore, 
  email: string, 
  password: string, 
  username: string
): void {
  createUserWithEmailAndPassword(authInstance, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      
      // Update Auth Profile
      await updateProfile(user, { displayName: username });
      
      // Create UserProfile document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        id: user.uid,
        email: user.email,
        displayName: username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    })
    .catch((error) => {
      errorEmitter.emit('auth-error', { code: error.code, message: error.message });
    });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password).catch((error) => {
    errorEmitter.emit('auth-error', { code: error.code, message: error.message });
  });
}
