import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="antigravity-card">
      <div class="card-inner">
        <div class="card-header">
          <div class="title-meta">
            <span class="dot"></span>
            <h3 class="title">{{ title | uppercase }}</h3>
          </div>
        </div>
        <div class="card-subtitle" *ngIf="subtitle">{{ subtitle }}</div>
        <div class="card-body">
          <ng-content></ng-content>
        </div>
      </div>
      <div class="card-shadow"></div>
    </div>
  `,
  styles: [`
    .antigravity-card {
      position: relative;
      height: 100%;
      perspective: 1000px;
      
      &:hover {
        .card-inner { transform: translateY(-8px) rotateX(2deg) rotateY(-1deg); }
        .card-shadow { transform: scale(0.95); opacity: 0.1; }
      }
    }

    .card-inner {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(25px) saturate(160%);
      border-radius: 30px;
      padding: 25px;
      height: 100%;
      border: 1px solid rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      z-index: 2;
      position: relative;
      transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .card-shadow {
      position: absolute;
      bottom: -15px;
      left: 10%;
      width: 80%;
      height: 20px;
      background: #000;
      filter: blur(25px);
      opacity: 0.05;
      z-index: 1;
      transition: all 0.5s ease;
      pointer-events: none;
    }

    .card-header {
      margin-bottom: 20px;
      .title-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        .dot { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
        .title { font-size: 0.85rem; font-weight: 800; color: #1e293b; letter-spacing: 0.5px; margin: 0; }
      }
    }

    .card-subtitle {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      background: #f8fafc;
      padding: 4px 10px;
      border-radius: 8px;
      margin-bottom: 15px;
      display: inline-block;
      width: fit-content;
    }

    .card-body {
      flex: 1;
      position: relative;
    }
  `]
})
export class ChartCardComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
}
