import { Component, inject, OnInit, OnDestroy, signal, AfterViewInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ConcoursService } from '../../core/services/concours.service';
import { DossierService } from '../../core/services/dossier.service';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  private authService = inject(AuthService);
  private concoursService = inject(ConcoursService);
  private dossierService = inject(DossierService);
  private sub = new Subscription();
  private el = inject(ElementRef);
  private observer?: IntersectionObserver;
  isLoggedIn = signal(false);
  activeConcours = signal<any>(null);
  showScrollTop = signal(false);
  scrollProgress = signal(0);

  ngOnInit() {
    this.sub.add(this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn.set(loggedIn);
    }));

    // Fetch active concours and dossiers to calculate real stats
    this.sub.add(
      forkJoin({
        concours: this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE'),
        dossiers: this.dossierService.getAllDossiers()
      }).subscribe({
        next: (res) => {
          if (res.concours && res.concours.content && res.concours.content.length > 0) {
            const active = res.concours.content[0];
            // Enrich with real candidate count
            const count = res.dossiers.filter(d => d.concoursId === active.id).length;
            this.activeConcours.set({ ...active, nbCandidats: count });
          }
        },
        error: (err) => console.error('Error fetching home stats:', err)
      })
    );
  }

  ngAfterViewInit() {
    // Scroll-reveal: animate elements as they enter the viewport
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );

    const selectors = [
      '.flash-card', '.feature-card', '.step-card-wrapper',
      '.stat-card', '.section-header', '.hero-content', '.hero-card'
    ];
    selectors.forEach(sel => {
      this.el.nativeElement.querySelectorAll(sel).forEach((elem: Element, i: number) => {
        (elem as HTMLElement).style.setProperty('--reveal-delay', `${i * 80}ms`);
        this.observer?.observe(elem);
      });
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.observer?.disconnect();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    // Update progress (0 to 100)
    const progress = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
    this.scrollProgress.set(progress);
    
    // Show button after 300px
    this.showScrollTop.set(currentScroll > 300);
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  slideUrl(n: number): string {
    const ext = n === 3 ? 'jpg' : 'png';
    return `url('assets/images/hero-${n}.${ext}')`;
  }

  readonly flashItems = [
    { 
      date: '15 MARS 2026', 
      title: 'Ouverture des inscriptions en ligne', 
      urgent: true
    },
    { 
      date: '30 AVRIL 2026', 
      title: 'Date limite de depot des dossiers', 
      urgent: false
    },
    { 
      date: '15 JUIN 2026', 
      title: 'Publication des convocations', 
      urgent: false
    },
    { 
      date: '15 JUILLET 2026', 
      title: 'Proclamation des résultats officiels', 
      urgent: false
    }
  ];

  readonly features = [
    {
      icon: 'book-open',
      titleKey: 'HOME.PRESENTATION.FEATURE_1_TITLE',
      descriptionKey: 'HOME.PRESENTATION.FEATURE_1_DESC',
      gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(35, 137, 168, 0.1) 100%)'
    },
    {
      icon: 'users',
      titleKey: 'HOME.PRESENTATION.FEATURE_2_TITLE',
      descriptionKey: 'HOME.PRESENTATION.FEATURE_2_DESC',
      gradient: 'linear-gradient(135deg, rgba(35, 137, 168, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)'
    },
    {
      icon: 'award',
      titleKey: 'HOME.PRESENTATION.FEATURE_3_TITLE',
      descriptionKey: 'HOME.PRESENTATION.FEATURE_3_DESC',
      gradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(35, 137, 168, 0.1) 100%)'
    },
    {
      icon: 'building',
      titleKey: 'HOME.PRESENTATION.FEATURE_4_TITLE',
      descriptionKey: 'HOME.PRESENTATION.FEATURE_4_DESC',
      gradient: 'linear-gradient(135deg, rgba(35, 137, 168, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
    }
  ];

  readonly steps = [
    { number: '01', titleKey: 'HOME.PROCESS.STEP_1_TITLE', descriptionKey: 'HOME.PROCESS.STEP_1_DESC', icon: 'clipboard' },
    { number: '02', titleKey: 'HOME.PROCESS.STEP_2_TITLE', descriptionKey: 'HOME.PROCESS.STEP_2_DESC', icon: 'file-check' },
    { number: '03', titleKey: 'HOME.PROCESS.STEP_3_TITLE', descriptionKey: 'HOME.PROCESS.STEP_3_DESC', icon: 'calendar-check' },
    { number: '04', titleKey: 'HOME.PROCESS.STEP_4_TITLE', descriptionKey: 'HOME.PROCESS.STEP_4_DESC', icon: 'bar-chart' },
    { number: '05', titleKey: 'HOME.PROCESS.STEP_5_TITLE', descriptionKey: 'HOME.PROCESS.STEP_5_DESC', icon: 'message-circle' }
  ];

  readonly stats = [
    { value: '25+', labelKey: 'HOME.STATS.STAT_1' },
    { value: '48', labelKey: 'HOME.STATS.STAT_2' },
    { value: '1,250', labelKey: 'HOME.STATS.STAT_3' },
    { value: '15,000+', labelKey: 'HOME.STATS.STAT_4' }
  ];
}
