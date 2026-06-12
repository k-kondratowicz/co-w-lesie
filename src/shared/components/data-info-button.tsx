'use client';

import { Info } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { REPORT_FOREST_BUFFER_METERS } from '@/shared/lib/geo/queries/near-forest';

function InfoItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-sm">{title}</p>
      <p className="text-muted-foreground text-sm">{children}</p>
    </div>
  );
}

export function DataInfoButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label="Informacje o danych i ograniczeniach"
          variant="secondary"
          size="icon-xxl"
          className="rounded-full shadow-lg"
        >
          <Info className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>O danych i ograniczeniach</DialogTitle>
          <DialogDescription>Zanim podejmiesz decyzję, weź pod uwagę poniższe ograniczenia.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          <InfoItem title="Dane o lasach mogą być nieaktualne">
            Granice lasów pochodzą z Banku Danych o Lasach i są aktualizowane okresowo. Zmieniają się powoli, ale mogą nie
            odzwierciedlać najnowszego stanu.
          </InfoItem>
          <InfoItem title="Dokładność lokalizacji zależy od urządzenia">
            Pozycja GPS może być obarczona błędem od kilku do kilkudziesięciu metrów — zależnie od urządzenia, pogody i otoczenia.
            Twoja faktyczna lokalizacja może nieznacznie różnić się od pokazanej.
          </InfoItem>
          <InfoItem title="Obszar lasu jest uproszczony">
            Warstwa lasów na mapie jest uproszczona i scalona, więc granice mogą nieznacznie odbiegać od rzeczywistych. Przy dużym
            oddaleniu najmniejsze lasy mogą nie być widoczne.
          </InfoItem>
          <InfoItem title="Zgłoszenia w pobliżu lasu">
            Zgłoszenie można dodać w lesie lub w jego pobliżu (do około {REPORT_FOREST_BUFFER_METERS} m). Uwzględniamy w ten
            sposób niedokładność GPS oraz obrzeża lasu.
          </InfoItem>
          <InfoItem title="Zagrożenie pożarowe i zakazy wstępu">
            Dane o zagrożeniu pożarowym i zakazach wstępu pochodzą z Lasów Państwowych i są synchronizowane okresowo. Gdy dla
            danego miejsca brakuje danych, pokazujemy „nie wiadomo" i zalecamy ostrożność.
          </InfoItem>
          <InfoItem title="To ocena pomocnicza">
            Aplikacja nie zastępuje oficjalnych komunikatów Lasów Państwowych ani decyzji służb. W razie wątpliwości zawsze
            zachowaj ostrożność.
          </InfoItem>
        </div>
      </DialogContent>
    </Dialog>
  );
}
