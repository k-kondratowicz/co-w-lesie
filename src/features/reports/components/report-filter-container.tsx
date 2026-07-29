import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { ScrollArea } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/shared/components/ui/drawer';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet';
import { useIsDesktop } from '@/shared/hooks/use-is-desktop';

type ReportFilterContainerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  actions: ReactNode;
  children: ReactNode;
};

// Right-side sheet on desktop, bottom drawer on touch - same header and body in both.
export function ReportFilterContainer({ open, onOpenChange, trigger, actions, children }: ReportFilterContainerProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" showCloseButton={false} className="w-full gap-0 rounded-l-xl sm:max-w-md">
          <SheetHeader className="relative flex-row items-center justify-center border-b">
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" className="absolute top-1/2 left-4 -translate-y-1/2">
                <X />
                <span className="sr-only">Zamknij filtry</span>
              </Button>
            </SheetClose>
            <SheetTitle>Filtry</SheetTitle>
            <div className="absolute top-1/2 right-4 -translate-y-1/2">{actions}</div>
          </SheetHeader>
          <ScrollArea className="max-h-full px-4">{children}</ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between text-left">
          <DrawerTitle>Filtry</DrawerTitle>
          {actions}
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
