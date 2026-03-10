import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss']
})
export class PlaceholderComponent {
  title = 'Page';
  description = 'Contenu à venir.';

  constructor(private route: ActivatedRoute) {
    this.route.data.subscribe(d => {
      this.title = d['title'] ?? this.title;
      this.description = d['description'] ?? this.description;
    });
  }
}
