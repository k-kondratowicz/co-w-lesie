import { Camera, FilePen, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { Button } from '../../ui/button';
import { useFieldContext } from '../form-hooks';
import { FieldBase, type FieldControlProps } from './field-base';

export function FieldPhoto(props: FieldControlProps) {
  const field = useFieldContext<File | null>();
  const file = field.state.value;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview && !file) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview, file]);

  const openPicker = () => fileInputRef.current?.click();

  return (
    <FieldBase {...props}>
      {preview ? (
        <div className="space-y-1">
          <div className="relative">
            {/* biome-ignore lint/performance/noImgElement: local blob preview, not a remote asset */}
            <img src={preview} alt="Podgląd zdjęcia" className="h-40 w-full rounded-md border object-cover" />

            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={() => field.handleChange(null)}
              className="absolute top-1 right-1 rounded-full shadow"
            >
              <X />
              <span className="sr-only">Usuń zdjęcie</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={openPicker}
              className="absolute right-1 bottom-1 rounded-full shadow"
            >
              <FilePen />
              <span className="sr-only">Zmień zdjęcie</span>
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">Podgląd jest przycięty - wyślemy całe zdjęcie.</p>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={openPicker}>
          <Camera />
          Dodaj zdjęcie
        </Button>
      )}

      <input
        id={field.name}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) {
            field.handleChange(selected);
          }

          event.target.value = '';
        }}
      />

      <p className="text-muted-foreground text-xs">Zdjęcie będzie publiczne. Usuwamy dane EXIF (w tym lokalizację).</p>
    </FieldBase>
  );
}
