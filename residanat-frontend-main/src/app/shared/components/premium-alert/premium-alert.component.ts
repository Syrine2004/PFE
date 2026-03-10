import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-premium-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert-backdrop" *ngIf="isOpen" (click)="onClose()">
      <div class="alert-card" [ngClass]="type" (click)="$event.stopPropagation()">
        <!-- Close Button -->
        <button class="close-btn" (click)="onClose()" aria-label="Fermer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <div class="alert-content">
          <!-- Icon Section -->
          <div class="icon-section">
            <div class="icon-hexagon" [ngClass]="type">
              <ng-container [ngSwitch]="type">
                <svg *ngSwitchCase="'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <svg *ngSwitchCase="'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                <svg *ngSwitchCase="'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
              </ng-container>
            </div>
          </div>

          <!-- Text Section -->
          <div class="text-section">
            <h2 class="alert-title">{{ title }}</h2>
            <p class="alert-message">{{ message }}</p>
          </div>

          <!-- Item Context -->
          <div class="context-box" *ngIf="selectedItem">
            <span class="context-label">ÉLÉMENT CIBLÉ</span>
            <div class="context-value">{{ selectedItem }}</div>
          </div>

          <!-- Actions -->
          <div class="alert-actions">
            <button class="btn-main" [ngClass]="type" (click)="onConfirm()">
              {{ confirmText }}
            </button>
            <button *ngIf="showCancel" class="btn-ghost" (click)="onClose()">
              {{ cancelText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alert-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 9999;
    }

    .alert-card {
      background: #ffffff;
      width: 100%;
      max-width: 400px;
      border-radius: 2rem;
      position: relative;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .close-btn {
      position: absolute;
      top: 1.25rem;
      right: 1.25rem;
      background: #f8fafc;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      z-index: 10;
      &:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }
      svg { width: 16px; height: 16px; }
    }

    .alert-content {
      padding: 3rem 2.5rem 2.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .icon-section {
      margin-bottom: 1.5rem;

      .icon-hexagon {
        width: 64px;
        height: 64px;
        background: #f1f5f9;
        border-radius: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &.warning { background: #fff1f2; color: #e11d48; }
        &.success { background: #f0fdf4; color: #16a34a; }
        &.error { background: #fee2e2; color: #ef4444; }

        svg { 
            width: 30px; height: 30px; 
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));
        }
      }
    }

    .text-section {
      margin-bottom: 1.75rem;

      .alert-title {
        font-size: 1.5rem;
        font-weight: 850;
        color: #0f172a;
        margin: 0 0 0.5rem;
        letter-spacing: -0.02em;
      }

      .alert-message {
        font-size: 0.9375rem;
        font-weight: 500;
        color: #64748b;
        line-height: 1.5;
        margin: 0;
      }
    }

    .context-box {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #eef2f6;
      border-radius: 1.25rem;
      padding: 1rem;
      margin-bottom: 2rem;

      .context-label {
        font-size: 0.65rem;
        font-weight: 850;
        color: #94a3b8;
        letter-spacing: 0.1em;
        display: block;
        margin-bottom: 0.25rem;
      }

      .context-value {
        font-size: 0.9375rem;
        font-weight: 800;
        color: #1e293b;
      }
    }

    .alert-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      button {
        width: 100%;
        height: 52px;
        border-radius: 1rem;
        font-weight: 800;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-main {
        color: white;
        &.warning { 
            background: linear-gradient(135deg, #f43f5e, #e11d48);
            box-shadow: 0 8px 16px -4px rgba(225, 29, 72, 0.3);
        }
        &.success { 
            background: linear-gradient(135deg, #10b981, #059669);
            box-shadow: 0 8px 16px -4px rgba(16, 185, 129, 0.3);
        }
        
        &:hover { transform: translateY(-2px); filter: brightness(1.05); }
        &:active { transform: translateY(0); }
      }

      .btn-ghost {
        background: transparent;
        color: #64748b;
        font-size: 0.875rem;
        font-weight: 700;
        &:hover { color: #0f172a; background: #f1f5f9; }
      }
    }

    @keyframes alert-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes alert-pop-in { 
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class PremiumAlertComponent {
  @Input() isOpen = false;
  @Input() type: 'success' | 'warning' | 'error' = 'success';
  @Input() title = 'Succès';
  @Input() message = '';
  @Input() confirmText = 'OK';
  @Input() cancelText = 'Annuler';
  @Input() showCancel = false;
  @Input() selectedItem = '';

  @Output() confirm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  onConfirm() { this.confirm.emit(); this.onClose(); }
  onClose() { this.close.emit(); }
}
