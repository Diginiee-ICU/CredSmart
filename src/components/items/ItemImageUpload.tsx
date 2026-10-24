import React, { useState, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  Camera,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ItemImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
  compact?: boolean;
  allowUrlInput?: boolean;
}

export function ItemImageUpload({
  value,
  onChange,
  className,
  label = "Item / Product Image",
  compact = false,
  allowUrlInput = true,
}: ItemImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [imgLoadError, setImgLoadError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processAndUploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP, GIF, SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file is too large. Maximum size is 5MB.");
      return;
    }

    setUploading(true);
    setImgLoadError(false);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const cleanExt = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) ? ext : "jpg";
      const randomPart = Math.random().toString(36).substring(2, 9);
      const filePath = `product-images/${Date.now()}-${randomPart}.${cleanExt}`;

      // Upload to public 'store-logos' bucket
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("store-logos").getPublicUrl(filePath);

        onChange(publicUrl);
        toast.success("Item image uploaded successfully!");
      } else {
        console.warn("Supabase storage upload notice, falling back to local data URL:", uploadError);
        // Fallback to data URL so user work is never lost
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            onChange(result);
            toast.success("Item image attached!");
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Image upload exception, using local fallback:", err);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          onChange(result);
          toast.success("Item image attached!");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleRemove = () => {
    onChange("");
    setUrlDraft("");
    setImgLoadError(false);
    toast.info("Item image removed");
  };

  const handleApplyUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      toast.error("Please enter a valid image link URL");
      return;
    }
    setImgLoadError(false);
    onChange(trimmed);
    setShowUrlInput(false);
    toast.success("Image URL applied");
  };

  const hasImage = Boolean(value && value.trim() && !imgLoadError);

  if (compact) {
    return (
      <div className={cn("space-y-1.5", className)}>
        {label && <Label className="text-xs font-semibold">{label}</Label>}
        <div className="flex items-center gap-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative w-14 h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer transition-all bg-muted/30 hover:bg-muted/60 hover:border-primary/50 overflow-hidden shrink-0",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : hasImage ? (
              <img
                src={value!}
                alt="Item thumbnail"
                className="w-full h-full object-cover"
                onError={() => setImgLoadError(true)}
              />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] px-2.5 font-medium gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {hasImage ? "Change" : "Upload Image"}
              </Button>
              {hasImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  onClick={handleRemove}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">PNG, JPG, WEBP up to 5MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-primary" />
          <span>{label}</span>
        </Label>
        {allowUrlInput && !hasImage && (
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
          >
            <LinkIcon className="w-3 h-3" />
            {showUrlInput ? "Upload file instead" : "Paste image link"}
          </button>
        )}
      </div>

      {hasImage ? (
        /* Preview Card */
        <div className="relative group rounded-xl border border-border bg-card p-3 flex items-center gap-4 overflow-hidden shadow-2xs">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted/40 shrink-0">
            <img
              src={value!}
              alt="Item preview"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgLoadError(true)}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold">Image attached</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
              {value?.startsWith("data:") ? "Local image attached" : value}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Change
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                onClick={handleRemove}
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : showUrlInput ? (
        /* URL Input Mode */
        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://example.com/product-image.jpg"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyUrl();
                  }
                }}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyUrl}
              className="h-9 px-3 text-xs font-semibold"
            >
              Apply
            </Button>
          </div>
          <p className="text-[10.5px] text-muted-foreground">
            Paste a public image URL from the web (e.g. from Google Drive, Cloudinary, Unsplash).
          </p>
        </div>
      ) : (
        /* Drag & Drop / Upload Box */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center",
            isDragOver
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-border hover:border-primary/50 hover:bg-muted/30 bg-muted/10",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">
              {uploading ? "Uploading image..." : "Click or drag & drop to upload"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Supports PNG, JPG, WEBP, GIF, SVG up to 5MB
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3 font-semibold gap-1.5 rounded-lg border-border"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-3 h-3" />
              Browse Files
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3 font-semibold gap-1.5 rounded-lg border-border sm:hidden"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="w-3 h-3" />
              Take Photo
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
