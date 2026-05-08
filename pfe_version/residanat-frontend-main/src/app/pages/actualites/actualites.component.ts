import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface Article {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
}

@Component({
  selector: 'app-actualites',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './actualites.component.html',
  styleUrls: ['./actualites.component.scss']
})
export class ActualitesComponent {
  private translate = inject(TranslateService);

  articlesPerPage = 6;
  currentPage = 0;

  private articleImages = [
    'assets/actualites/article-0.jpg.png',
    'assets/actualites/article-1.jpg.png',
    'assets/actualites/article-2.jpg.png',
    'assets/actualites/article-3.jpg.png',
    'assets/actualites/article-4.jpg.png',
    'assets/actualites/article-5.jpg.png',
    'assets/actualites/article-6.jpg.png',
    'assets/actualites/article-7.jpg.png',
    'assets/actualites/article-8.jpg.png',
    'assets/actualites/article-9.jpg.png',
    'assets/actualites/article-10.jpg.png',
    'assets/actualites/article-11.jpg.png'
  ];

  get allArticles(): Article[] {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(index => ({
      id: index + 1,
      title: this.translate.instant(`INFO_PAGES.ACTUALITES.ARTICLES.${index}.TITLE`),
      excerpt: this.translate.instant(`INFO_PAGES.ACTUALITES.ARTICLES.${index}.EXCERPT`),
      date: this.translate.instant(`INFO_PAGES.ACTUALITES.ARTICLES.${index}.DATE`),
      category: this.translate.instant(`INFO_PAGES.ACTUALITES.ARTICLES.${index}.CATEGORY`),
      image: this.articleImages[index]
    }));
  }

  get articles(): Article[] {
    const start = this.currentPage * this.articlesPerPage;
    const end = start + this.articlesPerPage;
    return this.allArticles.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.allArticles.length / this.articlesPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  canGoNext(): boolean {
    return this.currentPage < this.totalPages - 1;
  }

  canGoPrevious(): boolean {
    return this.currentPage > 0;
  }
}
