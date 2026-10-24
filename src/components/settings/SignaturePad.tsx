import { useRef, useState, useEffect } from "react";
import { Pen, Upload, Trash2, RotateCcw, Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  className?: string;
}

export function SignaturePad({
  value = "",
  onChange,
  title = "Authorized Signatory",
  onTitleChange,
  className,
}: SignaturePadProps) {
  const [mode, setMode] = useState<"preview" | "draw" | "upload">(value ? "preview" : "draw");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize canvas
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  useEffect(() => {
    if (mode === "draw") {
      setTimeout(initCanvas, 50);
    }
  }, [mode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Save current state for undo
    try {
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-10), currentState]);
    } catch {
      // ignore
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleClear = () => {
    initCanvas();
    setHistory([]);
    setHasDrawn(false);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lastState = history[history.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setHistory((prev) => prev.slice(0, -1));
    if (history.length <= 1) {
      setHasDrawn(false);
    }
  };

  const handleSaveDrawn = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
    setMode("preview");
    toast({ title: "Signature saved!" });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "File too large", description: "Signature must be under 3MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onChange(result);
      setMode("preview");
      toast({ title: "Signature image uploaded!" });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mode Switcher Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/70 text-xs">
          <button
            type="button"
            onClick={() => setMode("draw")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all",
              mode === "draw"
                ? "bg-card text-foreground shadow-xs border border-border font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Pen className="w-3.5 h-3.5" />
            Draw Signature
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("upload");
              fileInputRef.current?.click();
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all",
              mode === "upload"
                ? "bg-card text-foreground shadow-xs border border-border font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Image
          </button>
          {value && (
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all",
                mode === "preview"
                  ? "bg-card text-foreground shadow-xs border border-border font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Current
            </button>
          )}
        </div>

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setMode("draw");
            }}
            className="text-xs text-rose-500 hover:text-rose-600 font-medium inline-flex items-center gap-1 hover:underline"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove Signature
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Mode: Preview */}
      {mode === "preview" && value && (
        <div className="relative p-4 rounded-2xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center min-h-[140px] group">
          <img
            src={value}
            alt="Signature preview"
            className="max-h-24 max-w-full object-contain filter drop-shadow-xs"
          />
          <p className="text-[11px] font-semibold text-muted-foreground mt-2 border-t border-border/80 pt-1 w-full text-center">
            {title || "Authorized Signatory"}
          </p>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMode("draw")}
              className="text-xs h-8 rounded-lg"
            >
              <Pen className="w-3.5 h-3.5 mr-1" />
              Re-draw
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8 rounded-lg"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Upload New
            </Button>
          </div>
        </div>
      )}

      {/* Mode: Draw Canvas */}
      {mode === "draw" && (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-primary/40 hover:border-primary/70 rounded-2xl bg-white overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-36 touch-none cursor-crosshair block"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 select-none">
                <Pen className="w-6 h-6 mb-1 opacity-50 text-primary" />
                <span className="text-xs font-medium text-slate-500">Sign here with mouse or touch</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={!hasDrawn && history.length === 0}
                className="h-8 text-xs rounded-lg px-2.5"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="h-8 text-xs rounded-lg px-2.5"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Undo
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveDrawn}
              disabled={!hasDrawn}
              className="h-8 text-xs rounded-lg px-4 gap-1.5 font-semibold"
            >
              <Check className="w-3.5 h-3.5" />
              Use This Signature
            </Button>
          </div>
        </div>
      )}

      {/* Mode: Upload placeholder */}
      {mode === "upload" && !value && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all text-center group"
        >
          <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-foreground">Click to upload signature image</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG, or WEBP (Transparent background recommended, max 3MB)</p>
        </div>
      )}
    </div>
  );
}
