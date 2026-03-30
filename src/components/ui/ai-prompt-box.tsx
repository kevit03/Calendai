"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { motion } from "framer-motion";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const injectedStyles = `
  textarea::-webkit-scrollbar { width: 6px; }
  textarea::-webkit-scrollbar-track { background: transparent; }
  textarea::-webkit-scrollbar-thumb { background-color: #8aaef4; border-radius: 999px; }
`;

function usePromptStyles() {
  React.useEffect(() => {
    const tag = document.createElement("style");
    tag.innerText = injectedStyles;
    document.head.appendChild(tag);
    return () => {
      document.head.removeChild(tag);
    };
  }, []);
}

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden border-b bg-slate-950 px-3 py-1.5 text-sm text-white shadow-lg animate-in fade-in-0 zoom-in-95",
          className
        )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-[90vw] -translate-x-1/2 -translate-y-1/2 gap-4 border bg-white p-0 shadow-calendar-card",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 bg-white/90 p-2 transition-all hover:bg-white">
        <X className="h-5 w-5 text-slate-700" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

type PromptInputContextType = {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
};

const PromptInputContext = React.createContext<PromptInputContextType | null>(null);

function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) {
    throw new Error("usePromptInput must be used within a PromptInput");
  }
  return context;
}

type PromptInputProps = {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
};

const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "");
    const handleChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <TooltipProvider>
        <PromptInputContext.Provider
          value={{
            isLoading,
            value: value ?? internalValue,
            setValue: onValueChange ?? handleChange,
            maxHeight,
            onSubmit,
            disabled
          }}
        >
          <div
            ref={ref}
            className={cn(
              "rounded-[1.75rem] border border-[#d4def0] bg-white/90 p-3 shadow-calendar-card transition-all duration-300",
              "border-x-0 border-t-0 rounded-none bg-transparent px-0 py-3 shadow-none",
              isLoading && "border-[#1a73e8]/60",
              className
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  }
);
PromptInput.displayName = "PromptInput";

const PromptInputTextarea: React.FC<
  {
    disableAutosize?: boolean;
    placeholder?: string;
  } & React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = ({ className, onKeyDown, disableAutosize = false, placeholder, ...props }) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit?.();
        }
        onKeyDown?.(e);
      }}
      className={cn(
        "min-h-[54px] w-full resize-none border-none bg-transparent px-0 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none",
        className
      )}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      {...props}
    />
  );
};

const PromptInputActions: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);

const PromptInputAction: React.FC<
  React.ComponentProps<typeof Tooltip> & {
    tooltip: React.ReactNode;
    children: React.ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    className?: string;
  }
> = ({ tooltip, children, className, side = "top", ...props }) => {
  const { disabled } = usePromptInput();
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

const Divider = () => <div className="mx-2 h-5 w-px bg-slate-200" />;

type ImageViewDialogProps = {
  imageUrl: string | null;
  onClose: () => void;
};

function ImageViewDialog({ imageUrl, onClose }: ImageViewDialogProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <Dialog open={Boolean(imageUrl)} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] border-none bg-transparent p-0 shadow-none">
          <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden border bg-white shadow-calendar-card"
        >
          <img src={imageUrl} alt="Full preview" className="max-h-[80vh] w-full object-contain" />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

type VoiceRecorderProps = {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: (duration: number) => void;
  visualizerBars?: number;
};

function VoiceRecorder({
  isRecording,
  onStartRecording,
  onStopRecording,
  visualizerBars = 24
}: VoiceRecorderProps) {
  const [time, setTime] = React.useState(0);
  const timerRef = React.useRef<number | null>(null);
  const wasRecordingRef = React.useRef(false);

  React.useEffect(() => {
    if (isRecording && !wasRecordingRef.current) {
      onStartRecording();
      timerRef.current = window.setInterval(() => setTime((t) => t + 1), 1000);
    }

    if (!isRecording && wasRecordingRef.current) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      onStopRecording(time);
      setTime(0);
    }

    wasRecordingRef.current = isRecording;

    return () => {
      if (timerRef.current && !isRecording) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording, onStartRecording, onStopRecording, time]);

  const formatted = `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;

  return (
    <div className={cn("flex w-full flex-col items-center justify-center py-3 transition-all", isRecording ? "opacity-100" : "h-0 opacity-0")}>
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <span className="font-mono text-sm text-slate-600">{formatted}</span>
      </div>
      <div className="flex h-10 w-full items-center justify-center gap-0.5 px-4">
        {Array.from({ length: visualizerBars }).map((_, index) => (
          <div
            key={index}
            className="w-0.5 animate-pulse rounded-full bg-[#1a73e8]/40"
            style={{
              height: `${Math.max(15, Math.random() * 100)}%`,
              animationDelay: `${index * 0.05}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

type PromptInputBoxProps = {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  (
    {
      onSend = () => undefined,
      isLoading = false,
      placeholder = "Tell Calendar Bot what to schedule...",
      className,
      value,
      onValueChange
    },
    ref
  ) => {
    usePromptStyles();

    const [internalInput, setInternalInput] = React.useState("");
    const [files, setFiles] = React.useState<File[]>([]);
    const [filePreviews, setFilePreviews] = React.useState<Record<string, string>>({});
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
    const uploadInputRef = React.useRef<HTMLInputElement>(null);
    const input = value ?? internalInput;

    const updateInput = React.useCallback(
      (nextValue: string) => {
        if (typeof value !== "string") {
          setInternalInput(nextValue);
        }
        onValueChange?.(nextValue);
      },
      [onValueChange, value]
    );

    const isImageFile = React.useCallback((file: File) => file.type.startsWith("image/"), []);

    const processFile = React.useCallback(
      (file: File) => {
        if (!isImageFile(file) || file.size > 10 * 1024 * 1024) {
          return;
        }
        setFiles([file]);
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreviews({ [file.name]: String(event.target?.result || "") });
        };
        reader.readAsDataURL(file);
      },
      [isImageFile]
    );

    React.useEffect(() => {
      const handlePaste = (event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) {
          return;
        }
        for (const item of items) {
          if (item.type.includes("image")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              processFile(file);
            }
            break;
          }
        }
      };

      document.addEventListener("paste", handlePaste);
      return () => document.removeEventListener("paste", handlePaste);
    }, [processFile]);

    const handleSubmit = React.useCallback(() => {
      if (!input.trim() && files.length === 0) {
        return;
      }

      onSend(input.trim(), files);
      setFiles([]);
      setFilePreviews({});
    }, [files, input, onSend]);

    const hasContent = input.trim() !== "" || files.length > 0;

    return (
      <>
        <PromptInput
          value={input}
          onValueChange={updateInput}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          className={cn("w-full transition-all duration-300 ease-in-out", className)}
          disabled={isLoading}
          ref={ref}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const droppedFiles = Array.from(event.dataTransfer.files);
            const image = droppedFiles.find((file) => isImageFile(file));
            if (image) {
              processFile(image);
            }
          }}
        >
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {files.map((file, index) => (
                <div key={index} className="group relative">
                  {file.type.startsWith("image/") && filePreviews[file.name] && (
                    <div
                      className="h-16 w-16 cursor-pointer overflow-hidden border"
                      onClick={() => setSelectedImage(filePreviews[file.name])}
                    >
                      <img src={filePreviews[file.name]} alt={file.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setFiles([]);
                          setFilePreviews({});
                        }}
                        className="absolute right-1 top-1 bg-slate-950/70 p-1 opacity-100"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <PromptInputTextarea placeholder={placeholder} />

          <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
            <PromptInputAction tooltip="Upload image">
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                disabled={isLoading}
              >
                <Paperclip className="h-5 w-5" />
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files?.[0]) {
                      processFile(event.target.files[0]);
                    }
                    event.target.value = "";
                  }}
                  accept="image/*"
                />
              </button>
            </PromptInputAction>

            <Button
              variant="default"
              size="icon"
              className={cn(
                "h-10 w-10 transition-all duration-200",
                hasContent ? "bg-[#1a73e8] text-white hover:bg-[#1765c6]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
              onClick={handleSubmit}
              disabled={!hasContent || isLoading}
              type="button"
              title={isLoading ? "Drafting event" : hasContent ? "Draft event details" : "Enter a schedule request"}
              aria-label={isLoading ? "Drafting event" : "Draft event details"}
            >
              {isLoading ? <Square className="h-4 w-4 animate-pulse fill-current" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </PromptInputActions>
        </PromptInput>

        <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </>
    );
  }
);
PromptInputBox.displayName = "PromptInputBox";
