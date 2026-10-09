import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl p-6">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-xl font-bold text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="h-11 rounded-xl font-semibold">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({
              variant: variant === "destructive" ? "destructive" : "default",
              className: "h-11 rounded-xl font-bold",
            })}
            onClick={() => {
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
