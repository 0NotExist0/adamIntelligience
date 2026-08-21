// AI Studio Pro - Authentication & Google Identity Service

const AUTH_STORAGE_KEY = 'aistudio_current_user';
const SAVED_ACCOUNTS_KEY = 'aistudio_saved_accounts';

/**
 * Retrieves the currently active user session from browser localStorage.
 */
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const isLoggedIn = () => {
  return Boolean(getCurrentUser());
};

/**
 * Retrieves the list of all remembered accounts on this browser.
 */
export const getSavedAccounts = () => {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Saves or updates an account in the browser's persistent remembered accounts list.
 */
export const saveAccountToBrowser = (user) => {
  if (!user || !user.id) return;
  try {
    const accounts = getSavedAccounts();
    const existingIdx = accounts.findIndex((a) => a.id === user.id || (a.email && a.email.toLowerCase() === user.email.toLowerCase()));
    
    if (existingIdx >= 0) {
      accounts[existingIdx] = {
        ...accounts[existingIdx],
        ...user,
        lastActiveAt: new Date().toISOString()
      };
    } else {
      accounts.unshift({
        ...user,
        lastActiveAt: new Date().toISOString()
      });
    }

    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Errore nel salvataggio credenziali nel browser:', e);
  }
};

/**
 * Removes a saved account from the browser's stored credentials list.
 */
export const removeSavedAccount = (userId) => {
  try {
    const accounts = getSavedAccounts().filter((a) => a.id !== userId);
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
    
    // If removing the active user, log out
    const current = getCurrentUser();
    if (current && current.id === userId) {
      logoutUser();
    }
    return accounts;
  } catch (e) {
    return [];
  }
};

/**
 * Calculates the personal Google Drive URL for a given user email or folder.
 */
export const buildPersonalDriveUrl = (email, customFolderUrl = null) => {
  if (customFolderUrl && customFolderUrl.trim()) {
    return customFolderUrl.trim();
  }
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) {
    // Google Drive URL targeting this specific user's Google account session
    return `https://drive.google.com/drive/u/?authuser=${encodeURIComponent(cleanEmail)}`;
  }
  return 'https://drive.google.com/drive/my-drive';
};

/**
 * Logs in with a Google account, associates their personal Drive, and persists credentials in the browser.
 */
export const loginWithGoogleAccount = ({
  name,
  email,
  avatar = null,
  driveFolderUrl = null,
  rememberInBrowser = true
}) => {
  const cleanEmail = (email || '').trim().toLowerCase();
  const userId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_') || `user_${Date.now()}`;
  
  // Format user display name
  const displayName = (name || '').trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'Utente Google');
  
  // Default avatar generator based on clean email or initials
  const userAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail || userId}`;
  
  // Dedicated personal Google Drive URL
  const personalDriveUrl = buildPersonalDriveUrl(cleanEmail, driveFolderUrl);

  const user = {
    id: userId,
    email: cleanEmail,
    name: displayName,
    avatar: userAvatar,
    provider: 'google',
    googleConnected: true,
    driveFolderUrl: personalDriveUrl,
    customFolderConfigured: Boolean(driveFolderUrl && driveFolderUrl.trim()),
    loggedInAt: new Date().toISOString(),
    rememberInBrowser: Boolean(rememberInBrowser)
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

  if (rememberInBrowser) {
    saveAccountToBrowser(user);
  }

  return user;
};

/**
 * Switches active session to another saved account in the browser.
 */
export const switchAccount = (userId) => {
  const accounts = getSavedAccounts();
  const target = accounts.find((a) => a.id === userId);
  if (target) {
    const updatedUser = {
      ...target,
      loggedInAt: new Date().toISOString()
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    saveAccountToBrowser(updatedUser);
    return updatedUser;
  }
  return null;
};

/**
 * Updates profile information (e.g. name, custom personal Drive folder URL).
 */
export const updateUserProfile = (updates = {}) => {
  const current = getCurrentUser();
  if (!current) return null;

  const newDriveUrl = updates.driveFolderUrl !== undefined
    ? (updates.driveFolderUrl ? updates.driveFolderUrl.trim() : buildPersonalDriveUrl(current.email))
    : current.driveFolderUrl;

  const updated = {
    ...current,
    ...updates,
    driveFolderUrl: newDriveUrl,
    customFolderConfigured: Boolean(updates.driveFolderUrl && updates.driveFolderUrl.trim())
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
  saveAccountToBrowser(updated);
  return updated;
};

export const logoutUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

/**
 * Clears ALL stored credentials, accounts and keys from the browser.
 */
export const clearAllBrowserCredentials = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(SAVED_ACCOUNTS_KEY);
  localStorage.removeItem('openrouter_api_key');
};

/**
 * Generates user-scoped storage key for isolating models, datasets, chatbots and memories per user.
 */
export const getUserScopedKey = (baseKey) => {
  const user = getCurrentUser();
  const uid = user ? user.id : 'guest';
  return `${uid}_${baseKey}`;
};

