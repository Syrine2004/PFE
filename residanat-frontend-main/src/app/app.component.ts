import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GovernmentHeaderComponent } from './components/government-header/government-header.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: []
})
export class AppComponent {
  title = 'Residanat TN';
}
