import { Component, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.scss']
})
export class InscriptionComponent {
  showDocTypeDropdown = false;
  private elementRef = inject(ElementRef);
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDocTypeDropdown = false;
    }
  }

  toggleDocTypeDropdown(event: Event) {
    event.stopPropagation();
    this.showDocTypeDropdown = !this.showDocTypeDropdown;
  }

  selectDocType(type: string) {
    this.registrationForm.get('typeDocumentIdentite')?.setValue(type);
    this.showDocTypeDropdown = false;
  }

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // --- DONNÉES DU FORMULAIRE ---
  registrationForm: FormGroup;

  civilites = [
    { value: 'M', label: 'Monsieur' },
    { value: 'Mme', label: 'Madame' }
  ];

  facultes = [
    { value: 'tunis', label: 'Faculté de Médecine de Tunis' },
    { value: 'sfax', label: 'Faculté de Médecine de Sfax' },
    { value: 'sousse', label: 'Faculté de Médecine de Sousse' },
    { value: 'monastir', label: 'Faculté de Médecine de Monastir' },
    { value: 'etranger', label: 'Faculté Étrangère' }
  ];

  showPassword = false;
  showConfirm = false;

  constructor() {
    this.registrationForm = this.fb.group({
      civilite: ['', Validators.required],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      dateNaissance: ['', Validators.required],
      lieuNaissance: ['', Validators.required],
      nationalite: ['', Validators.required],
      adresse: ['', Validators.required],
      typeDocumentIdentite: ['', Validators.required], // Start empty
      cin: [{ value: '', disabled: true }, Validators.required],
      telephone: ['', [Validators.required, Validators.pattern(/^[24579][0-9]{7}$/)]],
      email: ['', [Validators.required, Validators.email]],
      faculte: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
    
    // Écouter les changements sur le type de document
    this.registrationForm.get('typeDocumentIdentite')?.valueChanges.subscribe(type => {
      const cinControl = this.registrationForm.get('cin');
      if (type) {
        cinControl?.enable();
        if (type === 'PASSEPORT') {
          cinControl?.setValidators([Validators.required, Validators.minLength(6)]);
        } else {
          cinControl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{8}$/)]);
        }
      } else {
        cinControl?.disable();
      }
      cinControl?.updateValueAndValidity();
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      // Si différent, on injecte l'erreur dans le champ 'confirmPassword'
      confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
      return { passwordMismatch: true };
    } else if (confirmPassword && confirmPassword.hasError('passwordMismatch')) {
      // Si ils correspondent enfin, on retire seulement l'erreur 'passwordMismatch'
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
    return null;
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirm() { this.showConfirm = !this.showConfirm; }


  // --- FONCTION D'INSCRIPTION FIXÉE ---
  onSubmit() {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    // FIX : On prépare l'objet COMPLET pour Spring Boot
    const formValues = this.registrationForm.value;
    const candidat = {
      email: formValues.email,
      motDePasse: formValues.password,
      civilite: formValues.civilite,
      nom: formValues.nom,
      prenom: formValues.prenom,
      dateNaissance: formValues.dateNaissance,
      lieuNaissance: formValues.lieuNaissance,
      nationalite: formValues.nationalite,
      adresse: formValues.adresse,
      typeDocumentIdentite: formValues.typeDocumentIdentite,
      cin: formValues.cin,
      telephone: formValues.telephone,
      faculte: formValues.faculte
    };

    // On envoie maintenant le dossier complet
    this.authService.register(candidat).subscribe({
      next: (response) => {
        Swal.fire({
          title: 'Inscription Réussie !',
          text: 'Bienvenue sur la plateforme Résidanat TN.',
          icon: 'success',
          confirmButtonColor: '#14b8a6', // Teal
          confirmButtonText: 'Aller à la connexion',
          heightAuto: false
        }).then(() => {
          this.router.navigate(['/connexion']);
        });
      },
      error: (err) => {
        console.error("❌ Erreur d'inscription reçue du serveur :", err);
        const errorMsg = typeof err.error === 'string' ? err.error : "Vérifiez vos informations ou le serveur est injoignable.";

        if (errorMsg.includes("CIN")) {
          console.warn("⚠️ Attention : Tentative avec un CIN déjà existant détectée !");
        }

        Swal.fire({
          title: 'Erreur',
          text: errorMsg,
          icon: 'error',
          confirmButtonColor: '#ff4d4f', // Red moderne
          confirmButtonText: 'Réessayer',
          heightAuto: false
        });
      }
    });
  }
}