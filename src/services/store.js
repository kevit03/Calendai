const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

const SETTINGS_FILE = "settings.json";
const GOOGLE_CREDENTIALS_FILE = "google-credentials.json";
const GOOGLE_TOKEN_FILE = "google-token.json";
const BLOG_ENTRIES_FILE = "blog-entries.json";
const LOCAL_GOOGLE_CREDENTIALS_FILE = "google-credentials.local.json";

function ensureAppDataDir() {
  const dir = app.getPath("userData");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolvePath(fileName) {
  return path.join(ensureAppDataDir(), fileName);
}

function readJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function getSettings({ safeStorage } = {}) {
  const settings = readJson(resolvePath(SETTINGS_FILE), {});

  if (settings.openAiKeyEncrypted && safeStorage?.isEncryptionAvailable()) {
    try {
      return {
        ...settings,
        openAiKey: safeStorage.decryptString(Buffer.from(settings.openAiKeyEncrypted, "base64"))
      };
    } catch (error) {
      return settings;
    }
  }

  return settings;
}

function saveSettings(nextSettings, { safeStorage } = {}) {
  const current = readJson(resolvePath(SETTINGS_FILE), {});
  const payload = { ...current, ...nextSettings };

  if (typeof payload.openAiKey === "string") {
    if (payload.openAiKey && safeStorage?.isEncryptionAvailable()) {
      payload.openAiKeyEncrypted = safeStorage.encryptString(payload.openAiKey).toString("base64");
      delete payload.openAiKeyPlaintext;
    } else {
      payload.openAiKeyPlaintext = payload.openAiKey;
      delete payload.openAiKeyEncrypted;
    }

    delete payload.openAiKey;
  }

  writeJson(resolvePath(SETTINGS_FILE), payload);
}

function saveOpenAIKey(apiKey, { safeStorage } = {}) {
  saveSettings(
    {
      openAiKey: (apiKey || "").trim()
    },
    { safeStorage }
  );
}

function getOpenAIKey({ safeStorage } = {}) {
  const envKey = process.env.OPENAI_API_KEY;
  if (envKey) {
    return envKey;
  }

  const settings = getSettings({ safeStorage });
  return settings.openAiKey || settings.openAiKeyPlaintext || "";
}

function saveGoogleCredentialsFile(sourcePath) {
  const destination = resolvePath(GOOGLE_CREDENTIALS_FILE);
  fs.copyFileSync(sourcePath, destination);
  return destination;
}

function getWorkspaceGoogleCredentialsPath() {
  return path.join(process.cwd(), LOCAL_GOOGLE_CREDENTIALS_FILE);
}

function getGoogleCredentialsPath() {
  const userDataPath = resolvePath(GOOGLE_CREDENTIALS_FILE);
  if (fs.existsSync(userDataPath)) {
    return userDataPath;
  }

  const workspacePath = getWorkspaceGoogleCredentialsPath();
  if (fs.existsSync(workspacePath)) {
    return workspacePath;
  }

  return userDataPath;
}

function hasGoogleCredentials() {
  return fs.existsSync(getGoogleCredentialsPath());
}

function getGoogleTokenPath() {
  return resolvePath(GOOGLE_TOKEN_FILE);
}

function loadGoogleToken() {
  return readJson(getGoogleTokenPath(), null);
}

function saveGoogleToken(token) {
  writeJson(getGoogleTokenPath(), token);
}

function clearGoogleSession() {
  const tokenPath = getGoogleTokenPath();
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }

  saveSettings(
    {
      googleConnectedEmail: ""
    },
    {}
  );
}

function saveConnectedEmail(email, { safeStorage } = {}) {
  saveSettings(
    {
      googleConnectedEmail: email || ""
    },
    { safeStorage }
  );
}

function loadAppState({ safeStorage } = {}) {
  const settings = getSettings({ safeStorage });

  return {
    google: {
      hasCredentials: hasGoogleCredentials(),
      hasToken: fs.existsSync(getGoogleTokenPath()),
      connectedEmail: settings.googleConnectedEmail || ""
    },
    openai: {
      hasKey: Boolean(getOpenAIKey({ safeStorage }))
    }
  };
}

function sortBlogEntries(entries) {
  return [...entries].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.submittedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.submittedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function loadBlogEntries() {
  const entries = readJson(resolvePath(BLOG_ENTRIES_FILE), []);
  if (!Array.isArray(entries)) {
    return [];
  }

  return sortBlogEntries(entries);
}

function saveBlogEntry(entry) {
  const entries = loadBlogEntries();
  const nextEntry = {
    id: entry.id,
    title: entry.title || "",
    contentHtml: entry.contentHtml || "",
    createdAt: entry.createdAt || "",
    submittedAt: entry.submittedAt || "",
    updatedAt: entry.updatedAt || "",
    editUsedAt: entry.editUsedAt || ""
  };
  const existingIndex = entries.findIndex((item) => item.id === nextEntry.id);

  if (existingIndex >= 0) {
    entries[existingIndex] = nextEntry;
  } else {
    entries.unshift(nextEntry);
  }

  const sortedEntries = sortBlogEntries(entries);
  writeJson(resolvePath(BLOG_ENTRIES_FILE), sortedEntries);
  return sortedEntries;
}

module.exports = {
  clearGoogleSession,
  getGoogleCredentialsPath,
  getWorkspaceGoogleCredentialsPath,
  getGoogleTokenPath,
  getOpenAIKey,
  hasGoogleCredentials,
  loadBlogEntries,
  loadAppState,
  loadGoogleToken,
  saveBlogEntry,
  saveConnectedEmail,
  saveGoogleCredentialsFile,
  saveGoogleToken,
  saveOpenAIKey
};
