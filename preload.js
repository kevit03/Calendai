const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("calendarBot", {
  getState: () => ipcRenderer.invoke("app:get-state"),
  selectGoogleCredentials: () => ipcRenderer.invoke("settings:select-google-credentials"),
  saveOpenAIKey: (apiKey) => ipcRenderer.invoke("settings:save-openai-key", apiKey),
  connectGoogle: () => ipcRenderer.invoke("google:connect"),
  disconnectGoogle: () => ipcRenderer.invoke("google:disconnect"),
  draftEvent: (payload) => ipcRenderer.invoke("calendar:draft-event", payload),
  createEvent: (draft) => ipcRenderer.invoke("calendar:create-event", draft),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url)
});
