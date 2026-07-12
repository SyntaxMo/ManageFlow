"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { downloadTemplate } from "@/lib/weekly-summary/download-template";
import { WEEKLY_SUMMARY_TEMPLATES } from "@/lib/weekly-summary/templates";
import { cn } from "@/lib/utils";

interface TemplateDownloadButtonProps {
  onError: (message: string) => void;
}

export function TemplateDownloadButton({ onError }: TemplateDownloadButtonProps) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLoading = loadingTemplateId !== null;

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      setActiveIndex(0);
      itemRefs.current[0]?.focus();
    }
  }, [menuOpen]);

  function toggleMenu() {
    if (isLoading) return;
    setMenuOpen((open) => !open);
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!menuOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = (activeIndex + 1) % WEEKLY_SUMMARY_TEMPLATES.length;
      setActiveIndex(nextIndex);
      itemRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        (activeIndex - 1 + WEEKLY_SUMMARY_TEMPLATES.length) %
        WEEKLY_SUMMARY_TEMPLATES.length;
      setActiveIndex(nextIndex);
      itemRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      itemRefs.current[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastIndex = WEEKLY_SUMMARY_TEMPLATES.length - 1;
      setActiveIndex(lastIndex);
      itemRefs.current[lastIndex]?.focus();
    }
  }

  async function handleTemplateSelect(templateId: string) {
    const template = WEEKLY_SUMMARY_TEMPLATES.find((item) => item.id === templateId);
    if (!template || isLoading) return;

    setLoadingTemplateId(template.id);
    setMenuOpen(false);

    try {
      await downloadTemplate(template.path, template.filename);
    } catch {
      onError("Failed to download the template. The file may be missing.");
    } finally {
      setLoadingTemplateId(null);
      buttonRef.current?.focus();
    }
  }

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        disabled={isLoading}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-deep px-4 text-sm font-medium text-white transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {isLoading ? "Downloading..." : "Download Template"}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {menuOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Weekly summary templates"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-20 mt-2 min-w-[260px] overflow-hidden rounded-[10px] border border-border bg-white py-1 shadow-lg"
        >
          {WEEKLY_SUMMARY_TEMPLATES.map((template, index) => (
            <button
              key={template.id}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={activeIndex === index ? 0 : -1}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleTemplateSelect(template.id)}
              className={cn(
                "flex w-full items-center px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none",
                activeIndex === index && "bg-background"
              )}
            >
              {template.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
