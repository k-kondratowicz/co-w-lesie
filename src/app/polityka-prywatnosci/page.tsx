import type { Metadata } from 'next';
import Link from 'next/link';
import { ConsentControls } from '@/shared/components/consent-controls';
import { SITE_CONTACT_EMAIL, SITE_TITLE } from '@/shared/lib/site';

export const metadata: Metadata = {
  title: 'Polityka prywatności',
  description: `Jak ${SITE_TITLE} przetwarza dane: lokalizacja, zgłoszenia, zdjęcia, analityka i Twoje prawa (RODO).`,
  alternates: { canonical: '/polityka-prywatnosci' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold text-lg">{title}</h2>
      <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <Link href="/" className="inline-block text-muted-foreground text-sm underline underline-offset-4">
          ← Powrót do mapy
        </Link>

        <h1 className="font-bold text-2xl">Polityka prywatności</h1>
        <p className="text-muted-foreground text-sm">
          {SITE_TITLE} to pomocnicza mapa zgłoszeń i bezpieczeństwa w lasach. Poniżej wyjaśniamy, jakie dane przetwarzamy i na
          jakiej podstawie.
        </p>
      </div>

      <Section title="Kto jest administratorem danych">
        <p>
          Administratorem danych jest operator serwisu {SITE_TITLE}. W sprawach dotyczących danych osobowych możesz pisać na adres{' '}
          <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="text-foreground underline underline-offset-4">
            {SITE_CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="Jakie dane przetwarzamy">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Lokalizacja</strong> - pozycja GPS Twojego urządzenia, użyta do pokazania danych w
            pobliżu, dodania zgłoszenia i oceny bezpieczeństwa. Wysyłamy ją do serwera tylko w celu wykonania zapytania; nie
            budujemy profilu lokalizacji.
          </li>
          <li>
            <strong className="text-foreground">Zgłoszenia</strong> - rodzaj zdarzenia, współrzędne, znacznik czasu i opcjonalne
            zdjęcie. Zgłoszenia są publiczne i widoczne na mapie.
          </li>
          <li>
            <strong className="text-foreground">Zahaszowany adres IP</strong> - używany wyłącznie do ograniczania nadużyć (limity
            zgłoszeń i głosów, jeden głos na zgłoszenie). Adres IP jest solony i haszowany; nie przechowujemy go w postaci jawnej.
          </li>
          <li>
            <strong className="text-foreground">Zdjęcia</strong> - przed wysłaniem usuwamy z nich metadane (w tym EXIF z
            lokalizacją) i zmniejszamy je. Przechowujemy je w usłudze Cloudflare R2.
          </li>
          <li>
            <strong className="text-foreground">Dane funkcjonalne w przeglądarce</strong> - w pamięci lokalnej zapisujemy m.in.
            kolejkę zgłoszeń offline, pamięć podręczną zapytań, oddane głosy oraz Twój wybór dotyczący zgody. Są niezbędne do
            działania aplikacji.
          </li>
          <li>
            <strong className="text-foreground">Analityka i monitorowanie błędów (za zgodą)</strong> - anonimowa analityka ruchu
            (Vercel Analytics, bez plików cookie) oraz monitorowanie błędów (Sentry, skonfigurowane tak, by nie zbierać adresów IP
            ani innych danych osobowych).
          </li>
        </ul>
      </Section>

      <Section title="Podstawy prawne i cele">
        <p>
          Dane niezbędne do działania aplikacji przetwarzamy w celu świadczenia usługi i zapewnienia jej bezpieczeństwa - na
          podstawie naszego prawnie uzasadnionego interesu (art. 6 ust. 1 lit. f RODO). Analitykę i monitorowanie błędów
          uruchamiamy wyłącznie po wyrażeniu przez Ciebie zgody (art. 6 ust. 1 lit. a RODO), którą możesz w każdej chwili wycofać.
        </p>
      </Section>

      <Section title="Komu powierzamy dane">
        <p>
          Korzystamy z zaufanych dostawców działających jako podmioty przetwarzające: Vercel (hosting), Neon (baza danych),
          Cloudflare (przechowywanie zdjęć) oraz - po Twojej zgodzie - Sentry (monitorowanie błędów) i Vercel Analytics. Dane mogą
          być przetwarzane poza Europejskim Obszarem Gospodarczym; w takim przypadku odbywa się to w oparciu o standardowe
          klauzule umowne.
        </p>
      </Section>

      <Section title="Jak długo przechowujemy dane">
        <p>
          Zgłoszenia mają ograniczony czas życia zależny od rodzaju zdarzenia i po wygaśnięciu przestają być widoczne na mapie.
          Dane techniczne (np. zahaszowane adresy IP na potrzeby limitów) przechowujemy tak długo, jak to konieczne do
          ograniczania nadużyć.
        </p>
      </Section>

      <Section title="Zgoda na analitykę i monitorowanie">
        <p>
          Możesz w każdej chwili włączyć lub wyłączyć analitykę i monitorowanie błędów. Wyłączenie natychmiast zatrzymuje
          analitykę; monitorowanie błędów przestaje działać po ponownym otwarciu aplikacji.
        </p>
        <ConsentControls />
      </Section>

      <Section title="Twoje prawa">
        <p>
          Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, a także prawo do
          sprzeciwu i wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych. Aby skorzystać z tych praw, napisz na{' '}
          <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="text-foreground underline underline-offset-4">
            {SITE_CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="Zastrzeżenie">
        <p>
          {SITE_TITLE} jest narzędziem pomocniczym i nie zastępuje oficjalnych komunikatów Lasów Państwowych ani decyzji służb. W
          razie wątpliwości zawsze zachowaj ostrożność.
        </p>
      </Section>
    </main>
  );
}
