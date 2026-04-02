const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("calendarBot", {
  getState: () => ipcRenderer.invoke("app:get-state"),
  getUpdateState: () => ipcRenderer.invoke("app:get-update-state"),
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("app:download-update"),
  installUpdate: () => ipcRenderer.invoke("app:install-update"),
  onUpdateState: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("app:update-state", listener);
    return () => ipcRenderer.removeListener("app:update-state", listener);
  },
  selectGoogleCredentials: () => ipcRenderer.invoke("settings:select-google-credentials"),
  saveOpenAIKey: (apiKey) => ipcRenderer.invoke("settings:save-openai-key", apiKey),
  connectGoogle: () => ipcRenderer.invoke("google:connect"),
  disconnectGoogle: () => ipcRenderer.invoke("google:disconnect"),
  draftEvent: (payload) => ipcRenderer.invoke("calendar:draft-event", payload),
  createEvent: (draft) => ipcRenderer.invoke("calendar:create-event", draft),
  getBlogEntries: () => ipcRenderer.invoke("blog:list-entries"),
  saveBlogEntry: (entry) => ipcRenderer.invoke("blog:save-entry", entry),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url)
});
