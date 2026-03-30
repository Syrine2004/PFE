import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DossierService, DossierCandidature } from '../../../../core/services/dossier.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConcoursService } from '../../../../core/services/concours.service';

@Component({
  selector: 'app-convocation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './convocation.component.html',
  styleUrl: './convocation.component.scss'
})
export class ConvocationComponent implements OnInit {
  private dossierService = inject(DossierService);
  private authService = inject(AuthService);
  private concoursService = inject(ConcoursService);

  dossier: DossierCandidature | null = null;
  userName: string = '';
  loading: boolean = true;
  error: string | null = null;
  convocation: any = null;
  qrImageUrl: string = '';

  today: Date = new Date();
  userCin: string = '';
  sessionYear: number = 2026;

  imprimer() {
    window.print();
  }

  ngOnInit() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.userName = `${profile.prenom} ${profile.nom}`;
        this.userCin = profile.cin || 'N/A';
        this.loadInitialData(profile.id);
      },
      error: (err) => {
        this.error = "Erreur profil.";
        this.loading = false;
      }
    });
  }

  loadInitialData(candidatId: number) {
    // Start by getting the active concours (cached or fast)
    this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').subscribe({
      next: (response) => {
        const concoursId = response.content?.[0]?.id;
        if (concoursId) {
          // Flatten the chain: Get Dossier then Convocation
          this.dossierService.getDossierByCandidat(candidatId, concoursId).subscribe({
            next: (dossier) => {
              this.dossier = dossier;
              if (dossier?.id && dossier.statut === 'VALIDE') {
                this.loadConvocationInfo(Number(dossier.id));
              } else {
                this.loading = false;
              }
            },
            error: () => this.loading = false
          });
        } else {
          this.loading = false;
        }
      },
      error: () => this.loading = false
    });
  }

  loadConvocationInfo(dossierId: number) {
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (this.loading) {
        console.warn("Délai d'attente dépassé pour la convocation.");
        this.loading = false;
      }
    }, 5000);

    this.dossierService.getConvocationInfo(dossierId).subscribe({
      next: (info: Convocation) => {
        clearTimeout(timeout);
        if (!info) {
          console.warn("Convocation reçue nulle.");
          this.loading = false;
          return;
        }
        this.convocation = info;
        
        // Handle array date format from Spring Boot
        try {
          if (this.convocation.dateEpreuve && Array.isArray(this.convocation.dateEpreuve)) {
              const [year, month, day, hour, minute, second] = this.convocation.dateEpreuve;
              this.convocation.dateEpreuve = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, second || 0).toISOString();
          }
        } catch (e) {
          console.error("Erreur parsing date", e);
        }

        const baseApi = window.location.hostname === 'localhost' 
          ? 'http://localhost:8080' 
          : `${window.location.protocol}//${window.location.hostname}`;
        const cacheBuster = Date.now();
        this.qrImageUrl = `${baseApi}/api/convocations/qr/${this.convocation.hashSecurise || 'MISSING'}?v=${cacheBuster}`;


        this.loading = false;
      },
      error: (err: any) => {
        clearTimeout(timeout);
        console.warn("Convocation non générée ou erreur API.", err);
        this.loading = false;
      }
    });
  }

  download() {
    if (!this.dossier || !this.dossier.id) return;
    this.dossierService.telechargerConvocationPdf(Number(this.dossier.id)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convocation_${this.userName.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => console.error('Erreur téléchargement', err)
    });
  }
}

import { Convocation } from '../../../../core/services/dossier.service';
