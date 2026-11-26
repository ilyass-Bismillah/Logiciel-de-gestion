"use client";

import * as React from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  FileText,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export interface PreviewFilePayload {
  url: string;
  title: string;
  subtitle?: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export function FilePreviewModal({
  file,
  onClose,
}: {
  file: PreviewFilePayload | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    setZoom(1);
  }, [file?.url]);

  if (!file) return null;

  const isPdf =
    file.mimeType?.includes("pdf") ||
    file.fileName?.toLowerCase().endsWith(".pdf") ||
    file.url.toLowerCase().includes(".pdf");

  return (
    <Modal
      open={Boolean(file)}
      onClose={onClose}
      title={file.title}
      description={file.subtitle}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span className="truncate max-w-[220px] sm:max-w-md font-medium">
              {file.fileName || "Pièce justificative"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isPdf && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="w-12 text-center text-xs font-mono text-slate-600">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(1)}
                  title="Réinitialiser le zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <a
              href={file.url}
              download={file.fileName || "justificatif"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger
            </a>
          </div>
        </div>

        <div className="flex max-h-[68vh] min-h-[360px] items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-100/70 p-4">
          {isPdf ? (
            <iframe
              src={file.url}
              title={file.title}
              className="h-[62vh] w-full rounded-lg bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt={file.title}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              className="max-h-[62vh] w-auto rounded-lg object-contain shadow-md transition-transform duration-150"
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
