import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  ArrowRightIcon,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Link2,
  LoaderCircle,
  Mail,
  RefreshCw,
  Settings,
  Sparkles,
  Upload,
  User
} from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { Button } from "@/components/ui/button";
import FloatingActionMenu from "@/components/ui/floating-action-menu";
import { Header } from "@/components/ui/header-3";
import { cn } from "@/lib/utils";

type AppBanner =
  | {
      variant: "success" | "warning" | "info";
      title: string;
      description?: string;
      link?: string;
    }
  | null;

const TooltipProvider = TooltipPrimitive.Provider;

function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
}

function getLocalNowIsoString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 19);
}

function emptyDraft(): CalendarDraft {
  return {
    summary: "",
    description: "",
    location: "",
    allDay: false,
    startDateTime: "",
    endDateTime: "",
    startDate: "",
    endDate: "",
    attendees: [],
    needsReview: false,
    reviewNotes: "",
    timeZone: getLocalTimeZone()
  };
}

function SectionTitle({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#1a73e8]">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="border-b border-slate-200 pb-4">
      <div className={cn("mb-3 inline-flex p-2", tone)}>{icon}</div>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function App() {
  const [state, setState] = React.useState<CalendarState>({
    google: { hasCredentials: false, hasToken: false, connectedEmail: "" },
    openai: { hasKey: false }
  });
  const [request, setRequest] = React.useState("");
  const [draft, setDraft] = React.useState<CalendarDraft>(emptyDraft());
  const [banner, setBanner] = React.useState<AppBanner>(null);
  const [activity, setActivity] = React.useState("Calendar Bot is ready. Connect Google and start scheduling.");
  const [isDrafting, setIsDrafting] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState<"" | "credentials" | "google" | "disconnect" | "refresh" | "saveKey">("");
  const [openAiKeyInput, setOpenAiKeyInput] = React.useState("");

  const refreshState = React.useCallback(async () => {
    const nextState = await window.calendarBot.getState();
    setState(nextState);
    return nextState;
  }, []);

  React.useEffect(() => {
    refreshState().catch((error: Error) => {
      setBanner({
        variant: "warning",
        title: "Could not load app state",
        description: error.message
      });
    });
  }, [refreshState]);

  const composerHint = React.useMemo(() => {
    if (state.google.hasToken && state.openai.hasKey) {
      return "Write the request naturally. The AI will turn it into a short title, pull out the date and time, and leave anything unknown blank for review.";
    }
    if (!state.google.hasToken && !state.openai.hasKey) {
      return "Connect Google and load your OpenAI key to use the AI scheduler.";
    }
    if (!state.google.hasToken) {
      return "Google Calendar still needs to be connected.";
    }
    return "OpenAI still needs an API key.";
  }, [state.google.hasToken, state.openai.hasKey]);

  const canCreate = React.useMemo(() => {
    if (!state.google.hasToken || !draft.summary.trim()) {
      return false;
    }
    if (draft.allDay) {
      return Boolean(draft.startDate);
    }
    return Boolean(draft.startDateTime && draft.endDateTime);
  }, [draft, state.google.hasToken]);

  const createBannerFromError = (title: string, error: unknown) => {
    setBanner({
      variant: "warning",
      title,
      description: error instanceof Error ? error.message : "Something went wrong."
    });
  };

  const handleImportCredentials = async () => {
    try {
      setBusyAction("credentials");
      const result = await window.calendarBot.selectGoogleCredentials();
      if (!result.canceled) {
        await refreshState();
        setActivity("Google credentials imported. Your next step is to connect the account.");
        setBanner({
          variant: "info",
          title: "Credentials imported",
          description: "You can connect Google Calendar now."
        });
      }
    } catch (error) {
      createBannerFromError("Could not import credentials", error);
    } finally {
      setBusyAction("");
    }
  };

  const handleSaveOpenAiKey = async () => {
    try {
      setBusyAction("saveKey");
      const nextState = await window.calendarBot.saveOpenAIKey(openAiKeyInput);
      setState(nextState);
      setOpenAiKeyInput("");
      setActivity("OpenAI API key saved locally for Calendar Bot.");
      setBanner({
        variant: "info",
        title: "OpenAI key saved",
        description: "The app can now use AI drafting the next time you launch it locally."
      });
    } catch (error) {
      createBannerFromError("Could not save the OpenAI key", error);
    } finally {
      setBusyAction("");
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setBusyAction("google");
      const result = await window.calendarBot.connectGoogle();
      await refreshState();
      setActivity(result.connectedEmail ? `Google Calendar connected as ${result.connectedEmail}.` : "Google Calendar connected.");
      setBanner({
        variant: "info",
        title: "Google Calendar connected",
        description: result.connectedEmail || "Your account is ready for event creation."
      });
    } catch (error) {
      createBannerFromError("Google sign-in did not finish", error);
    } finally {
      setBusyAction("");
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setBusyAction("disconnect");
      const nextState = await window.calendarBot.disconnectGoogle();
      setState(nextState);
      setActivity("Google session cleared from this app.");
      setBanner({
        variant: "info",
        title: "Disconnected",
        description: "Your local Google session has been removed from Calendar Bot."
      });
    } catch (error) {
      createBannerFromError("Could not disconnect Google", error);
    } finally {
      setBusyAction("");
    }
  };

  const handleDraft = async (message?: string) => {
    try {
      const nextRequest = message ?? request;
      if (!nextRequest.trim()) {
        return;
      }
      setIsDrafting(true);
      const nextDraft = await window.calendarBot.draftEvent({
        request: nextRequest,
        nowIsoString: getLocalNowIsoString(),
        timeZone: getLocalTimeZone()
      });
      setDraft(nextDraft);
      setRequest(nextRequest);
      setActivity("AI draft ready. Review it, edit anything you want, then add it to Google Calendar.");
      setBanner({
        variant: nextDraft.needsReview ? "warning" : "info",
        title: nextDraft.needsReview ? "Draft created with review notes" : "Draft created",
        description: nextDraft.reviewNotes || "Your event looks ready to schedule."
      });
      document.getElementById("review")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      createBannerFromError("The app could not draft the event", error);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      setIsCreating(true);
      const result = await window.calendarBot.createEvent(draft);
      setActivity(`Added "${result.summary}" to Google Calendar.`);
      setBanner({
        variant: "success",
        title: "Google Calendar updated",
        description: `${result.summary} is now on your schedule.`,
        link: result.htmlLink
      });
    } catch (error) {
      createBannerFromError("The event could not be added", error);
    } finally {
      setIsCreating(false);
    }
  };

  const openGoogleCalendar = React.useCallback(async (url = "https://calendar.google.com") => {
    await window.calendarBot.openExternal(url);
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <div id="top" className="calendar-shell min-h-screen">
        <Header />

        <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
          <section className="space-y-8">
            <div className="space-y-6 pb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f0fe] px-4 py-2 text-sm font-medium text-[#1a73e8]">
                  <Sparkles className="h-4 w-4" />
                  Simple scheduling, Google Calendar style
                </div>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  A calmer calendar bot with fast AI drafting and cleaner Google Calendar handoff.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  Connect your Google account, describe what should happen in plain English, review the draft, and send it to your calendar with a clear success notification and open-calendar shortcut.
                </p>

                {banner && (
                  <Banner
                    show
                    variant={banner.variant}
                    title={banner.title}
                    description={banner.description}
                    closable
                    onHide={() => setBanner(null)}
                    showShade
                    icon={
                      banner.variant === "success" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : banner.variant === "warning" ? (
                        <CalendarClock className="h-5 w-5" />
                      ) : (
                        <CalendarCheck2 className="h-5 w-5" />
                      )
                    }
                    action={
                      banner.link ? (
                        <Button
                          variant="ghost"
                          className="bg-black/5"
                          onClick={() => void openGoogleCalendar(banner.link)}
                          type="button"
                        >
                          Open in Google Calendar
                          <ArrowRightIcon className="ml-1 h-4 w-4" />
                        </Button>
                      ) : undefined
                    }
                  />
                )}
            </div>

              <div className="grid gap-6 md:grid-cols-3">
                <MetricCard
                  icon={<Calendar className="h-5 w-5 text-[#1a73e8]" />}
                  label="Connection"
                  value={state.google.hasToken ? "Google Calendar linked" : "Needs sign-in"}
                  tone="bg-[#e8f0fe]"
                />
                <MetricCard
                  icon={<Sparkles className="h-5 w-5 text-[#188038]" />}
                  label="AI drafting"
                  value={state.openai.hasKey ? "Ready to parse prompts" : "Waiting for API key"}
                  tone="bg-[#e6f4ea]"
                />
                <MetricCard
                  icon={<CalendarClock className="h-5 w-5 text-[#ea4335]" />}
                  label="Timezone"
                  value={getLocalTimeZone()}
                  tone="bg-[#fce8e6]"
                />
              </div>
          </section>

          <section id="connections" className="section-rule mt-10 space-y-5 pt-8">
              <SectionTitle
                eyebrow="Connections"
                title="Google and API setup"
                description="Use the connection controls below, then hover over the account badge to open your personal Google Calendar."
              />

              <div className="space-y-4 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Google Calendar</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {state.google.hasToken
                        ? `Connected${state.google.connectedEmail ? ` as ${state.google.connectedEmail}` : ""}`
                        : state.google.hasCredentials
                          ? "Credentials found. Ready to connect."
                          : "Import a Google desktop OAuth credentials JSON."}
                    </p>
                  </div>

                  {state.google.connectedEmail ? (
                    <TooltipPrimitive.Root>
                      <TooltipPrimitive.Trigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 border-b border-[#d6e2f3] px-1 py-2 text-sm font-medium text-slate-700"
                        >
                          <User className="h-4 w-4 text-[#1a73e8]" />
                          {state.google.connectedEmail}
                        </button>
                      </TooltipPrimitive.Trigger>
                      <TooltipPrimitive.Portal>
                        <TooltipPrimitive.Content
                          sideOffset={8}
                          className="border bg-white p-4 text-slate-800 shadow-calendar-card"
                        >
                          <div className="space-y-2">
                            <p className="font-semibold">Personal Google Calendar</p>
                            <p className="max-w-[220px] text-sm text-slate-600">
                              Open your calendar in the browser to verify new events or manage your day.
                            </p>
                            <Button onClick={() => void openGoogleCalendar()} size="sm" type="button">
                              Open Google Calendar
                            </Button>
                          </div>
                        </TooltipPrimitive.Content>
                      </TooltipPrimitive.Portal>
                    </TooltipPrimitive.Root>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-3 border-b border-slate-200 pb-5">
                  <Button onClick={() => void handleImportCredentials()} variant="outline" type="button">
                    {busyAction === "credentials" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Import credentials
                  </Button>
                  <Button onClick={() => void handleConnectGoogle()} type="button" disabled={!state.google.hasCredentials || busyAction === "google"}>
                    {busyAction === "google" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                    Connect Google
                  </Button>
                  <Button onClick={() => void handleDisconnectGoogle()} variant="ghost" type="button" disabled={!state.google.hasToken || busyAction === "disconnect"}>
                    Disconnect
                  </Button>
                  <Button onClick={() => void refreshState()} variant="ghost" type="button" disabled={busyAction === "refresh"}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">OpenAI</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {state.openai.hasKey ? "The AI key is already available to the app." : "Save an API key or keep using the local .env file."}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={openAiKeyInput}
                    onChange={(event) => setOpenAiKeyInput(event.target.value)}
                    type="password"
                    placeholder="sk-..."
                    className="h-11 flex-1 border-x-0 border-t-0 border-b border-[#d6e2f3] bg-transparent px-0 outline-none ring-0 transition focus:border-[#1a73e8]"
                  />
                  <Button onClick={() => void handleSaveOpenAiKey()} type="button" disabled={!openAiKeyInput.trim() || busyAction === "saveKey"}>
                    {busyAction === "saveKey" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                    Save key
                  </Button>
                </div>
              </div>
          </section>

          <section id="composer" className="section-rule mt-10 space-y-6 pt-8">
              <SectionTitle
                eyebrow="Compose"
                title="Prompt box scheduling"
                description="Type the event the way you would write it in a notebook. Use natural phrases like tomorrow, next Friday at 2pm, all day, Zoom, or email addresses, then send it to draft the fields below."
              />

              <div className="mt-6 space-y-4">
                <PromptInputBox
                  isLoading={isDrafting}
                  value={request}
                  onValueChange={setRequest}
                  onSend={(message) => {
                    setRequest(message);
                    void handleDraft(message);
                  }}
                  placeholder="Example: Project sync next Wednesday at 2pm for 45 minutes on Zoom with alex@example.com and sam@example.com."
                />

                <div className="border-b border-dashed border-[#c8d8f2] pb-4">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                  <p className="mt-2 text-sm text-slate-600">{composerHint}</p>
                  <p className="mt-3 text-sm text-slate-500">
                    The title should come back short and calendar-ready. Date, time, location, attendees, and notes only fill in when the request actually gives them.
                  </p>
                </div>
              </div>
          </section>

          <section id="review" className="section-rule mt-10 space-y-6 pt-8">
              <SectionTitle
                eyebrow="Review"
                title="Edit the event details"
                description="This is where the AI draft becomes your final calendar entry. Adjust the title, dates, attendees, and notes before creating it."
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Title</span>
                  <input
                    value={draft.summary}
                    onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                    className="h-11 w-full border-x-0 border-t-0 border-b border-[#d6e2f3] bg-transparent px-0 outline-none transition focus:border-[#1a73e8]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Location</span>
                  <input
                    value={draft.location}
                    onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                    className="h-11 w-full border-x-0 border-t-0 border-b border-[#d6e2f3] bg-transparent px-0 outline-none transition focus:border-[#1a73e8]"
                  />
                </label>
                <label className="flex items-center gap-3 border-b border-[#d6e2f3] px-0 py-3">
                  <input
                    checked={draft.allDay}
                    onChange={(event) => setDraft((current) => ({ ...current, allDay: event.target.checked }))}
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">All-day event</span>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Attendees</span>
                  <input
                    value={draft.attendees.join(", ")}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        attendees: event.target.value
                          .split(",")
                          .map((email) => email.trim())
                          .filter(Boolean)
                      }))
                    }
                    placeholder="name@example.com, person@example.com"
                    className="h-11 w-full border-x-0 border-t-0 border-b border-[#d6e2f3] bg-transparent px-0 outline-none transition focus:border-[#1a73e8]"
                  />
                </label>

                {draft.allDay ? (
                  <>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Start date</span>
                      <input
                        value={draft.startDate}
                        onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
                        type="date"
                        className="h-11 w-full border-x-0 border-t-0 border-b border-[#d6e2f3] bg-transparent px-0 outline-none transition focus:border-[#1a73e8]"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">End date</span>
                      <input
                        value={draft.endDate}
                        onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
                        type="date"
                        className="h-11 w-full border-x-0 border-t-0 border-b border-[#d6e2f3] bg-transparent px-0 outline-none transition focus:border-[#1a73e8]"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Start</span>
                      <input
                        value={draft.startDateTime}
                        onChange={(event) => setDraft((current) => ({ ...current, startDateTime: event.target.value }))}
                        type="datetime-local"
                        className="h-11 w-full border-x-0 border-t-0 border-b border-[#d6e2f3] bg-transparent px-0 outline-none transition focus:border-[#1a73e8]"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">End</span>
                      <input
                        value={draft.endDateTime}
                        onChange={(event) => setDraft((current) => ({ ...current, endDateTime: event.target.value }))}
                        type="datetime-local"
                        className="h-11 w-full border-x-0 border-t-0 border-b border-[#d6e2f3] bg-transparent px-0 outline-none transition focus:border-[#1a73e8]"
                      />
                    </label>
                  </>
                )}
              </div>

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  rows={5}
                  className="w-full border-x-0 border-t-0 border-b border-[#d6e2f3] bg-transparent px-0 py-3 outline-none transition focus:border-[#1a73e8]"
                />
              </label>

              <div className="mt-4 border-b border-dashed border-[#c8d8f2] pb-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">AI review notes</p>
                <p className="mt-2 text-sm text-slate-600">{draft.reviewNotes || "No draft yet."}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => void handleCreateEvent()} type="button" disabled={!canCreate || isCreating}>
                  {isCreating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck2 className="mr-2 h-4 w-4" />}
                  Add to Google Calendar
                </Button>
                <Button variant="outline" onClick={() => setDraft(emptyDraft())} type="button">
                  Clear draft
                </Button>
              </div>
          </section>

          <section id="activity" className="section-rule mt-10 space-y-6 pt-8">
            <SectionTitle
              eyebrow="Activity"
              title="Recent updates"
              description="Notifications and quick follow-through for your schedule changes."
            />

            <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-slate-200 pb-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Latest status</p>
                <p className="mt-3 text-lg font-medium text-slate-900">{activity}</p>
                <div className="mt-5 flex items-center gap-3 text-sm text-slate-500">
                  <Mail className="h-4 w-4" />
                  {state.google.connectedEmail || "No Google account connected yet"}
                </div>
              </div>

              <div className="border-b border-slate-200 pb-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Suggested flow</p>
                <ol className="mt-4 space-y-4 text-sm text-slate-600">
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f0fe] text-xs font-semibold text-[#1a73e8]">1</span>
                    Import credentials and connect Google from the connections card.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e6f4ea] text-xs font-semibold text-[#188038]">2</span>
                    Type a natural-language request into the new prompt box and let AI draft the event.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#fef7e0] text-xs font-semibold text-[#b06000]">3</span>
                    Review the details, then use the notification banner link to jump into Google Calendar.
                  </li>
                </ol>
              </div>
            </div>
          </section>
        </main>

        <FloatingActionMenu
          options={[
            {
              label: "Connect Google",
              Icon: <Link2 className="h-4 w-4" />,
              onClick: () => {
                void handleConnectGoogle();
              }
            },
            {
              label: "Open Calendar",
              Icon: <Calendar className="h-4 w-4" />,
              onClick: () => {
                void openGoogleCalendar();
              }
            },
            {
              label: "Jump to review",
              Icon: <CalendarCheck2 className="h-4 w-4" />,
              onClick: () => {
                document.getElementById("review")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }
          ]}
        />
      </div>
    </TooltipProvider>
  );
}

export default App;
