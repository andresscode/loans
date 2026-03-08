import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  auth: {
    hasUsers: () => ipcRenderer.invoke("auth:has-users"),
    setup: (data: {
      username: string;
      password: string;
      displayName: string;
    }) => ipcRenderer.invoke("auth:setup", data),
    login: (data: { username: string; password: string }) =>
      ipcRenderer.invoke("auth:login", data),
    validateSession: (data: { token: string }) =>
      ipcRenderer.invoke("auth:validate-session", data),
  },
});
