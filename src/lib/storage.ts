
'use client';

import type { UserData, Vault } from '@/types';

const VAULTS_STORAGE_KEY = 'formAutoPilotVaults';

// Helper to get all vaults
export const getVaults = (): Promise<Vault[]> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(VAULTS_STORAGE_KEY);
      resolve(data ? JSON.parse(data) : []);
    } else {
      resolve([]); // Return empty array if localStorage is not available (e.g. SSR)
    }
  });
};

// Helper to save all vaults
const saveAllVaults = (vaults: Vault[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(VAULTS_STORAGE_KEY, JSON.stringify(vaults));
        resolve();
      } else {
        reject(new Error('localStorage is not available.'));
      }
    } catch (error) {
      console.error('Error saving vaults to localStorage:', error);
      reject(error);
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
    // Update existing vault
    newOrUpdatedVault = {
      ...vaults[existingVaultIndex],
      ...vaultToSave,
      name: vaultToSave.name || vaults[existingVaultIndex].name,
      data: vaultToSave.data,
      updatedAt: now,
    };
    vaults[existingVaultIndex] = newOrUpdatedVault;
  } else {
    // Add new vault
    newOrUpdatedVault = {
      id: vaultToSave.id || `vault-${now}`,
      name: vaultToSave.name,
      data: vaultToSave.data,
      isDefault: vaultToSave.isDefault || false,
      createdAt: now,
      updatedAt: now,
    };
    vaults.push(newOrUpdatedVault);
  }
  
  // Ensure only one default vault if the new/updated one is set to default
  if (newOrUpdatedVault.isDefault) {
    vaults = vaults.map(v => 
      v.id === newOrUpdatedVault.id ? v : { ...v, isDefault: false }
    );
  } else if (vaults.length === 1 && !vaults.some(v => v.isDefault)) {
    // If it's the only vault and no default is set, make it default
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

  // If the deleted vault was default and other vaults exist, set a new default
  if (vaultToDelete?.isDefault && vaults.length > 0) {
    if (!vaults.some(v => v.isDefault)) { // Check if another default already exists (should not happen if logic is correct)
      vaults[0].isDefault = true; // Set the first remaining vault as default
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
  // If no explicit default, return the first vault if available
  return vaults.length > 0 ? vaults[0] : null;
};


// Legacy functions (to be removed or refactored if UserData is only part of Vault)
// For now, let's keep them but make them operate on the default vault concept.

export const saveUserData = async (data: UserData): Promise<void> => {
  let defaultVault = await getDefaultVault();
  if (defaultVault) {
    defaultVault.data = data;
    await saveVault(defaultVault);
  } else {
    // Create a new default vault if none exists
    await saveVault({ name: 'Default Vault', data, isDefault: true });
  }
};

export const getUserData = async (): Promise<UserData | null> => {
  const defaultVault = await getDefaultVault();
  return defaultVault ? defaultVault.data : null;
};

export const clearUserData = async (): Promise<void> => {
  // This function becomes ambiguous. Do we clear the default vault's data, or delete the default vault?
  // For now, let's clear the data of the default vault.
  const defaultVault = await getDefaultVault();
  if (defaultVault) {
    defaultVault.data = {};
    await saveVault(defaultVault);
  }
};
