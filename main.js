require("dotenv").config();

const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require("electron");
const { createGoogleCalendarClient, connectGoogleAccount, createCalendarEvent } = require("./src/services/google-calendar");
const {
  loadAppState,
  loadBlogEntries,
  saveOpenAIKey,
  saveBlogEntry,
  saveGoogleCredentialsFile,
  clearGoogleSession
} = require("./src/services/store");
const { draftCalendarEvent } = require("./src/services/openai");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1220,
    height: 860,
    minWidth: 980,
    minHeight: 760,
    title: "Calendar Bot",
    backgroundColor: "#f4efe7",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer-dist", "index.html"));
}

async function getStatePayload() {
  const state = loadAppState({ safeStorage });
  let connectedEmail = state.google.connectedEmail || "";

  if (state.google.hasCredentials && state.google.hasToken) {
    try {
      const client = await createGoogleCalendarClient();
      connectedEmail = client.connectedEmail || connectedEmail;
    } catch (error) {
      connectedEmail = connectedEmail || "";
    }
  }

  return {
    google: {
      hasCredentials: state.google.hasCredentials,
      hasToken: state.google.hasToken,
      connectedEmail
    },
    openai: {
      hasKey: state.openai.hasKey
    }
  };
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("app:get-state", async () => getStatePayload());

  ipcMain.handle("settings:select-google-credentials", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const savedPath = saveGoogleCredentialsFile(result.filePaths[0]);
    return {
      canceled: false,
      savedPath
    };
  });

  ipcMain.handle("settings:save-openai-key", async (_event, apiKey) => {
    saveOpenAIKey(apiKey, { safeStorage });
    return getStatePayload();
  });

  ipcMain.handle("google:connect", async () => {
    const result = await connectGoogleAccount();
    return {
      ok: true,
      connectedEmail: result.connectedEmail
    };
  });

  ipcMain.handle("google:disconnect", async () => {
    clearGoogleSession();
    return getStatePayload();
  });

  ipcMain.handle("calendar:draft-event", async (_event, payload) => {
    return draftCalendarEvent(payload);
  });

  ipcMain.handle("calendar:create-event", async (_event, draft) => {
    const result = await createCalendarEvent(draft);
    return result;
  });

  ipcMain.handle("blog:list-entries", async () => {
    return loadBlogEntries();
  });

  ipcMain.handle("blog:save-entry", async (_event, entry) => {
    return saveBlogEntry(entry);
  });

  ipcMain.handle("app:open-external", async (_event, url) => {
    await shell.openExternal(url);
    return { ok: true };
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
