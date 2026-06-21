'use client';

import { createContext, useContext } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/shared/components/ui/drawer';
import { useIsDesktop } from '@/shared/hooks/use-is-desktop';
import { cn } from '@/shared/lib/utils';

// One overlay API that renders a centered Dialog on desktop and a bottom Drawer on mobile.
// Header/Footer are plain (the Content provides the padding, so the two libraries' differing
// padding models don't fight); Title/Description stay library-specific for accessibility.

const DesktopContext = createContext(false);
const useIsDesktopContext = () => useContext(DesktopContext);

export function ResponsiveDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
  const isDesktop = useIsDesktop();
  const Root = isDesktop ? Dialog : Drawer;

  return (
    <DesktopContext.Provider value={isDesktop}>
      <Root {...props}>{children}</Root>
    </DesktopContext.Provider>
  );
}

export function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  const Trigger = useIsDesktopContext() ? DialogTrigger : DrawerTrigger;

  return <Trigger {...props} />;
}

export function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
  const Close = useIsDesktopContext() ? DialogClose : DrawerClose;

  return <Close {...props} />;
}

export function ResponsiveDialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogContent>) {
  if (useIsDesktopContext()) {
    return (
      <DialogContent className={className} {...props}>
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerContent className={cn(className)} {...props}>
      {children}
    </DrawerContent>
  );
}

export function ResponsiveDialogScrollArea({ className, children, ...props }: React.ComponentProps<'div'>) {
  const isDesktop = useIsDesktopContext();

  return (
    <div className={cn('max-w-full', { 'overflow-y-auto px-4': !isDesktop }, className)} {...props}>
      {children}
    </div>
  );
}

export function ResponsiveDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  if (useIsDesktopContext()) {
    return <DialogHeader className={className} {...props} />;
  }

  return <DrawerHeader className={cn(className)} {...props} />;
}

export function ResponsiveDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const isDesktop = useIsDesktopContext();

  return (
    <div
      className={cn(
        '-mx-4 mt-2 -mb-4 flex flex-col gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end',
        isDesktop && 'rounded-b-xl',
        className,
      )}
      {...props}
    />
  );
}

export function ResponsiveDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
  const Title = useIsDesktopContext() ? DialogTitle : DrawerTitle;

  return <Title className={cn('pr-4', className)} {...props} />;
}

export function ResponsiveDialogDescription(props: React.ComponentProps<typeof DialogDescription>) {
  const Description = useIsDesktopContext() ? DialogDescription : DrawerDescription;

  return <Description {...props} />;
}
