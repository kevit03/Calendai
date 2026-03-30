const OpenAI = require("openai");
const { getOpenAIKey } = require("./store");

function buildDraftSchema() {
  return {
    name: "calendar_event_draft",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        description: { type: "string" },
        location: { type: "string" },
        allDay: { type: "boolean" },
        startDateTime: { type: "string" },
        endDateTime: { type: "string" },
        startDate: { type: "string" },
        endDate: { type: "string" },
        attendees: {
          type: "array",
          items: { type: "string" }
        },
        needsReview: { type: "boolean" },
        reviewNotes: { type: "string" }
      },
      required: [
        "summary",
        "description",
        "location",
        "allDay",
        "startDateTime",
        "endDateTime",
        "startDate",
        "endDate",
        "attendees",
        "needsReview",
        "reviewNotes"
      ]
    }
  };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(date) {
  return `${formatDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseSlashDate(value) {
  const match = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return {
    raw: match[0],
    date
  };
}

function normalizeHour(hours, meridiem) {
  let normalized = Number(hours);
  if (meridiem === "pm" && normalized !== 12) {
    normalized += 12;
  }
  if (meridiem === "am" && normalized === 12) {
    normalized = 0;
  }
  return normalized;
}

function buildDateTime(baseDate, hours, minutes) {
  const nextDate = new Date(baseDate);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

function parseTimeRange(value, baseDate) {
  const rangeMatch = value.match(
    /\b(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i
  );
  if (!rangeMatch) {
    return null;
  }

  const inferredStartMeridiem = (rangeMatch[3] || rangeMatch[6] || "").toLowerCase();
  if (!inferredStartMeridiem) {
    return null;
  }

  const startHours = normalizeHour(rangeMatch[1], inferredStartMeridiem);
  const startMinutes = Number(rangeMatch[2] || "0");
  const endHours = normalizeHour(rangeMatch[4], rangeMatch[6].toLowerCase());
  const endMinutes = Number(rangeMatch[5] || "0");

  return {
    raw: rangeMatch[0],
    start: buildDateTime(baseDate, startHours, startMinutes),
    end: buildDateTime(baseDate, endHours, endMinutes)
  };
}

function parseSingleTime(value, baseDate) {
  const match = value.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!match) {
    return null;
  }

  const hours = normalizeHour(match[1], match[3].toLowerCase());
  const minutes = Number(match[2] || "0");

  return {
    raw: match[0],
    start: buildDateTime(baseDate, hours, minutes)
  };
}

function parseDurationMinutes(value) {
  const hourMatch = value.match(/\bfor\s+(\d+)\s*hours?\b/i);
  if (hourMatch) {
    return {
      raw: hourMatch[0],
      minutes: Number(hourMatch[1]) * 60
    };
  }

  const minuteMatch = value.match(/\bfor\s+(\d+)\s*minutes?\b/i);
  if (minuteMatch) {
    return {
      raw: minuteMatch[0],
      minutes: Number(minuteMatch[1])
    };
  }

  return null;
}

function extractAttendees(value) {
  return Array.from(value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)).map((match) => match[0]);
}

function extractLocation(value) {
  const match = value.match(/\b(?:at|in|to)\s+([^,]+?)(?=\s+(?:with|for|on)\b|$)/i);
  return match ? match[1].trim() : "";
}

function cleanSummarySeed(value) {
  return value
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ")
    .replace(/\ball[\s-]?day\b/gi, " ")
    .replace(/\b(?:from\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|to|until)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, " ")
    .replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, " ")
    .replace(/\bfor\s+\d+\s*(?:hours?|minutes?)\b/gi, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/\b(?:at|in|to)\s+[^,]+?(?=\s+(?:with|for|on)\b|$)/gi, " ")
    .replace(/\bwith\s+.+$/i, " ")
    .replace(/\b(?:on|at|in|to|for|with)\s*$/i, "")
    .replace(/[,:;]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/[A-Z].*[A-Z]/.test(word)) {
        return word;
      }
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function normalizeSummary(summary, request, fallback) {
  const cleaned = cleanSummarySeed(summary || "");
  const nextSummary = cleaned || cleanSummarySeed(request) || fallback || "New Event";
  return toTitleCase(nextSummary).slice(0, 80);
}

function normalizeDescription(description) {
  return String(description || "").trim();
}

function buildDeterministicDraft({ request, nowIsoString, timeZone }) {
  const cleaned = request.trim().replace(/\s+/g, " ");
  const now = new Date(nowIsoString);
  const attendees = extractAttendees(cleaned);
  const location = extractLocation(cleaned);
  const dateMatch = parseSlashDate(cleaned);
  const baseDate = dateMatch ? dateMatch.date : now;
  const explicitAllDay = /\ball[\s-]?day\b/i.test(cleaned);
  const timeRange = parseTimeRange(cleaned, baseDate);
  const singleTime = timeRange ? null : parseSingleTime(cleaned, baseDate);
  const duration = timeRange ? null : parseDurationMinutes(cleaned);
  const hasExplicitTime = Boolean(timeRange || singleTime);

  const draft = {
    summary: normalizeSummary(cleaned, cleaned, "New Event"),
    description: "",
    location,
    allDay: !hasExplicitTime,
    startDateTime: "",
    endDateTime: "",
    startDate: "",
    endDate: "",
    attendees,
    needsReview: false,
    reviewNotes: "",
    timeZone
  };

  if (!hasExplicitTime) {
    if (dateMatch) {
      draft.startDate = formatDate(dateMatch.date);
      draft.endDate = formatDate(dateMatch.date);
    } else {
      draft.needsReview = true;
      draft.reviewNotes = "No date was found, so the calendar date is still blank.";
    }

    if (dateMatch && !explicitAllDay) {
      draft.reviewNotes = "No time was found, so this was kept as an all-day event.";
    }

    return draft;
  }

  draft.allDay = false;

  if (!dateMatch) {
    draft.needsReview = true;
    draft.reviewNotes = "A time was found, but no date was found, so the schedule is still incomplete.";
    return draft;
  }

  if (timeRange) {
    draft.startDateTime = formatDateTime(timeRange.start);
    draft.endDateTime = formatDateTime(timeRange.end);
    return draft;
  }

  if (singleTime) {
    draft.startDateTime = formatDateTime(singleTime.start);
    if (duration) {
      draft.endDateTime = formatDateTime(new Date(singleTime.start.getTime() + duration.minutes * 60000));
    } else {
      draft.needsReview = true;
      draft.reviewNotes = "A start time was found, but no explicit end time was found.";
    }
  }

  return draft;
}

function normalizeDraft(aiDraft, input, fallbackDraft) {
  const raw = aiDraft || {};
  const normalized = {
    summary: normalizeSummary(raw.summary, input.request, fallbackDraft.summary),
    description: normalizeDescription(raw.description),
    location: String(raw.location || "").trim() || fallbackDraft.location,
    allDay: Boolean(raw.allDay),
    startDateTime: String(raw.startDateTime || "").trim(),
    endDateTime: String(raw.endDateTime || "").trim(),
    startDate: String(raw.startDate || "").trim(),
    endDate: String(raw.endDate || "").trim(),
    attendees: Array.isArray(raw.attendees)
      ? raw.attendees.map((email) => String(email).trim()).filter(Boolean)
      : fallbackDraft.attendees,
    needsReview: Boolean(raw.needsReview),
    reviewNotes: String(raw.reviewNotes || "").trim(),
    timeZone: input.timeZone
  };

  if (!normalized.location) {
    normalized.location = fallbackDraft.location;
  }

  if (!normalized.attendees.length) {
    normalized.attendees = fallbackDraft.attendees;
  }

  if (!normalized.startDate && fallbackDraft.startDate) {
    normalized.startDate = fallbackDraft.startDate;
  }

  if (!normalized.endDate && fallbackDraft.endDate) {
    normalized.endDate = fallbackDraft.endDate;
  }

  if (!normalized.startDateTime && fallbackDraft.startDateTime) {
    normalized.startDateTime = fallbackDraft.startDateTime;
  }

  if (!normalized.endDateTime && fallbackDraft.endDateTime) {
    normalized.endDateTime = fallbackDraft.endDateTime;
  }

  const hasTimedValues = Boolean(normalized.startDateTime || normalized.endDateTime || fallbackDraft.allDay === false);
  normalized.allDay = hasTimedValues ? false : true;

  if (normalized.allDay) {
    normalized.startDateTime = "";
    normalized.endDateTime = "";
    if (normalized.startDate && !normalized.endDate) {
      normalized.endDate = normalized.startDate;
    }
    if (!normalized.startDate) {
      normalized.needsReview = true;
      normalized.reviewNotes = normalized.reviewNotes || "No date was found, so the calendar date is still blank.";
    } else if (!normalized.reviewNotes && !/\ball[\s-]?day\b/i.test(input.request)) {
      normalized.reviewNotes = "No time was found, so this was kept as an all-day event.";
    }
    return normalized;
  }

  normalized.startDate = "";
  normalized.endDate = "";

  if (!normalized.startDateTime) {
    normalized.needsReview = true;
    normalized.reviewNotes = normalized.reviewNotes || "A time was found, but the start date and time are still incomplete.";
  } else if (!normalized.endDateTime) {
    normalized.needsReview = true;
    normalized.reviewNotes = normalized.reviewNotes || "A start time was found, but no explicit end time was found.";
  }

  return normalized;
}

async function draftWithOpenAI(input, fallbackDraft) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return null;
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: "gpt-5-mini",
    reasoning: {
      effort: "medium"
    },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are scheduling assistant for a Google Calendar app. " +
              "Parse the user's request into a draft event. Resolve relative dates using the provided current local time and timezone. " +
              "Use these rules exactly: " +
              "1. The title must be concise, clear, and derived from the user's intent. Usually 2 to 6 words. " +
              "2. Do not include dates, times, 'all day', email addresses, or filler words in the title. " +
              "3. Keep the title human and calendar-ready, for example 'UPenn Visit', 'Project Sync', or 'Dinner with Maya'. " +
              "4. Put locations in location, not in the title, unless the location is the core identity of the event. " +
              "5. Default to allDay=true when no explicit time is mentioned. " +
              "6. If a field is unknown, leave it blank. Never guess missing times, dates, durations, or attendees. " +
              "7. For all-day events, use startDate and endDate in YYYY-MM-DD and leave datetime fields blank. " +
              "8. For timed events, use startDateTime and endDateTime in YYYY-MM-DDTHH:mm and leave date fields blank. " +
              "9. If only a start time is present, fill only startDateTime and leave endDateTime blank. " +
              "10. The description should be short and useful, and only include details actually stated by the user. " +
              "11. Set needsReview=true whenever any scheduling field is still incomplete."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `Current local time: ${input.nowIsoString}\n` +
              `Timezone: ${input.timeZone}\n` +
              `Request: ${input.request}\n` +
              `Local parser fallback: ${JSON.stringify({
                summary: fallbackDraft.summary,
                location: fallbackDraft.location,
                allDay: fallbackDraft.allDay,
                startDateTime: fallbackDraft.startDateTime,
                endDateTime: fallbackDraft.endDateTime,
                startDate: fallbackDraft.startDate,
                endDate: fallbackDraft.endDate,
                attendees: fallbackDraft.attendees
              })}`
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        ...buildDraftSchema()
      }
    }
  });

  if (!response.output_text) {
    return null;
  }

  return JSON.parse(response.output_text);
}

async function draftCalendarEvent(input) {
  if (!input.request?.trim()) {
    throw new Error("Type what you want to schedule first.");
  }

  const fallbackDraft = buildDeterministicDraft(input);

  try {
    const aiDraft = await draftWithOpenAI(input, fallbackDraft);
    if (aiDraft) {
      return normalizeDraft(aiDraft, input, fallbackDraft);
    }
  } catch (error) {
    // Fall back to deterministic parsing below.
  }

  return normalizeDraft(fallbackDraft, input, fallbackDraft);
}

module.exports = {
  draftCalendarEvent
};
