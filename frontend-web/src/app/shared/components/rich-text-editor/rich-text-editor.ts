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

  @ViewChild('editorContainer', { static: true })
  private readonly editorContainer!: ElementRef<HTMLDivElement>;

  protected readonly isDisabled = signal(false);

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

    this.quill.on('text-change', () => {
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
}
