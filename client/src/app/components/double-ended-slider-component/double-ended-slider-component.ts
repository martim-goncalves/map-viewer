import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-double-ended-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './double-ended-slider-component.html',
  styleUrl: './double-ended-slider-component.scss',
})
export class DoubleEndedSliderComponent implements OnInit {
  
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() initialLowerValue: number = 0;
  @Input() initialUpperValue: number = 100;
  @Input() label: string = 'Slider';

  @Output() valueChange = new EventEmitter<{ lowerValue: number; upperValue: number }>();

  lowerValue = signal(0);
  upperValue = signal(0);

  ngOnInit(): void {
    this.lowerValue.set(this.initialLowerValue);
    this.upperValue.set(this.initialUpperValue);
  }

  onLowerValueChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.lowerValue.set(Math.min(value, this.upperValue()));
    this.emitValueChange();
  }

  onUpperValueChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.upperValue.set(Math.max(value, this.lowerValue()));
    this.emitValueChange();
  }

  reset(): void {
    this.lowerValue.set(this.initialLowerValue);
    this.upperValue.set(this.initialUpperValue);
    this.emitValueChange();
  }

  private emitValueChange(): void {
    this.valueChange.emit({ lowerValue: this.lowerValue(), upperValue: this.upperValue() });
  }
}
