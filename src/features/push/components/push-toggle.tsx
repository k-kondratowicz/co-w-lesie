import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/features/push/hooks/use-push-notifications';
import { Button } from '@/shared/components/ui/button';

// Lets a visitor opt into push alerts for their saved areas. We only ever notify on a new hazard
// (entry ban / fire-hazard degree III) - never an "all clear" - so the copy promises exactly that.
export function PushToggle() {
  const { status, pending, subscribe, unsubscribe } = usePushNotifications();

  if (status === 'unsupported') {
    return <p className="text-muted-foreground text-xs">Twoja przeglądarka nie obsługuje powiadomień.</p>;
  }

  if (status === 'denied') {
    return <p className="text-muted-foreground text-xs">Powiadomienia są zablokowane w ustawieniach przeglądarki.</p>;
  }

  if (status === 'subscribed') {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">
          Powiadomimy Cię, gdy w zapisanym obszarze pojawi się zakaz wstępu lub III stopień zagrożenia pożarowego.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 text-muted-foreground"
          disabled={pending}
          onClick={unsubscribe}
        >
          <BellOff className="size-4" /> Wyłącz powiadomienia
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-xs">
        Włącz powiadomienia, gdy w zapisanym obszarze pojawi się zakaz wstępu lub III stopień zagrożenia pożarowego.
      </p>
      <Button variant="outline" size="sm" className="justify-start gap-2" disabled={pending} onClick={subscribe}>
        <Bell className="size-4" /> Włącz powiadomienia o zagrożeniach
      </Button>
    </div>
  );
}
