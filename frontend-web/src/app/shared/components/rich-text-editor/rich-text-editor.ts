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
  readonly maxLength = input<number>(250);

  @ViewChild('editorContainer', { static: true })
  private readonly editorContainer!: ElementRef<HTMLDivElement>;

  protected readonly isDisabled = signal(false);
  protected readonly characterCount = signal(0);

  private quill: Quill | null = null;
  private pendingValue = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    this.quill = new Quill(this.editorContainer.nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ list: 'bullet' }, { list: 'ordered' }],
          ['clean'],
        ],
      },
    });

    if (this.pendingValue) {
      this.quill.root.innerHTML = this.pendingValue;
    }
    this.enforceMaxLength();
    this.quill.enable(!this.isDisabled());

    this.quill.on('text-change', () => {
      this.enforceMaxLength();
      this.onChange(this.currentHtml());
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
        this.enforceMaxLength();
      }
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

  private enforceMaxLength(): void {
    if (!this.quill) {
      return;
    }

    const textLength = Math.max(0, this.quill.getLength() - 1);
    const maxLength = this.maxLength();
    if (textLength > maxLength) {
      this.quill.deleteText(maxLength, textLength - maxLength, 'silent');
    }
    this.characterCount.set(Math.min(textLength, maxLength));
  }
}
