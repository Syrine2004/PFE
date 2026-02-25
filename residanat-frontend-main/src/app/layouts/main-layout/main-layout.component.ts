import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GovernmentHeaderComponent } from '../../components/government-header/government-header.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [RouterOutlet, GovernmentHeaderComponent, NavbarComponent, FooterComponent],
    template: `
    <div class="layout">
      <app-government-header />
      <app-navbar />
      <main class="main">
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
    styles: [`
    .layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .main { flex: 1; }
  `]
})
export class MainLayoutComponent { }
