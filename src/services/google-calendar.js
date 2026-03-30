const fs = require("node:fs");
const http = require("node:http");
const { URL } = require("node:url");
const { shell } = require("electron");
const { google } = require("googleapis");
const {
  getGoogleCredentialsPath,
  loadGoogleToken,
  saveConnectedEmail,
  saveGoogleToken
} = require("./store");

const GOOGLE_CALENDAR_SCOPE = ["https://www.googleapis.com/auth/calendar"];

function parseGoogleCredentials() {
  const credentialsPath = getGoogleCredentialsPath();
  if (!fs.existsSync(credentialsPath)) {
    throw new Error("Add your Google OAuth credentials JSON first.");
  }

  const raw = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const config = raw.installed || raw.web;

  if (!config?.client_id || !config.client_secret) {
    throw new Error("Google credentials JSON is missing the client ID or client secret.");
  }

  return config;
}

function createOauthClient(redirectUri) {
  const credentials = parseGoogleCredentials();
  return new google.auth.OAuth2(credentials.client_id, credentials.client_secret, redirectUri);
}

async function attachTokenPersistence(oauth2Client) {
  oauth2Client.on("tokens", (tokens) => {
    const merged = {
      ...loadGoogleToken(),
      ...oauth2Client.credentials,
      ...tokens
    };
    saveGoogleToken(merged);
  });
}

async function fetchConnectedEmail(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  const result = await calendar.calendarList.get({ calendarId: "primary" });
  return result.data.id || result.data.summary || "";
}

async function connectGoogleAccount() {
  const credentials = parseGoogleCredentials();
  const redirectTemplate = credentials.redirect_uris?.[0] || "http://127.0.0.1";
  const redirectUrl = new URL(redirectTemplate);
  const callbackPath = redirectUrl.pathname || "/";
  const hostname = redirectUrl.hostname || "127.0.0.1";

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      const requestUrl = new URL(request.url, `http://${request.headers.host}`);

      if (requestUrl.pathname !== callbackPath) {
        response.writeHead(404);
        response.end("Not found.");
        return;
      }

      const authCode = requestUrl.searchParams.get("code");
      const authError = requestUrl.searchParams.get("error");

      if (authError) {
        response.writeHead(400, { "Content-Type": "text/html" });
        response.end("<h2>Google sign-in was canceled.</h2><p>You can close this tab and return to Calendar Bot.</p>");
        server.close();
        reject(new Error(`Google authorization failed: ${authError}`));
        return;
      }

      if (!authCode) {
        response.writeHead(400, { "Content-Type": "text/html" });
        response.end("<h2>Missing authorization code.</h2><p>You can close this tab and try again.</p>");
        server.close();
        reject(new Error("Google did not return an authorization code."));
        return;
      }

      try {
        const address = server.address();
        const redirectUri = `http://${hostname}:${address.port}${callbackPath}`;
        const oauth2Client = createOauthClient(redirectUri);
        await attachTokenPersistence(oauth2Client);
        const { tokens } = await oauth2Client.getToken(authCode);

        oauth2Client.setCredentials(tokens);
        saveGoogleToken(oauth2Client.credentials);

        const connectedEmail = await fetchConnectedEmail(oauth2Client);
        saveConnectedEmail(connectedEmail);

        response.writeHead(200, { "Content-Type": "text/html" });
        response.end("<h2>Calendar Bot is connected.</h2><p>You can close this tab and go back to the app.</p>");
        server.close();
        resolve({ connectedEmail });
      } catch (error) {
        response.writeHead(500, { "Content-Type": "text/html" });
        response.end("<h2>Connection failed.</h2><p>You can close this tab and try again in Calendar Bot.</p>");
        server.close();
        reject(error);
      }
    });

    server.on("error", (error) => {
      reject(error);
    });

    server.listen(0, hostname, async () => {
      try {
        const address = server.address();
        const redirectUri = `http://${hostname}:${address.port}${callbackPath}`;
        const oauth2Client = createOauthClient(redirectUri);
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: "offline",
          prompt: "consent",
          scope: GOOGLE_CALENDAR_SCOPE
        });

        await shell.openExternal(authUrl);
      } catch (error) {
        server.close();
        reject(error);
      }
    });
  });
}

async function createGoogleCalendarClient() {
  const token = loadGoogleToken();
  if (!token) {
    throw new Error("Connect your Google account before creating events.");
  }

  const credentials = parseGoogleCredentials();
  const oauth2Client = createOauthClient(credentials.redirect_uris?.[0] || "http://127.0.0.1");
  await attachTokenPersistence(oauth2Client);
  oauth2Client.setCredentials(token);

  const connectedEmail = await fetchConnectedEmail(oauth2Client);
  saveConnectedEmail(connectedEmail);

  return {
    auth: oauth2Client,
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
    connectedEmail
  };
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeDateTime(localDateTime) {
  if (!localDateTime) {
    return "";
  }

  return localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
}

async function createCalendarEvent(draft) {
  const { calendar } = await createGoogleCalendarClient();
  const event = {
    summary: draft.summary,
    description: draft.description || "",
    location: draft.location || "",
    attendees: Array.isArray(draft.attendees)
      ? draft.attendees.filter(Boolean).map((email) => ({ email }))
      : []
  };

  if (draft.allDay) {
    if (!draft.startDate) {
      throw new Error("All-day events need a start date.");
    }

    const inclusiveEndDate = draft.endDate || draft.startDate;
    event.start = { date: draft.startDate };
    event.end = { date: addDays(inclusiveEndDate, 1) };
  } else {
    if (!draft.startDateTime || !draft.endDateTime) {
      throw new Error("Timed events need both a start and end time.");
    }

    event.start = {
      dateTime: normalizeDateTime(draft.startDateTime),
      timeZone: draft.timeZone
    };
    event.end = {
      dateTime: normalizeDateTime(draft.endDateTime),
      timeZone: draft.timeZone
    };
  }

  const result = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event
  });

  return {
    htmlLink: result.data.htmlLink,
    id: result.data.id,
    summary: result.data.summary
  };
}

module.exports = {
  connectGoogleAccount,
  createCalendarEvent,
  createGoogleCalendarClient
};
