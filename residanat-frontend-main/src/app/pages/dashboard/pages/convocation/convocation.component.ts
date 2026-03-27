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

  ngOnInit() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.userName = `${profile.prenom} ${profile.nom}`;
        this.loadDossier(profile.id);
      },
      error: (err) => {
        this.error = "Erreur lors de la récupération du profil.";
        this.loading = false;
      }
    });
  }

  loadDossier(candidatId: number) {
    this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').subscribe({
      next: (response) => {
        if (response.content.length > 0) {
          const concoursId = response.content[0].id;
          if (concoursId) {
            this.dossierService.getDossierByCandidat(candidatId, concoursId).subscribe({
              next: (dossier) => {
                this.dossier = dossier;
                if (dossier && dossier.id) {
                  this.loadConvocationInfo(Number(dossier.id));
                } else {
                  this.loading = false;
                }
              },
              error: (err) => {
                this.error = "Impossible de récupérer votre dossier.";
                this.loading = false;
              }
            });
          } else {
            this.error = "Erreur concours.";
            this.loading = false;
          }
        }
      },
      error: (err) => {
        this.error = "Erreur lors du chargement des concours.";
        this.loading = false;
      }
    });
  }

  loadConvocationInfo(dossierId: number) {
    this.dossierService.getConvocationInfo(dossierId).subscribe({
      next: (info: Convocation) => {
        this.convocation = info;
        this.loading = false;
      },
      error: (err: any) => {
        console.warn("Convocation non encore générée, affichage limité.", err);
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
