import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Quill from 'quill';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.css',
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
})
export class RichTextEditorComponent implements AfterViewInit, ControlValueAccessor, OnDestroy {
  readonly placeholder = input<string>('');
  /**
   * Límite de caracteres de texto visible (sin contar el markup HTML que
   * agrega el formato). Sin esto, un campo "sin límite" en la UI podía
   * superar ampliamente el límite real que valida el backend.
   */
  readonly maxLength = input<number | null>(null);

  @ViewChild('editorContainer', { static: true })
  private readonly editorContainer!: ElementRef<HTMLDivElement>;

  protected readonly isDisabled = signal(false);
  protected readonly charCount = signal(0);

  private quill: Quill | null = null;
  private pendingValue = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    this.quill = new Quill(this.editorContainer.nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        toolbar: [['bold', 'italic', 'underline'], [{ list: 'bullet' }, { list: 'ordered' }], ['clean']],
      },
    });

    if (this.pendingValue) {
      this.quill.root.innerHTML = this.pendingValue;
    }
    this.quill.enable(!this.isDisabled());
    this.charCount.set(this.plainTextLength());

    this.quill.on('text-change', (_delta, _oldDelta, source) => {
      this.handleTextChange(source);
    });
    this.quill.on('selection-change', (range) => {
      if (!range) {
        this.onTouched();
      }
    });
  }

  writeValue(value: string | null): void {
    const html = value ?? '';
    if (this.quill) {
      if (this.currentHtml() !== html) {
        this.quill.root.innerHTML = html;
      }
      this.charCount.set(this.plainTextLength());
    } else {
      this.pendingValue = html;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
    this.quill?.enable(!disabled);
  }

  ngOnDestroy(): void {
    this.quill = null;
  }

  private currentHtml(): string {
    if (!this.quill) {
      return '';
    }
    return this.quill.getText().trim() ? this.quill.root.innerHTML : '';
  }

  /** Cantidad de caracteres visibles. Quill.getText() siempre agrega un '\n' final. */
  private plainTextLength(): number {
    if (!this.quill) {
      return 0;
    }
    return Math.max(0, this.quill.getText().length - 1);
  }

  private handleTextChange(source: string): void {
    const max = this.maxLength();
    const length = this.plainTextLength();

    if (max !== null && length > max && source === 'user') {
      // Recorta el excedente, igual que el atributo maxlength de un input.
      // El propio deleteText dispara un nuevo text-change (source 'api') que
      // termina de actualizar el contador y notificar el nuevo valor.
      this.quill!.deleteText(max, length - max);
      return;
    }

    this.charCount.set(length);
    this.onChange(this.currentHtml());
  }
}
