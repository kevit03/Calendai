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

type BlogEntry = {
  id: string;
  title: string;
  contentHtml: string;
  createdAt: string;
  submittedAt: string;
  updatedAt: string;
  editUsedAt: string;
};

type UpdateState = {
  status: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error" | "dev";
  currentVersion: string;
  availableVersion: string;
  percent: number;
  message: string;
  releaseNotes: string;
  checkedAt: string;
  releasesUrl: string;
};

interface Window {
  calendarBot: {
    getState: () => Promise<CalendarState>;
    getUpdateState: () => Promise<UpdateState>;
    checkForUpdates: () => Promise<UpdateState>;
    downloadUpdate: () => Promise<UpdateState>;
    installUpdate: () => Promise<{ ok: boolean }>;
    onUpdateState: (callback: (state: UpdateState) => void) => () => void;
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
    getBlogEntries: () => Promise<BlogEntry[]>;
    saveBlogEntry: (entry: BlogEntry) => Promise<BlogEntry[]>;
    openExternal: (url: string) => Promise<{ ok: boolean }>;
  };
}
