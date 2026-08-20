// AI Studio Pro - Authentication & Google Identity Service

const AUTH_STORAGE_KEY = 'aistudio_current_user';

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

export const loginWithGoogleAccount = ({ name, email, avatar = null }) => {
  const cleanEmail = (email || '').trim().toLowerCase();
  const userId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_') || `user_${Date.now()}`;
  
  // Default avatar generator if none provided
  const userAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`;

  const user = {
    id: userId,
    email: cleanEmail,
    name: name || cleanEmail.split('@')[0],
    avatar: userAvatar,
    provider: 'google',
    googleConnected: true,
    driveFolderUrl: `https://drive.google.com/drive/my-drive`,
    loggedInAt: new Date().toISOString()
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  return user;
};

export const logoutUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getUserScopedKey = (baseKey) => {
  const user = getCurrentUser();
  const uid = user ? user.id : 'guest';
  return `${uid}_${baseKey}`;
};
