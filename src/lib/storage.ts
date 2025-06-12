'use client';

import type { UserData } from '@/types';

const USER_DATA_KEY = 'formAutoPilotUserData';

export const saveUserData = (data: UserData): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
        resolve();
      } else {
        reject(new Error('localStorage is not available.'));
      }
    } catch (error) {
      console.error('Error saving user data to localStorage:', error);
      reject(error);
    }
  });
};

export const getUserData = (): Promise<UserData | null> => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(USER_DATA_KEY);
        resolve(data ? JSON.parse(data) : null);
      } else {
        resolve(null); // Return null if localStorage is not available (e.g. SSR)
      }
    } catch (error) {
      console.error('Error retrieving user data from localStorage:', error);
      reject(error);
    }
  });
};

export const clearUserData = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_DATA_KEY);
        resolve();
      } else {
        reject(new Error('localStorage is not available.'));
      }
    } catch (error) {
      console.error('Error clearing user data from localStorage:', error);
      reject(error);
    }
  });
};
