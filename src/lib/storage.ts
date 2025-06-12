
'use client';

import type { UserData, Vault } from '@/types';

const VAULTS_STORAGE_KEY = 'formAutoPilotVaults';

const isExtensionContext = (): boolean => {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
};

// Helper to get all vaults
export const getVaults = (): Promise<Vault[]> => {
  return new Promise((resolve, reject) => {
    if (isExtensionContext()) {
      chrome.storage.local.get([VAULTS_STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting vaults from chrome.storage:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[VAULTS_STORAGE_KEY] ? result[VAULTS_STORAGE_KEY] : []);
        }
      });
    } else if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(VAULTS_STORAGE_KEY);
      resolve(data ? JSON.parse(data) : []);
    } else {
      resolve([]); // Non-browser environment or storage unavailable
    }
  });
};

// Helper to save all vaults
const saveAllVaults = (vaults: Vault[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isExtensionContext()) {
      chrome.storage.local.set({ [VAULTS_STORAGE_KEY]: vaults }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving vaults to chrome.storage:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } else if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(VAULTS_STORAGE_KEY, JSON.stringify(vaults));
        resolve();
      } catch (error) {
        console.error('Error saving vaults to localStorage:', error);
        reject(error);
      }
    } else {
      reject(new Error('No storage mechanism available.'));
    }
  });
};

// Get a specific vault by ID
export const getVaultById = async (vaultId: string): Promise<Vault | null> => {
  const vaults = await getVaults();
  return vaults.find(v => v.id === vaultId) || null;
};

// Add or Update a vault
export const saveVault = async (vaultToSave: Partial<Vault> & { data: UserData, name: string, id?: string }): Promise<Vault> => {
  let vaults = await getVaults();
  const now = Date.now();
  let existingVaultIndex = -1;
  if (vaultToSave.id) {
    existingVaultIndex = vaults.findIndex(v => v.id === vaultToSave.id);
  }

  let newOrUpdatedVault: Vault;

  if (existingVaultIndex > -1) {
    newOrUpdatedVault = {
      ...vaults[existingVaultIndex],
      ...vaultToSave,
      name: vaultToSave.name || vaults[existingVaultIndex].name,
      data: vaultToSave.data,
      updatedAt: now,
    };
    vaults[existingVaultIndex] = newOrUpdatedVault;
  } else {
    newOrUpdatedVault = {
      id: vaultToSave.id || `vault-${now}-${Math.random().toString(36).substr(2, 9)}`,
      name: vaultToSave.name,
      data: vaultToSave.data,
      isDefault: vaultToSave.isDefault || false,
      createdAt: now,
      updatedAt: now,
    };
    vaults.push(newOrUpdatedVault);
  }
  
  if (newOrUpdatedVault.isDefault) {
    vaults = vaults.map(v => 
      v.id === newOrUpdatedVault.id ? v : { ...v, isDefault: false }
    );
  } else if (vaults.length === 1 && !vaults.some(v => v.isDefault)) {
     vaults = vaults.map(v => v.id === newOrUpdatedVault.id ? { ...v, isDefault: true } : v);
     newOrUpdatedVault.isDefault = true;
  }

  await saveAllVaults(vaults);
  return newOrUpdatedVault;
};

// Delete a vault
export const deleteVault = async (vaultIdToDelete: string): Promise<void> => {
  let vaults = await getVaults();
  const vaultToDelete = vaults.find(v => v.id === vaultIdToDelete);
  vaults = vaults.filter(v => v.id !== vaultIdToDelete);

  if (vaultToDelete?.isDefault && vaults.length > 0) {
    if (!vaults.some(v => v.isDefault)) {
      vaults[0].isDefault = true;
    }
  }
  await saveAllVaults(vaults);
};

// Set a vault as default
export const setDefaultVault = async (vaultIdToSetDefault: string): Promise<void> => {
  let vaults = await getVaults();
  vaults = vaults.map(v => ({
    ...v,
    isDefault: v.id === vaultIdToSetDefault,
  }));
  await saveAllVaults(vaults);
};

// Get the default vault
export const getDefaultVault = async (): Promise<Vault | null> => {
  const vaults = await getVaults();
  const defaultVault = vaults.find(v => v.isDefault);
  if (defaultVault) {
    return defaultVault;
  }
  return vaults.length > 0 ? vaults[0] : null;
};

// --- Legacy/Simplified UserData functions (operate on default vault) ---

export const saveUserData = async (data: UserData): Promise<void> => {
  let defaultVault = await getDefaultVault();
  if (defaultVault) {
    defaultVault.data = data;
    await saveVault(defaultVault);
  } else {
    await saveVault({ name: 'Default Vault', data, isDefault: true });
  }
};

export const getUserData = async (): Promise<UserData | null> => {
  const defaultVault = await getDefaultVault();
  return defaultVault ? defaultVault.data : null;
};

export const clearUserData = async (): Promise<void> => {
  const defaultVault = await getDefaultVault();
  if (defaultVault) {
    defaultVault.data = {};
    await saveVault(defaultVault);
  }
};
