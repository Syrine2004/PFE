import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-priority-bars',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="priority-3d-chart">
      <div class="y-axis-3d">
        <span>80</span>
        <span>40</span>
        <span>0</span>
      </div>
      <div class="bars-container-3d">
        <div class="priority-group" *ngFor="let group of data">
          <div class="stack-3d">
            <div class="block-3d" *ngFor="let block of group.blocks" [style.height.px]="block.value * 2" [ngClass]="block.class">
               <div class="face front"></div>
               <div class="face top"></div>
            </div>
          </div>
          <span class="p-label">{{ group.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .priority-3d-chart {
      display: flex;
      height: 300px;
      padding: 20px 0;
    }

    .y-axis-3d {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 800;
      padding-right: 15px;
    }

    .bars-container-3d {
      flex: 1;
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      perspective: 1000px;
    }

    .priority-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 60px;
    }

    .stack-3d {
      display: flex;
      flex-direction: column-reverse;
      width: 35px;
      transform-style: preserve-3d;
    }

    .block-3d {
      position: relative;
      width: 100%;
      margin-bottom: 2px;
      transform-style: preserve-3d;
      transition: all 0.5s ease;

      .face {
        position: absolute;
        width: 100%;
        height: 100%;
      }

      .front {
        background: inherit;
        z-index: 2;
        border-radius: 4px;
        box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
      }

      .top {
        height: 10px;
        top: -10px;
        background: rgba(255,255,255,0.3);
        transform: rotateX(90deg);
        transform-origin: bottom;
        border-radius: 4px 4px 0 0;
      }

      &.green { background: linear-gradient(to right, #26a69a, #00796b); }
      &.blue { background: linear-gradient(to right, #42a5f5, #1565c0); }
      &.orange { background: linear-gradient(to right, #ffa726, #ef6c00); }
      &.red { background: linear-gradient(to right, #ef5350, #c62828); }
    }

    .p-label {
      margin-top: 15px;
      font-size: 0.7rem;
      font-weight: 800;
      color: #64748b;
    }
  `]
})
export class PriorityBarsComponent {
  data = [
    { label: 'Urgente', blocks: [{ value: 20, class: 'green' }, { value: 15, class: 'blue' }, { value: 25, class: 'orange' }, { value: 15, class: 'red' }] },
    { label: 'Haute', blocks: [{ value: 15, class: 'green' }, { value: 20, class: 'blue' }, { value: 30, class: 'orange' }, { value: 10, class: 'red' }] },
    { label: 'Moyenne', blocks: [{ value: 30, class: 'green' }, { value: 10, class: 'blue' }, { value: 5, class: 'orange' }, { value: 2, class: 'red' }] },
    { label: 'Basse', blocks: [{ value: 10, class: 'green' }, { value: 5, class: 'blue' }, { value: 2, class: 'orange' }, { value: 1, class: 'red' }] }
  ];
}
