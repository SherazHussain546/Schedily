'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options?: SetOptions) {
  setDoc(docRef, data, options || {}).catch(async (error) => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        // Match the rule operation for better context
        operation: options && 'merge' in options ? 'update' : 'create',
        requestResourceData: data,
      } satisfies SecurityRuleContext)
    );
  });
}

/**
 * Initiates an addDoc operation for a collection reference.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  addDoc(colRef, data).catch(async (error) => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: colRef.path,
        operation: 'create',
        requestResourceData: data,
      } satisfies SecurityRuleContext)
    );
  });
}

/**
 * Initiates an updateDoc operation for a document reference.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data).catch(async (error) => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      } satisfies SecurityRuleContext)
    );
  });
}

/**
 * Initiates a deleteDoc operation for a document reference.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef).catch(async (error) => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext)
    );
  });
}