import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReclamationService, Reclamation } from '../../../../core/services/reclamation.service';
import { ConcoursService } from '../../../../core/services/concours.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

export interface Message {
  role: 'bot' | 'user';
  text: string;
  timestamp: Date;
  isAction?: boolean;
  options?: string[]; // Options for the user to choose from
  fileName?: string;  // If the message contains an attachment
}

// Plexus node type
interface PlexusNode {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
}

@Component({
  selector: 'app-candidat-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './candidat-reclamations.component.html',
  styleUrl: './candidat-reclamations.component.scss'
})
export class CandidatReclamationsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('plexusCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  private nodes: PlexusNode[] = [];
  private readonly NODE_COUNT = 70; // زدنا عدد النقاط
  private readonly MAX_DIST = 280; // كبرنا مسافة الربط باش يتصلو ببعضهم أكثر
  private resizeObserver!: ResizeObserver;

  private reclamationService = inject(ReclamationService);
  private concoursService = inject(ConcoursService);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private langChangeSub?: Subscription;
  private currentConcoursId: string | null = null;

  reclamations: Reclamation[] = [];
  selectedReclamation: Reclamation | null = null;
  isLoading = true;

  // Chat State Machine
  messages: Message[] = [];
  currentChatStep: 'IDLE' | 'WELCOMING' | 'OBJECT_PENDING' | 'DESC_PENDING' | 'SUBMITTING' | 'DONE' = 'IDLE';
  userInput = '';
  
  // Reclamation Config & Temporary Storage
  reclamationCategories: string[] = [];

  private initLabels() {
    this.reclamationCategories = [
      this.translate.instant('RECLAMATIONS.CATEGORIES.SCORE'),
      this.translate.instant('RECLAMATIONS.CATEGORIES.ELIGIBILITY'),
      this.translate.instant('RECLAMATIONS.CATEGORIES.PERSONAL'),
      this.translate.instant('RECLAMATIONS.CATEGORIES.BUG'),
      this.translate.instant('RECLAMATIONS.CATEGORIES.OTHER')
    ];
  }
  tempObjet = '';
  tempDescription = '';
  selectedFile: File | null = null;

  ngOnInit(): void {
    this.initLabels();
    this.langChangeSub = this.translate.onLangChange.subscribe(() => this.initLabels());
    this.route.queryParams.subscribe(params => {
      this.currentConcoursId = params['concoursId'] || this.concoursService.getSelectedConcoursId();
    });
    this.loadMyReclamations();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.myScrollContainer) {
          const el = this.myScrollContainer.nativeElement;
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
      } catch (err) {}
    }, 100);
  }

  // --- DRAFT CACHING LOGIC ---
  private saveDraft(): void {
    if (this.currentChatStep === 'IDLE' || this.currentChatStep === 'DONE' || this.selectedReclamation) {
      sessionStorage.removeItem('reclamation_chat_draft');
      return;
    }
    const draft = {
      messages: this.messages,
      currentChatStep: this.currentChatStep,
      tempObjet: this.tempObjet,
      tempDescription: this.tempDescription
    };
    sessionStorage.setItem('reclamation_chat_draft', JSON.stringify(draft));
  }

  private loadDraft(): boolean {
    const draftStr = sessionStorage.getItem('reclamation_chat_draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        this.messages = draft.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        this.currentChatStep = draft.currentChatStep;
        this.tempObjet = draft.tempObjet;
        this.tempDescription = draft.tempDescription;
        this.selectedReclamation = null;
        this.scrollToBottom();
        return true;
      } catch (e) {
        sessionStorage.removeItem('reclamation_chat_draft');
      }
    }
    return false;
  }

  ngAfterViewInit(): void {
    this.initPlexus();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.langChangeSub) this.langChangeSub.unsubscribe();
  }

  // ---- Plexus Canvas Animation ----
  private initPlexus(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(canvas);

    this.nodes = Array.from({ length: this.NODE_COUNT }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.2, // سرعنا الحركة باش تبان واضحة أكثر
      vy: (Math.random() - 0.5) * 1.2,
      r:  Math.random() * 2.2 + 1.2,
    }));

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      this.ctx.clearRect(0, 0, w, h);

      // Move nodes
      for (const n of this.nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      // Draw lines
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const dx   = this.nodes[i].x - this.nodes[j].x;
          const dy   = this.nodes[i].y - this.nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < this.MAX_DIST) {
            // قوينا الشفافية والخطوط باش تبان الروابط واضحة بين كل النقاط القريبة
            const alpha = (1 - dist / this.MAX_DIST) * 0.6; 
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`; 
            this.ctx.lineWidth = 1.2; // عرضنا الخط شوية باش يبان الربط أوضح
            this.ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
            this.ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
            this.ctx.stroke();
          }
        }
      }

      // Draw glowing nodes
      for (const n of this.nodes) {
        const grd = this.ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3.5);
        grd.addColorStop(0, 'rgba(203, 213, 225, 0.6)'); // هالة رمادية خفيفة (Slate 300)
        grd.addColorStop(1, 'rgba(203, 213, 225, 0)');
        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, n.r * 3.5, 0, Math.PI * 2);
        this.ctx.fillStyle = grd;
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(148, 163, 184, 0.7)'; // لون النقاط الداخلي رمادي
        this.ctx.fill();
      }

      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }

  getCategoryClass(objet: string, categorie?: string): string {
    // Priority 1: Use the explicit category from backend if available
    if (categorie) {
      switch (categorie) {
        case 'RESULTAT': return 'bg-cat-resultat';
        case 'TECHNIQUE': return 'bg-cat-technique';
        case 'INSCRIPTION': return 'bg-cat-inscription';
        case 'PERSONNELLE': return 'bg-cat-donnees';
        case 'AUTRE': return 'bg-cat-autre';
      }
    }

    // Priority 2: Fallback to keyword matching on objet string
    if (!objet) return 'bg-cat-autre';
    const lowerObjet = objet.toLowerCase();
    
    if (lowerObjet.includes('score') || lowerObjet.includes('classement')) {
      return 'bg-cat-resultat';
    } 
    else if (lowerObjet.includes('éligibilité') || lowerObjet.includes('convocation')) {
      return 'bg-cat-inscription';
    }
    else if (lowerObjet.includes('personnelle') || lowerObjet.includes('données')) {
      return 'bg-cat-donnees';
    }
    else if (lowerObjet.includes('technique') || lowerObjet.includes('plateforme') || lowerObjet.includes('bug')) {
      return 'bg-cat-technique';
    }
    return 'bg-cat-autre';
  }

  loadMyReclamations(): void {
    this.isLoading = true;
    this.reclamationService.getMyReclamations(this.currentConcoursId || undefined).subscribe({
      next: (data) => {
        this.reclamations = data;
        this.isLoading = false;
        
        // If we have an active draft, restore it instead of selecting the first ticket
        if (!this.loadDraft() && data.length > 0) {
          this.selectTicket(data[0]);
        }
      },
      error: (err) => {
        console.error('Error loading my reclamations', err);
        this.isLoading = false;
        this.reclamations = this.getMockData();
        if (!this.loadDraft()) {
          this.selectTicket(this.reclamations[0]);
        }
      }
    });
  }

  selectTicket(ticket: Reclamation): void {
    this.selectedReclamation = ticket;
    this.currentChatStep = 'IDLE';
    this.saveDraft(); // Clear draft if any
  }

  startNewChat(): void {
    this.selectedReclamation = null;
    this.messages = [];
    this.selectedFile = null;
    this.tempObjet = ''; // تفريغ الذاكرة المؤقتة باش تبدا نظيفة
    this.tempDescription = '';
    this.currentChatStep = 'WELCOMING';
    this.addBotMessage(this.translate.instant('RECLAMATIONS.CHAT.WELCOME'));
    this.saveDraft();
    
    setTimeout(() => {
      this.currentChatStep = 'OBJECT_PENDING';
      this.messages.push({
        role: 'bot',
        text: this.translate.instant('RECLAMATIONS.CHAT.CHOOSE_CAT'),
        timestamp: new Date(),
        options: this.reclamationCategories
      });
      this.saveDraft();
      this.scrollToBottom();
    }, 1500);
  }

  selectOption(opt: string): void {
    if (this.currentChatStep !== 'OBJECT_PENDING') return;
    
    this.userInput = opt;
    this.handleUserInput();
  }

  // --- Base64 File Conversion Helper ---
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Erreur', 'La taille du fichier ne doit pas dépasser 5MB.', 'error');
        return;
      }
      this.selectedFile = file;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  handleUserInput(): void {
    if (!this.userInput.trim() && !this.selectedFile) return;

    const text = this.userInput.trim();
    this.messages.push({ 
      role: 'user', 
      text: text || '(Fichier joint)', 
      timestamp: new Date(),
      fileName: this.selectedFile ? this.selectedFile.name : undefined
    });
    this.userInput = '';
    this.saveDraft();
    this.scrollToBottom();

    if (this.currentChatStep === 'OBJECT_PENDING') {
      this.tempObjet = text;
      this.currentChatStep = 'DESC_PENDING';
      
      // Smart reaction
      if (text.length > 40) {
        this.addBotMessage(this.translate.instant('RECLAMATIONS.CHAT.DESC_REACTION'));
        this.tempDescription = text; 
      } else {
        this.addBotMessage(this.translate.instant('RECLAMATIONS.CHAT.DESC_PROMPT', { text: text }));
      }
      this.saveDraft();
    } 
    else if (this.currentChatStep === 'DESC_PENDING') {

      // Gibberish / Quality detection (Stronger "AI" Simulation)
      const lowerForCheck = text.toLowerCase();
      const words = lowerForCheck.split(/\s+/).filter(w => w.length > 0);
      const vowelCount = (lowerForCheck.match(/[aeiouyéàèùâêîôû]/g) || []).length;
      const consonantCount = (lowerForCheck.match(/[bcdfghjklmnpqrstvwxz]/g) || []).length;
      const totalLetters = vowelCount + consonantCount;
      
      const hasTooManyConsonants = /[bcdfghjklmnpqrstvwxz]{4,}/.test(lowerForCheck); // ex: xfdg
      const hasVowelStarvedWords = words.some(w => w.length >= 3 && !/[aeiouyéàèùâêîôû]/.test(w));
      const hasRepetitiveChars = /(.)\1{2,}/.test(lowerForCheck); // ex: aaa
      const isOnlyNumbers = /^[\d\s\W]+$/.test(text);

      const isGibberish = 
        isOnlyNumbers ||
        hasRepetitiveChars ||
        (totalLetters > 0 && vowelCount === 0) || 
        hasTooManyConsonants || 
        hasVowelStarvedWords || 
        (totalLetters > 5 && (consonantCount / totalLetters > 0.80)) || 
        text.length < 15;

      if (isGibberish) {
        this.addBotMessage(this.translate.instant('RECLAMATIONS.CHAT.GIBBERISH'));
        this.saveDraft();
        return;
      }

      // Profanity / Inappropriate Language Filter
      const badWords = ['merde', 'putain', 'connard', 'salope', 'gueule', 'stupide', 'idiot', 'foutre', 'con', 'conne'];
      const hasBadWords = badWords.some(bw => new RegExp(`\\b${bw}\\b`, 'i').test(lowerForCheck));
      if (hasBadWords) {
        this.addBotMessage(this.translate.instant('RECLAMATIONS.CHAT.PROFANITY'));
        this.saveDraft();
        return;
      }

      const lowerText = text.toLowerCase();
      if (lowerText.match(/envoi|oui|ok|c'est tout|valider|submit|non/) && text.length < 15 && this.tempDescription) {
        // user confirms sending previously long text
      } else {
        // Append context if they added new details
        this.tempDescription = this.tempDescription && this.tempDescription !== this.tempObjet 
             ? this.tempDescription + '\n' + text 
             : text;
      }
      
      this.saveDraft();
      this.processSubmission();
    }
  }

  private detectCategory(text: string): string | null {
    const lowerText = text.toLowerCase();
    const keywords: Record<string, string[]> = {
      [this.translate.instant('RECLAMATIONS.CATEGORIES.SCORE')]: ['score', 'note', 'classement', 'rang', 'calcul', 'résultat', 'resultat', 'moyenne', 'point', 'chiffre', 'faux'],
      [this.translate.instant('RECLAMATIONS.CATEGORIES.ELIGIBILITY')]: ['convocation', 'convoqué', 'convoque', 'éligible', 'eligible', 'éligibilité', 'centre', 'examen', 'salle', 'liste', 'jury', 'affectation', 'absence'],
      [this.translate.instant('RECLAMATIONS.CATEGORIES.PERSONAL')]: ['nom', 'prénom', 'prenom', 'cin', 'naissance', 'email', 'mail', 'tél', 'identité', 'carte', 'photo', 'profil'],
      [this.translate.instant('RECLAMATIONS.CATEGORIES.BUG')]: ['bug', 'technique', 'site', 'plateforme', 'connexion', 'passe', 'bouton', 'page', 'bloqué', 'bloque', 'fichier', 'télécharge', 'erreur', 'compte', 'upload']
    };

    let maxMatches = 0;
    let detectedCategory: string | null = null;

    Object.entries(keywords).forEach(([cat, words]) => {
      let matches = 0;
      words.forEach(word => {
        if (lowerText.includes(word)) matches++;
      });
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = cat;
      }
    });

    // Require at least 1 strong keyword match to consider auto-correcting
    return maxMatches >= 1 ? detectedCategory : null;
  }

  private async processSubmission(): Promise<void> {
    this.currentChatStep = 'SUBMITTING';
    
    let pieceJointeBase64 = '';
    if (this.selectedFile) {
      try {
        pieceJointeBase64 = await this.fileToBase64(this.selectedFile);
      } catch (e) {
        console.error('Error converting file to base64', e);
      }
    }

    let correctionMsg = "";
    const detected = this.detectCategory(this.tempDescription);
    
    // We no longer overwrite the user's object/title with the detected category
    // to avoid confusing the user. The backend will still categorize it correctly.
    if (detected && detected !== this.tempObjet && this.tempObjet !== this.translate.instant('RECLAMATIONS.CATEGORIES.OTHER')) {
      correctionMsg = this.translate.instant('RECLAMATIONS.CHAT.IA_ANALYSIS', { detected: detected });
    }

    this.addBotMessage(correctionMsg + this.translate.instant('RECLAMATIONS.CHAT.SUBMITTING'));

    setTimeout(() => {
      this.reclamationService.submitReclamation(
        this.tempObjet, 
        this.tempDescription, 
        pieceJointeBase64 || undefined,
        this.selectedFile?.name,
        this.currentConcoursId || undefined
      ).subscribe({
        next: (res) => {
          this.addBotMessage(this.translate.instant('RECLAMATIONS.CHAT.SUCCESS', { cat: this.getTranslate(res.categorie), pri: this.getTranslate(res.priorite) }));
          this.addBotMessage(this.translate.instant('RECLAMATIONS.CHAT.FOLLOW_UP'));
          this.reclamations.unshift(res);
          this.currentChatStep = 'DONE';
          this.saveDraft(); // Clear draft on success
        },
        error: (err) => {
          this.addBotMessage(this.translate.instant('RECLAMATIONS.CHAT.ERROR'));
          this.currentChatStep = 'IDLE';
          this.saveDraft();
        }
      });
    }, 2000);
  }

  private addBotMessage(text: string): void {
    this.messages.push({ role: 'bot', text, timestamp: new Date() });
    this.scrollToBottom();
  }

  getStatusClass(statut: string): string {
    switch (statut) {
      case 'SOUMISE': return 'badge-new';
      case 'EN_COURS': return 'badge-progress';
      case 'CLOTUREE_ACCEPTEE': return 'badge-success';
      case 'CLOTUREE_REJETEE': return 'badge-danger';
      default: return '';
    }
  }

  getTranslate(key: string): string {
    const translations: any = {
      'SOUMISE': this.translate.instant('RECLAMATIONS.STATUS.SOUMISE'),
      'EN_COURS': this.translate.instant('RECLAMATIONS.STATUS.EN_COURS'),
      'CLOTUREE_ACCEPTEE': this.translate.instant('RECLAMATIONS.STATUS.CLOTUREE_ACCEPTEE'),
      'CLOTUREE_REJETEE': this.translate.instant('RECLAMATIONS.STATUS.CLOTUREE_REJETEE'),
      'RESULTAT': this.translate.instant('RECLAMATIONS.CATS.RESULTAT'),
      'TECHNIQUE': this.translate.instant('RECLAMATIONS.CATS.TECHNIQUE'),
      'INSCRIPTION': this.translate.instant('RECLAMATIONS.CATS.INSCRIPTION'),
      'PERSONNELLE': this.translate.instant('RECLAMATIONS.CATS.PERSONNELLE'),
      'AUTRE': this.translate.instant('RECLAMATIONS.CATS.AUTRE'),
      'URGENTE': this.translate.instant('RECLAMATIONS.PRIORITIES.URGENTE'),
      'HAUTE': this.translate.instant('RECLAMATIONS.PRIORITIES.HAUTE'),
      'MOYENNE': this.translate.instant('RECLAMATIONS.PRIORITIES.MOYENNE'),
      'BASSE': this.translate.instant('RECLAMATIONS.PRIORITIES.BASSE')
    };
    return translations[key] || key;
  }

  getTranslatedText(text: string | undefined): string {
    if (!text) return '';
    let translated = text;

    const bugFr = "Bug technique sur la plateforme";
    if (translated.includes(bugFr)) translated = translated.replace(bugFr, this.translate.instant('RECLAMATIONS.CATEGORIES.BUG'));
    
    const personalFr = "Erreur sur les données personnelles";
    if (translated.includes(personalFr)) translated = translated.replace(personalFr, this.translate.instant('RECLAMATIONS.CATEGORIES.PERSONAL'));
    
    // Also handle truncated or partial versions stored in DB
    if (translated.includes("données personnelles") && !translated.includes("Erreur sur les")) {
        translated = translated.replace("données personnelles", "بيانات شخصية");
    }
    
    const scoreFr = "Erreur sur le score ou le classement";
    if (translated.includes(scoreFr)) translated = translated.replace(scoreFr, this.translate.instant('RECLAMATIONS.CATEGORIES.SCORE'));
    
    const eligFr = "Problème d'éligibilité ou de convocation";
    if (translated.includes(eligFr)) translated = translated.replace(eligFr, this.translate.instant('RECLAMATIONS.CATEGORIES.ELIGIBILITY'));
    
    const autreFr = "Autre (précision requise)";
    if (translated.includes(autreFr)) translated = translated.replace(autreFr, this.translate.instant('RECLAMATIONS.CATEGORIES.OTHER'));

    // AI Replies / Admin Responses - Check if Arabic is active
    const isAr = this.translate.instant('RECLAMATIONS.TITLE') === 'فضاء الشكاوى';
    
    if (isAr) {
        if (translated.includes("Cher candidat, nous avons identifié et résolu")) {
            translated = "عزيزي المترشح، لقد حددنا الخلل التقني المبلغ عنه في ملفك وقمنا بحله. يمكنك الآن الوصول إلى المنصة بشكل طبيعي.";
        }
        
        translated = translated.replace(
          /Bonjour (.*?), nous avons bien étudié votre réclamation\. L'administration vous transmet sa décision après examen complet de votre dossier\./g,
          "مرحباً $1، لقد قمنا بدراسة شكواك بعناية. ستنقل لك الإدارة قرارها بعد الفحص الكامل لملفك."
        );
        
        translated = translated.replace(
          /Bonjour (.*?), suite à votre réclamation concernant "(.*?)", notre service a procédé à la vérification des archives\. Une rectification de votre score sera effectuée sous 48 heures ouvrables\./g,
          "مرحباً $1، بناءً على شكواك بخصوص \"$2\"، قام فريقنا بالتحقق من الأرشيف. سيتم تصحيح نتيجتك خلال 48 ساعة عمل."
        );
    }

    return translated;
  }

  private getMockData(): Reclamation[] {
    return [
      {
        id: 1,
        candidatId: 0,
        objet: "Erreur de score - Session Juin",
        description: "Exemple de ticket existant. L'assistant 3D vous aide ici.",
        categorie: "RESULTAT",
        priorite: "HAUTE",
        statut: "SOUMISE",
        dateSoumission: new Date().toISOString()
      }
    ];
  }
}
