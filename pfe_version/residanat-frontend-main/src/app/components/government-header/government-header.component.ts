import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-government-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './government-header.component.html',
  styleUrls: ['./government-header.component.scss']
})
export class GovernmentHeaderComponent { }
