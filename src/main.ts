import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDatabase, closeDatabase } from './database/index';
import { getUserCount, createUser, authenticateUser } from './database/users';
import { createSession, validateSession } from './database/sessions';

function toUser(row: { id: number; username: string; display_name: string; created_at: string }) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

function registerIpcHandlers() {
  ipcMain.handle('auth:has-users', () => {
    return getUserCount() > 0;
  });

  ipcMain.handle('auth:setup', (_event, data: { username: string; password: string; displayName: string }) => {
    try {
      if (getUserCount() > 0) {
        return { success: false, error: 'Ya existe un usuario configurado' };
      }
      const row = createUser(data.username, data.password, data.displayName);
      return { success: true, data: toUser(row) };
    } catch (err: any) {
      if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return { success: false, error: 'El nombre de usuario ya existe' };
      }
      return { success: false, error: 'Error al crear el usuario' };
    }
  });

  ipcMain.handle('auth:login', (_event, data: { username: string; password: string }) => {
    const row = authenticateUser(data.username, data.password);
    if (!row) {
      return { success: false, error: 'Usuario o contraseña incorrectos' };
    }
    const token = createSession(row.id);
    return { success: true, data: { user: toUser(row), token } };
  });

  ipcMain.handle('auth:validate-session', (_event, data: { token: string }) => {
    const row = validateSession(data.token);
    if (!row) {
      return { success: false, error: 'Sesión inválida o expirada' };
    }
    return {
      success: true,
      data: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        createdAt: row.created_at,
      },
    };
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('quit', () => {
  closeDatabase();
});
