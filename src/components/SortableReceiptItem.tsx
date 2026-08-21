import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

interface SortableReceiptItemProps {
  id: string;
  label: string;
  onRemove: () => void;
}

export function SortableReceiptItem({ id, label, onRemove }: SortableReceiptItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2 px-3 border-b border-dashed border-border last:border-0 bg-card hover:bg-muted/30 transition-colors group rounded-lg"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="flex-1 text-xs text-foreground font-medium">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive transition-opacity p-1 rounded hover:bg-destructive/10"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

