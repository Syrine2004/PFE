import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="organic-kpi" [ngClass]="colorClass">
      <div class="glass-orb"></div>
      <div class="kpi-body">
        <span class="label">{{ label | uppercase }}</span>
        <div class="val-group">
          <span class="value">{{ value }}</span>
          <span class="trend" *ngIf="trend">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M7 17l9.2-9.2M17 17V7.8h-9.2" />
            </svg>
            {{ trend }}%
          </span>
        </div>
      </div>
      <div class="kpi-icon">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .organic-kpi {
      position: relative;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(20px);
      border-radius: 28px;
      padding: 25px;
      border: 1px solid rgba(255, 255, 255, 0.9);
      display: flex;
      justify-content: space-between;
      align-items: center;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.03);
      transition: all 0.4s ease;

      &:hover {
        transform: translateY(-5px) scale(1.02);
        background: white;
        box-shadow: 0 20px 40px rgba(0,0,0,0.06);
        .glass-orb { transform: scale(1.5) translate(-10%, -10%); }
      }
    }

    .glass-orb {
      position: absolute;
      top: -20px;
      left: -20px;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--accent-color) 0%, transparent 70%);
      opacity: 0.15;
      filter: blur(20px);
      transition: all 0.6s ease;
    }

    .kpi-body {
      display: flex;
      flex-direction: column;
      gap: 5px;
      z-index: 2;
    }

    .label {
      font-size: 0.7rem;
      font-weight: 800;
      color: #94a3b8;
      letter-spacing: 1px;
    }

    .val-group {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .value {
      font-size: 1.8rem;
      font-weight: 900;
      color: #1e293b;
      letter-spacing: -1px;
    }

    .trend {
      font-size: 0.75rem;
      font-weight: 800;
      color: #22c55e;
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .kpi-icon {
      width: 50px;
      height: 50px;
      border-radius: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      color: var(--accent-color);
      z-index: 2;
      box-shadow: inset 0 2px 5px rgba(0,0,0,0.02);
    }

    .blue { --accent-color: #3b82f6; }
    .green { --accent-color: #22c55e; }
    .purple { --accent-color: #a855f7; }
    .orange { --accent-color: #f97316; }
  `]
})
export class KpiCardComponent {
  @Input() label: string = '';
  @Input() value: string = '';
  @Input() trend: string = '';
  @Input() colorClass: string = 'blue';
}
