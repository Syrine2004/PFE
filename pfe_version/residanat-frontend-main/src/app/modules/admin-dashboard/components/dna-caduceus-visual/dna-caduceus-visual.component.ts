import { Component, ElementRef, ViewChild, OnDestroy, AfterViewInit, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dna-caduceus-visual',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="visual-container">
      <div #canvasContainer class="canvas-container"></div>
      <div class="floating-metrics">
        <div class="metric m1">
          <span class="m-label">{{ 'ADMIN_DASHBOARD.DNA_STATS.HEALTH_CHECKS' | translate }}</span>
          <span class="m-value">{{ stats.healthChecks || '...' }}</span>
        </div>
        <div class="metric m2">
          <span class="m-label">{{ 'ADMIN_DASHBOARD.DNA_STATS.AI_REQUESTS' | translate }}</span>
          <span class="m-value">{{ stats.totalIA || '...' }}</span>
        </div>
        <div class="metric m3">
          <span class="m-label">{{ 'ADMIN_DASHBOARD.DNA_STATS.ACTIVE_SESSIONS' | translate }}</span>
          <span class="m-value">{{ stats.activeSessions || '...' }}</span>
        </div>
        <div class="metric m4">
          <span class="m-label">{{ 'ADMIN_DASHBOARD.DNA_STATS.SYNCHRONIZATIONS' | translate }}</span>
          <span class="m-value">{{ stats.totalDossiers || '...' }}</span>
        </div>
        <div class="metric m5">
          <span class="m-label">{{ 'ADMIN_DASHBOARD.DNA_STATS.DATA_FLOW' | translate }}</span>
          <span class="m-value">{{ stats.totalDocuments || '...' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .visual-container {
      position: relative;
      width: 100%;
      height: 100%; /* Fill the entire stretched nexus container */
      min-height: 480px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .canvas-container {
      width: 100%;
      height: 100%;
    }

    .floating-metrics {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      z-index: 5;
    }

    .metric {
      position: absolute;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      padding: 8px 14px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border: 1px solid rgba(255,255,255,0.7);
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 120px;
      transition: all 0.3s ease;

      &:hover {
        transform: scale(1.1);
        background: white;
        z-index: 100;
      }

      .m-label {
        font-size: 0.65rem;
        font-weight: 800;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .m-value {
        font-size: 1rem;
        font-weight: 900;
        color: #1e293b;
      }

      &.m1 { top: 65%; left: 8%; }
      &.m2 { top: 38%; left: 4%; }
      &.m3 { top: 12%; left: 42%; }
      &.m4 { top: 32%; right: 8%; }
      &.m5 { top: 68%; right: 4%; }
    }
  `]
})
export class DnaCaduceusVisualComponent implements OnDestroy, AfterViewInit, OnInit, OnChanges {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef;
  @Input() concoursId: string = '';
  
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private group!: THREE.Group;
  private animationId!: number;
  private resizeObserver!: ResizeObserver;
  
  public stats: any = {};
  private baseHost = (window.location.port === '4200' || window.location.hostname === 'localhost') 
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // fetchData is called by ngOnChanges on first load
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['concoursId']) {
      this.fetchData();
    }
  }

  private fetchData() {
    const params = this.concoursId ? `?concoursId=${this.concoursId}` : '';
    this.http.get<any>(`${this.baseHost}/api/dossiers/stats/system${params}`).subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Error fetching system stats', err)
    });
  }

  ngAfterViewInit() {
    this.initThree();
    this.createCeramicDna();
    this.animate();

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.canvasContainer.nativeElement);
  }

  ngOnDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.renderer) this.renderer.dispose();
  }

  private onResize() {
    if (!this.canvasContainer || !this.renderer || !this.camera) return;
    const w = this.canvasContainer.nativeElement.clientWidth;
    const h = this.canvasContainer.nativeElement.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private initThree() {
    const w = this.canvasContainer.nativeElement.clientWidth || 400;
    const h = this.canvasContainer.nativeElement.clientHeight || 480;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.camera.position.z = 60; /* Zoomed out from 35 to show the whole structure */

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.canvasContainer.nativeElement.appendChild(this.renderer.domElement);

    // Natural daylight simulation
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1);
    this.scene.add(hemiLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(20, 30, 40);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-20, -10, -10);
    this.scene.add(fillLight);
  }

  private createCeramicDna() {
    this.group = new THREE.Group();
    
    // Materials: Polished Ceramic, Glass, Metal
    const blueCeramic = new THREE.MeshPhongMaterial({ 
      color: 0x3b82f6, 
      shininess: 100, 
      reflectivity: 0.5,
      specular: 0x444444
    });
    const redCeramic = new THREE.MeshPhongMaterial({ 
      color: 0xef4444, 
      shininess: 100, 
      reflectivity: 0.5,
      specular: 0x444444
    });
    const metalMat = new THREE.MeshPhongMaterial({ 
      color: 0x94a3b8, 
      shininess: 150, 
      reflectivity: 1
    });
    const glassMat = new THREE.MeshPhongMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.2, 
      shininess: 200 
    });

    const sphereGeom = new THREE.SphereGeometry(0.8, 32, 32);
    const cylinderGeom = new THREE.CylinderGeometry(0.15, 0.15, 1, 16);

    for (let i = 0; i < 28; i++) {
      const y = (i - 14) * 1.5;
      const angle = i * 0.4;
      const radius = 7;

      const s1 = new THREE.Mesh(sphereGeom, blueCeramic);
      s1.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      this.group.add(s1);

      const s2 = new THREE.Mesh(sphereGeom, redCeramic);
      s2.position.set(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);
      this.group.add(s2);

      const bar = new THREE.Mesh(cylinderGeom, metalMat);
      bar.position.set(0, y, 0);
      bar.lookAt(s1.position);
      bar.rotateX(Math.PI / 2);
      bar.scale.set(1, radius * 2, 1);
      this.group.add(bar);
      
      // Glass core
      const core = new THREE.Mesh(sphereGeom, glassMat);
      core.position.set(0, y, 0);
      core.scale.set(1.5, 1.5, 1.5);
      this.group.add(core);
    }

    this.scene.add(this.group);
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    if (this.group) {
      this.group.rotation.y += 0.006;
      this.group.rotation.x += 0.002;
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
