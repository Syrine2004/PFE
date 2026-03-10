import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private sub = new Subscription();

  isLoggedIn = signal(false);

  ngOnInit() {
    this.sub = this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn.set(loggedIn);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
