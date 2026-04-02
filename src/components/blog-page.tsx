import React from "react";
import {
  Bold,
  Clock3,
  Italic,
  Lock,
  Palette,
  Pencil,
  Plus,
  Type,
  Underline
} from "lucide-react";
import { Button } from "@/components/ui/button";

type BlogDraft = BlogEntry & {
  mode: "new" | "edit";
};

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FONT = "Times New Roman";
const DEFAULT_COLOR = "#1f2937";

const fontOptions = [
  "Times New Roman",
  "Arial",
  "Georgia",
  "Helvetica",
  "Verdana",
  "Courier New"
];

function getOrdinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return "th";
  }

  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatBlogTitle(dateInput: string | Date) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
  return `${month} ${date.getDate()}${getOrdinal(date.getDate())}, ${date.getFullYear()}`;
}

function formatMetaDate(dateInput: string) {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function extractPlainText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canEditEntry(entry: BlogEntry, now = Date.now()) {
  if (entry.editUsedAt) {
    return false;
  }

  const submittedAt = new Date(entry.submittedAt).getTime();
  if (!submittedAt) {
    return false;
  }

  return now - submittedAt < EDIT_WINDOW_MS;
}

export function BlogPage() {
  const [entries, setEntries] = React.useState<BlogEntry[]>([]);
  const [draft, setDraft] = React.useState<BlogDraft | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editorMessage, setEditorMessage] = React.useState("");
  const [activeFont, setActiveFont] = React.useState(DEFAULT_FONT);
  const [activeColor, setActiveColor] = React.useState(DEFAULT_COLOR);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const selectionRef = React.useRef<Range | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    window.calendarBot
      .getBlogEntries()
      .then((nextEntries) => {
        if (isMounted) {
          setEntries(nextEntries);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEntries([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!draft || !editorRef.current) {
      return;
    }

    editorRef.current.innerHTML = draft.contentHtml || "";
    document.execCommand("styleWithCSS", false, "true");
    requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  }, [draft?.id, draft?.mode]);

  React.useEffect(() => {
    if (!draft || !editorRef.current) {
      return;
    }

    editorRef.current.style.fontFamily = activeFont;
    editorRef.current.style.color = activeColor;
  }, [draft, activeColor, activeFont]);

  const saveSelection = React.useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      return;
    }

    const anchorNode = selection.anchorNode;
    if (anchorNode && editorRef.current.contains(anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = React.useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }, []);

  const syncDraftFromEditor = React.useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    const html = editorRef.current.innerHTML;
    setDraft((current) => (current ? { ...current, contentHtml: html } : current));
  }, []);

  const applyCommand = React.useCallback(
    (command: string, value?: string) => {
      if (!draft || !editorRef.current) {
        return;
      }

      editorRef.current.focus();
      restoreSelection();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false, value);
      saveSelection();
      syncDraftFromEditor();
    },
    [draft, restoreSelection, saveSelection, syncDraftFromEditor]
  );

  const handleToolbarCommand = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, command: string) => {
      event.preventDefault();
      applyCommand(command);
    },
    [applyCommand]
  );

  const startNewEntry = React.useCallback(() => {
    const createdAt = new Date().toISOString();
    setDraft({
      id: crypto.randomUUID(),
      title: formatBlogTitle(createdAt),
      contentHtml: "",
      createdAt,
      submittedAt: "",
      updatedAt: createdAt,
      editUsedAt: "",
      mode: "new"
    });
    setActiveFont(DEFAULT_FONT);
    setActiveColor(DEFAULT_COLOR);
    setEditorMessage("");
  }, []);

  const startEditEntry = React.useCallback((entry: BlogEntry) => {
    setDraft({
      ...entry,
      mode: "edit"
    });
    setEditorMessage("This entry can be edited once. After you save, it will lock permanently.");
  }, []);

  const cancelDraft = React.useCallback(() => {
    setDraft(null);
    setEditorMessage("");
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!draft || !editorRef.current) {
      return;
    }

    const contentHtml = editorRef.current.innerHTML;
    if (!extractPlainText(contentHtml)) {
      setEditorMessage("Write something before submitting the entry.");
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();

    const nextEntry: BlogEntry = {
      id: draft.id,
      title: draft.title,
      contentHtml,
      createdAt: draft.createdAt,
      submittedAt: draft.mode === "new" ? now : draft.submittedAt,
      updatedAt: now,
      editUsedAt: draft.mode === "edit" ? now : draft.editUsedAt
    };

    try {
      const nextEntries = await window.calendarBot.saveBlogEntry(nextEntry);
      setEntries(nextEntries);
      setDraft(null);
      setEditorMessage("");
    } finally {
      setIsSaving(false);
    }
  }, [draft]);

  const handleFontChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextFont = event.target.value;
      setActiveFont(nextFont);
      applyCommand("fontName", nextFont);
    },
    [applyCommand]
  );

  const handleColorChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextColor = event.target.value;
      setActiveColor(nextColor);
      applyCommand("foreColor", nextColor);
    },
    [applyCommand]
  );

  const draftHasText = Boolean(draft && extractPlainText(draft.contentHtml));

  return (
    <section id="blog" className="space-y-8 pt-4">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">BLOG</h1>
        <p className="text-sm text-slate-500">One edit within 24 hours.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <Button type="button" onClick={startNewEntry} disabled={Boolean(draft)}>
          <Plus className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      </div>

      {draft ? (
        <section className="space-y-5 border-b border-slate-200 pb-8">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
              {draft.mode === "edit" ? "Edit entry" : "New entry"}
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">{draft.title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-dashed border-[#c8d8f2] pb-4">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onMouseDown={(event) => handleToolbarCommand(event, "bold")}
            >
              <Bold className="mr-2 h-4 w-4" />
              Bold
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onMouseDown={(event) => handleToolbarCommand(event, "italic")}
            >
              <Italic className="mr-2 h-4 w-4" />
              Italic
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onMouseDown={(event) => handleToolbarCommand(event, "underline")}
            >
              <Underline className="mr-2 h-4 w-4" />
              Underline
            </Button>

            <label className="inline-flex items-center gap-2 border-b border-slate-300 px-1 py-2 text-sm text-slate-700">
              <Type className="h-4 w-4 text-slate-500" />
              <select value={activeFont} onChange={handleFontChange} className="bg-transparent outline-none">
                {fontOptions.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex items-center gap-2 border-b border-slate-300 px-1 py-2 text-sm text-slate-700">
              <Palette className="h-4 w-4 text-slate-500" />
              <input type="color" value={activeColor} onChange={handleColorChange} className="h-7 w-10 border-0 bg-transparent p-0" />
            </label>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Write today’s entry here..."
            className="blog-editor min-h-[260px] border-b border-[#d6e2f3] pb-4 text-[17px] leading-8 text-slate-800 outline-none"
            onInput={syncDraftFromEditor}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onBlur={saveSelection}
            onKeyDown={(event) => {
              if (!(event.metaKey || event.ctrlKey)) {
                return;
              }

              const key = event.key.toLowerCase();
              let command = "";
              if (key === "b") {
                command = "bold";
              }
              if (key === "i") {
                command = "italic";
              }
              if (key === "u") {
                command = "underline";
              }

              if (command) {
                event.preventDefault();
                document.execCommand("styleWithCSS", false, "true");
                document.execCommand(command, false);
                requestAnimationFrame(() => {
                  saveSelection();
                  syncDraftFromEditor();
                });
              }
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                Keyboard shortcuts: Cmd/Ctrl + B, I, U
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" type="button" onClick={cancelDraft}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving || !draftHasText}>
                {isSaving ? "Saving..." : draft.mode === "edit" ? "Save edit" : "Submit entry"}
              </Button>
            </div>
          </div>

          {editorMessage ? <p className="text-sm text-slate-500">{editorMessage}</p> : null}
        </section>
      ) : null}

      <section className="space-y-8">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Entries</p>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading entries...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-500">No entries yet.</p>
          ) : null}
        </div>

        {entries.map((entry) => {
          const editable = canEditEntry(entry);
          const isEditingThisEntry = draft?.mode === "edit" && draft.id === entry.id;

          return (
            <article key={entry.id} className="border-b border-slate-200 pb-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-slate-900">{entry.title}</h3>
                  <p className="text-sm text-slate-500">
                    Published {formatMetaDate(entry.submittedAt)}
                    {entry.editUsedAt ? ` • Edited once ${formatMetaDate(entry.updatedAt)}` : ""}
                  </p>
                </div>

                {editable && !draft ? (
                  <Button variant="outline" size="sm" type="button" onClick={() => startEditEntry(entry)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : entry.editUsedAt ? (
                  <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <Lock className="h-4 w-4" />
                    Edit used
                  </span>
                ) : !editable ? (
                  <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <Lock className="h-4 w-4" />
                    Locked after 24 hours
                  </span>
                ) : isEditingThisEntry ? (
                  <span className="inline-flex items-center gap-2 text-sm text-[#1a73e8]">
                    <Pencil className="h-4 w-4" />
                    Editing now
                  </span>
                ) : null}
              </div>

              <div className="blog-entry-content mt-5 text-slate-800" dangerouslySetInnerHTML={{ __html: entry.contentHtml }} />
            </article>
          );
        })}
      </section>
    </section>
  );
}
