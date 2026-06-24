'use client';

import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/features/push/hooks/use-push-notifications';
import { Spinner } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/button';

// Lets a visitor opt into push alerts for their saved areas. We only ever notify on a new hazard
// (entry ban / fire-hazard degree III) - never an "all clear" - so the copy promises exactly that.
export function PushToggle() {
  const { status, pending, error, subscribe, unsubscribe } = usePushNotifications();

  if (status === 'unsupported') {
    return <p className="text-muted-foreground text-xs">Twoja przeglądarka nie obsługuje powiadomień.</p>;
  }

  if (status === 'needs-install') {
    return (
      <p className="text-muted-foreground text-xs">
        Na iPhonie i iPadzie powiadomienia działają po dodaniu aplikacji do ekranu głównego. Otwórz menu udostępniania i wybierz
        "Do ekranu początkowego", a potem włącz powiadomienia.
      </p>
    );
  }

  if (status === 'denied') {
    return <p className="text-muted-foreground text-xs">Powiadomienia są zablokowane w ustawieniach przeglądarki.</p>;
  }

  if (status === 'subscribed') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs">
          Powiadomimy Cię, gdy w zapisanym obszarze pojawi się zakaz wstępu lub III stopień zagrożenia pożarowego.
        </p>
        <Button variant="outline" size="sm" disabled={pending} onClick={unsubscribe}>
          {pending ? <Spinner /> : <BellOff />}
          Wyłącz powiadomienia
        </Button>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        Włącz powiadomienia, gdy w zapisanym obszarze pojawi się zakaz wstępu lub III stopień zagrożenia pożarowego.
      </p>
      <Button variant="default" size="sm" disabled={pending} onClick={subscribe}>
        {pending ? <Spinner /> : <Bell />}
        Włącz powiadomienia o zagrożeniach
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
