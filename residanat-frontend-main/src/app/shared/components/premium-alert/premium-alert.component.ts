import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-premium-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert-backdrop" *ngIf="isOpen" (click)="onClose()">
      <div class="alert-card" [ngClass]="type" (click)="$event.stopPropagation()">
        <!-- Close Button (Restored) -->
        <button class="close-btn" (click)="onClose()" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <!-- Top Section -->
        <div class="header-section">
          <div class="alert-icon-wrapper">
             <div class="alert-icon-container">
               <div class="alert-icon">
                 <ng-container [ngSwitch]="type">
                   <svg *ngSwitchCase="'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                   <svg *ngSwitchCase="'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                   <svg *ngSwitchCase="'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                 </ng-container>
               </div>
             </div>
          </div>
          
          <h2 class="alert-title">{{ title }}</h2>
          <p class="alert-message">{{ message }}</p>
        </div>

        <!-- Middle Section -->
        <div class="content-section" *ngIf="selectedItem">
          <div class="selected-item-tag">
            <span class="tag-label">CIBLE :</span>
            <span class="tag-value">{{ selectedItem }}</span>
          </div>
        </div>
        
        <!-- Bottom Section -->
        <div class="actions-section">
          <button class="btn-confirm" [ngClass]="type" (click)="onConfirm()">
            {{ confirmText }}
          </button>
          <button *ngIf="showCancel" class="btn-cancel" (click)="onClose()">{{ cancelText }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alert-backdrop {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at center, rgba(15, 23, 42, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%);
      backdrop-filter: blur(8px) saturate(150%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 9999;
      animation: alert-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .alert-card {
      background: rgba(255, 255, 255, 0.98);
      width: 100%;
      max-width: 380px;
      border-radius: 2.5rem;
      box-shadow: 
        0 0 0 1px rgba(0, 0, 0, 0.05),
        0 15px 45px -10px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      position: relative;
      animation: alert-pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .close-btn {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      background: rgba(0, 0, 0, 0.03);
      border: none;
      color: #94a3b8;
      cursor: pointer;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      z-index: 10;
      &:hover { 
        background: rgba(244, 63, 94, 0.1);
        color: #f43f5e;
        transform: rotate(90deg) scale(1.1);
      }
      svg { width: 18px; height: 18px; }
    }

    .header-section {
      padding: 3.5rem 2.5rem 1.75rem;
      text-align: center;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; height: 140px;
        background: linear-gradient(to bottom, rgba(244, 63, 94, 0.05), transparent);
        z-index: 0;
      }

      .alert-card.success &::before {
        background: linear-gradient(to bottom, rgba(34, 197, 94, 0.05), transparent);
      }
    }

    .alert-icon-wrapper {
       position: relative;
       z-index: 1;
       margin-bottom: 1.75rem;
       perspective: 1000px;
    }

    .alert-icon-container {
      width: 80px;
      height: 80px;
      margin: 0 auto;
      background: white;
      border-radius: 1.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 10px 25px -4px rgba(0,0,0,0.1),
        inset 0 -2px 4px rgba(0,0,0,0.05);
      animation: alert-icon-float 4s ease-in-out infinite;
    }

    .alert-icon {
      width: 62px;
      height: 62px;
      border-radius: 1.4rem;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .warning & {
        background: linear-gradient(135deg, #fff1f2, #ffe4e6);
        color: #f43f5e;
        border: 1.5px solid #fff;
      }
      .success & {
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        color: #22c55e;
        border: 1.5px solid #fff;
      }
      
      svg { 
        width: 32px; height: 32px;
        animation: alert-svg-bounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both; 
      }
    }

    .alert-title {
      font-size: 1.85rem;
      font-weight: 850;
      color: #0f172a;
      margin-bottom: 0.75rem;
      letter-spacing: -0.04em;
      position: relative;
      z-index: 1;
    }

    .alert-message {
      color: #64748b;
      line-height: 1.6;
      font-size: 1.05rem;
      max-width: 300px;
      margin: 0 auto;
      font-weight: 500;
      position: relative;
      z-index: 1;
    }

    .content-section {
      padding: 0 2.5rem 1.5rem;
    }

    .selected-item-tag {
      background: #f8fafc;
      border-radius: 1.25rem;
      padding: 0.85rem 1.25rem;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      
      .tag-label {
        font-size: 0.7rem;
        font-weight: 850;
        color: #94a3b8;
        letter-spacing: 0.05em;
      }

      .tag-value {
        font-size: 0.95rem;
        font-weight: 800;
        color: #1e293b;
        letter-spacing: -0.01em;
      }
    }

    .actions-section {
      padding: 0 2.5rem 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      align-items: center;
    }

    button {
      width: 100%;
      height: 60px;
      border-radius: 1.75rem;
      font-weight: 850;
      font-size: 1.15rem;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-confirm {
      color: white;
      
      &.warning { 
        background: linear-gradient(135deg, #f43f5e, #e11d48);
        box-shadow: 0 12px 25px -5px rgba(244, 63, 94, 0.35);
      }
      &.success { 
        background: linear-gradient(135deg, #10b981, #059669);
        box-shadow: 0 12px 25px -5px rgba(16, 185, 129, 0.35);
      }
      
      &:hover { 
        transform: translateY(-3px) scale(1.01); 
        filter: brightness(1.05);
      }
      &:active { transform: translateY(0) scale(0.98); }
    }

    .btn-cancel {
      background: transparent;
      color: #94a3b8;
      height: auto;
      padding: 0.4rem;
      width: auto;
      font-size: 0.95rem;
      font-weight: 700;
      &:hover { 
        color: #64748b; 
        transform: scale(1.05);
      }
    }

    @keyframes alert-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes alert-pop-in { 
      0% { transform: scale(0.9) translateY(20px); opacity: 0; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes alert-icon-float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(1.5deg); }
    }
    @keyframes alert-svg-bounce {
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
