const { app } = require("electron");
const { autoUpdater } = require("electron-updater");

const RELEASES_URL = "https://github.com/kevit03/Calendai/releases";

let broadcastUpdateState = () => {};

let updateState = {
  status: "idle",
  currentVersion: app.getVersion(),
  availableVersion: "",
  percent: 0,
  message: "",
  releaseNotes: "",
  checkedAt: "",
  releasesUrl: RELEASES_URL
};

function normalizeReleaseNotes(releaseNotes) {
  if (!releaseNotes) {
    return "";
  }

  if (typeof releaseNotes === "string") {
    return releaseNotes.trim();
  }

  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map((note) => {
        if (typeof note === "string") {
          return note.trim();
        }

        if (note && typeof note.note === "string") {
          return note.note.trim();
        }

        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  return "";
}

function setUpdateState(patch) {
  updateState = {
    ...updateState,
    ...patch,
    currentVersion: app.getVersion(),
    releasesUrl: RELEASES_URL
  };

  broadcastUpdateState(updateState);
  return updateState;
}

function getUpdateState() {
  return {
    ...updateState,
    currentVersion: app.getVersion(),
    releasesUrl: RELEASES_URL
  };
}

function checkForUpdates() {
  if (!app.isPackaged) {
    return setUpdateState({
      status: "dev",
      message: "Update checks run in installed builds.",
      checkedAt: new Date().toISOString()
    });
  }

  autoUpdater.checkForUpdates().catch((error) => {
    setUpdateState({
      status: "error",
      message: error.message || "Update check failed."
    });
  });

  return getUpdateState();
}

function downloadUpdate() {
  if (!app.isPackaged) {
    return setUpdateState({
      status: "dev",
      message: "Install the packaged app to test updates."
    });
  }

  autoUpdater.downloadUpdate().catch((error) => {
    setUpdateState({
      status: "error",
      message: error.message || "Download failed."
    });
  });

  return getUpdateState();
}

function installDownloadedUpdate() {
  if (updateState.status === "downloaded") {
    autoUpdater.quitAndInstall();
    return { ok: true };
  }

  return { ok: false };
}

function configureUpdater(sendState) {
  broadcastUpdateState = sendState;

  if (!app.isPackaged) {
    setUpdateState({
      status: "dev",
      message: "Update checks run in installed builds."
    });
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    setUpdateState({
      status: "checking",
      percent: 0,
      message: "Checking for updates...",
      checkedAt: new Date().toISOString()
    });
  });

  autoUpdater.on("update-available", (info) => {
    setUpdateState({
      status: "available",
      availableVersion: info.version || "",
      percent: 0,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
      message: `Version ${info.version} is available.`
    });
  });

  autoUpdater.on("update-not-available", () => {
    setUpdateState({
      status: "not-available",
      availableVersion: "",
      percent: 0,
      releaseNotes: "",
      message: "You're on the latest version.",
      checkedAt: new Date().toISOString()
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    setUpdateState({
      status: "downloading",
      percent: progress.percent || 0,
      message: `Downloading update... ${Math.round(progress.percent || 0)}%`
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    setUpdateState({
      status: "downloaded",
      availableVersion: info.version || "",
      percent: 100,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
      message: `Version ${info.version} is ready to install.`
    });
  });

  autoUpdater.on("error", (error) => {
    setUpdateState({
      status: "error",
      message: error?.message || "Update flow failed."
    });
  });

  setTimeout(() => {
    checkForUpdates();
  }, 3000);
}

module.exports = {
  checkForUpdates,
  configureUpdater,
  downloadUpdate,
  getUpdateState,
  installDownloadedUpdate,
  RELEASES_URL
};
