/// <reference types="vite/client" />

type CalendarState = {
  google: {
    hasCredentials: boolean;
    hasToken: boolean;
    connectedEmail: string;
  };
  openai: {
    hasKey: boolean;
  };
};

type CalendarDraft = {
  summary: string;
  description: string;
  location: string;
  allDay: boolean;
  startDateTime: string;
  endDateTime: string;
  startDate: string;
  endDate: string;
  attendees: string[];
  needsReview: boolean;
  reviewNotes: string;
  timeZone: string;
};

type CalendarCreateResult = {
  htmlLink?: string;
  id: string;
  summary: string;
};

interface Window {
  calendarBot: {
    getState: () => Promise<CalendarState>;
    selectGoogleCredentials: () => Promise<{ canceled: boolean; savedPath?: string }>;
    saveOpenAIKey: (apiKey: string) => Promise<CalendarState>;
    connectGoogle: () => Promise<{ ok: boolean; connectedEmail: string }>;
    disconnectGoogle: () => Promise<CalendarState>;
    draftEvent: (payload: {
      request: string;
      nowIsoString: string;
      timeZone: string;
    }) => Promise<CalendarDraft>;
    createEvent: (draft: CalendarDraft) => Promise<CalendarCreateResult>;
    openExternal: (url: string) => Promise<{ ok: boolean }>;
  };
}
