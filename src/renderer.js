const elements = {
  googleStatusText: document.querySelector("#googleStatusText"),
  openaiStatusText: document.querySelector("#openaiStatusText"),
  chooseCredentialsButton: document.querySelector("#chooseCredentialsButton"),
  googleConnectButton: document.querySelector("#googleConnectButton"),
  googleDisconnectButton: document.querySelector("#googleDisconnectButton"),
  refreshStateButton: document.querySelector("#refreshStateButton"),
  openaiKeyInput: document.querySelector("#openaiKeyInput"),
  saveOpenaiKeyButton: document.querySelector("#saveOpenaiKeyButton"),
  requestInput: document.querySelector("#requestInput"),
  draftEventButton: document.querySelector("#draftEventButton"),
  composerHint: document.querySelector("#composerHint"),
  summaryInput: document.querySelector("#summaryInput"),
  locationInput: document.querySelector("#locationInput"),
  allDayInput: document.querySelector("#allDayInput"),
  attendeesInput: document.querySelector("#attendeesInput"),
  startDateTimeInput: document.querySelector("#startDateTimeInput"),
  endDateTimeInput: document.querySelector("#endDateTimeInput"),
  startDateInput: document.querySelector("#startDateInput"),
  endDateInput: document.querySelector("#endDateInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
  reviewNotesText: document.querySelector("#reviewNotesText"),
  reviewBadge: document.querySelector("#reviewBadge"),
  timedStartField: document.querySelector("#timedStartField"),
  timedEndField: document.querySelector("#timedEndField"),
  allDayStartField: document.querySelector("#allDayStartField"),
  allDayEndField: document.querySelector("#allDayEndField"),
  createEventButton: document.querySelector("#createEventButton"),
  activityBox: document.querySelector("#activityBox")
};

let state = {
  google: {
    hasCredentials: false,
    hasToken: false,
    connectedEmail: ""
  },
  openai: {
    hasKey: false
  }
};

const formInputs = [
  "#summaryInput",
  "#locationInput",
  "#allDayInput",
  "#attendeesInput",
  "#startDateTimeInput",
  "#endDateTimeInput",
  "#startDateInput",
  "#endDateInput",
  "#descriptionInput"
].map((selector) => document.querySelector(selector));

function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
}

function getLocalNowIsoString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 19);
}

function setActivity(message, isError = false) {
  elements.activityBox.textContent = message;
  elements.activityBox.style.color = isError ? "#8c2600" : "";
}

function toggleReviewState(needsReview, reviewNotes) {
  elements.reviewBadge.classList.toggle("hidden", !needsReview);
  elements.reviewNotesText.textContent = reviewNotes || "Looks ready to add.";
}

function toggleAllDayFields() {
  const allDay = elements.allDayInput.checked;
  elements.timedStartField.classList.toggle("hidden", allDay);
  elements.timedEndField.classList.toggle("hidden", allDay);
  elements.allDayStartField.classList.toggle("hidden", !allDay);
  elements.allDayEndField.classList.toggle("hidden", !allDay);
}

function populateDraft(draft) {
  elements.summaryInput.value = draft.summary || "";
  elements.locationInput.value = draft.location || "";
  elements.allDayInput.checked = Boolean(draft.allDay);
  elements.attendeesInput.value = Array.isArray(draft.attendees) ? draft.attendees.join(", ") : "";
  elements.startDateTimeInput.value = draft.startDateTime || "";
  elements.endDateTimeInput.value = draft.endDateTime || "";
  elements.startDateInput.value = draft.startDate || "";
  elements.endDateInput.value = draft.endDate || "";
  elements.descriptionInput.value = draft.description || "";
  toggleReviewState(Boolean(draft.needsReview), draft.reviewNotes);
  toggleAllDayFields();
}

function collectDraftFromForm() {
  return {
    summary: elements.summaryInput.value.trim(),
    location: elements.locationInput.value.trim(),
    allDay: elements.allDayInput.checked,
    attendees: elements.attendeesInput.value
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean),
    startDateTime: elements.startDateTimeInput.value,
    endDateTime: elements.endDateTimeInput.value,
    startDate: elements.startDateInput.value,
    endDate: elements.endDateInput.value,
    description: elements.descriptionInput.value.trim(),
    reviewNotes: elements.reviewNotesText.textContent,
    needsReview: !elements.reviewBadge.classList.contains("hidden"),
    timeZone: getLocalTimeZone()
  };
}

function hasValidDraftInForm() {
  if (!elements.summaryInput.value.trim()) {
    return false;
  }

  if (elements.allDayInput.checked) {
    return Boolean(elements.startDateInput.value);
  }

  return Boolean(elements.startDateTimeInput.value && elements.endDateTimeInput.value);
}

function updateConnectionState() {
  const googleText = state.google.hasToken
    ? `Connected${state.google.connectedEmail ? ` as ${state.google.connectedEmail}` : ""}`
    : state.google.hasCredentials
      ? "Credentials imported. Ready to connect."
      : "Import a Google desktop OAuth credentials JSON.";

  const openAiText = state.openai.hasKey
    ? "Saved locally for this app."
    : "Save an API key or set OPENAI_API_KEY.";

  elements.googleStatusText.textContent = googleText;
  elements.openaiStatusText.textContent = openAiText;

  elements.googleConnectButton.disabled = !state.google.hasCredentials;
  elements.googleDisconnectButton.disabled = !state.google.hasToken;
  elements.draftEventButton.disabled = !(state.google.hasToken && state.openai.hasKey);
  elements.createEventButton.disabled = !(state.google.hasToken && hasValidDraftInForm());

  if (state.google.hasToken && state.openai.hasKey) {
    elements.composerHint.textContent = "Everything is connected. Draft an event when you're ready.";
  } else if (!state.google.hasToken && !state.openai.hasKey) {
    elements.composerHint.textContent = "Save your OpenAI key and connect Google first.";
  } else if (!state.google.hasToken) {
    elements.composerHint.textContent = "Google still needs to be connected.";
  } else {
    elements.composerHint.textContent = "OpenAI still needs an API key.";
  }
}

async function refreshState() {
  state = await window.calendarBot.getState();
  updateConnectionState();
}

async function withButtonBusy(button, label, work) {
  const previous = button.textContent;
  button.disabled = true;
  button.textContent = label;

  try {
    await work();
  } finally {
    button.textContent = previous;
    button.disabled = false;
    updateConnectionState();
  }
}

elements.chooseCredentialsButton.addEventListener("click", async () => {
  try {
    await withButtonBusy(elements.chooseCredentialsButton, "Importing...", async () => {
      const result = await window.calendarBot.selectGoogleCredentials();
      if (!result.canceled) {
        setActivity("Google credentials imported. Next, connect your account.");
      }
      await refreshState();
    });
  } catch (error) {
    setActivity(error.message || "Could not import the credentials file.", true);
  }
});

elements.saveOpenaiKeyButton.addEventListener("click", async () => {
  try {
    await withButtonBusy(elements.saveOpenaiKeyButton, "Saving...", async () => {
      state = await window.calendarBot.saveOpenAIKey(elements.openaiKeyInput.value);
      elements.openaiKeyInput.value = "";
      updateConnectionState();
      setActivity("OpenAI key saved for Calendar Bot.");
    });
  } catch (error) {
    setActivity(error.message || "Could not save the OpenAI API key.", true);
  }
});

elements.googleConnectButton.addEventListener("click", async () => {
  try {
    await withButtonBusy(elements.googleConnectButton, "Connecting...", async () => {
      const result = await window.calendarBot.connectGoogle();
      setActivity(
        result.connectedEmail
          ? `Google Calendar connected as ${result.connectedEmail}.`
          : "Google Calendar connected."
      );
      await refreshState();
    });
  } catch (error) {
    setActivity(error.message || "Google connection failed.", true);
  }
});

elements.googleDisconnectButton.addEventListener("click", async () => {
  try {
    await withButtonBusy(elements.googleDisconnectButton, "Disconnecting...", async () => {
      state = await window.calendarBot.disconnectGoogle();
      updateConnectionState();
      setActivity("Google session cleared from this app.");
    });
  } catch (error) {
    setActivity(error.message || "Could not disconnect Google.", true);
  }
});

elements.refreshStateButton.addEventListener("click", async () => {
  try {
    await refreshState();
    setActivity("Connection state refreshed.");
  } catch (error) {
    setActivity(error.message || "Could not refresh the app state.", true);
  }
});

elements.draftEventButton.addEventListener("click", async () => {
  try {
    await withButtonBusy(elements.draftEventButton, "Drafting...", async () => {
      const draft = await window.calendarBot.draftEvent({
        request: elements.requestInput.value,
        nowIsoString: getLocalNowIsoString(),
        timeZone: getLocalTimeZone()
      });

      populateDraft(draft);
      setActivity("AI draft ready. Review it, edit anything you want, then add it to Google Calendar.");
    });
  } catch (error) {
    setActivity(error.message || "The app could not draft the event.", true);
  }
});

elements.createEventButton.addEventListener("click", async () => {
  try {
    await withButtonBusy(elements.createEventButton, "Adding...", async () => {
      const draft = collectDraftFromForm();
      const result = await window.calendarBot.createEvent(draft);
      const suffix = result.htmlLink ? ` Open it here: ${result.htmlLink}` : "";
      setActivity(`Added "${result.summary}" to Google Calendar.${suffix}`);
    });
  } catch (error) {
    setActivity(error.message || "The event could not be added to Google Calendar.", true);
  }
});

elements.allDayInput.addEventListener("change", toggleAllDayFields);
elements.allDayInput.addEventListener("change", updateConnectionState);
formInputs.forEach((input) => {
  const eventName = input.type === "checkbox" ? "change" : "input";
  input.addEventListener(eventName, updateConnectionState);
});

refreshState().catch((error) => {
  setActivity(error.message || "The app could not load its initial state.", true);
});
