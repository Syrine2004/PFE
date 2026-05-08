import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, ViewEncapsulation, OnInit, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-tunisia-map-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="ultimate-3d-wrapper">
      <div #mapContainer class="canvas-container"></div>
      
      <!-- Floating Labels -->
      <div class="floating-label tunis" #labelTunis>
        <div class="fac-name">{{ 'ADMIN_DASHBOARD.MAP.TUNIS' | translate }}</div>
        <div class="fac-stats t">{{ stats['Tunis'] || 0 }} <span class="lbl">{{ 'ADMIN_DASHBOARD.MAP.CANDIDATES' | translate }}</span></div>
      </div>
      <div class="floating-label sousse" #labelSousse>
        <div class="fac-name">{{ 'ADMIN_DASHBOARD.MAP.SOUSSE' | translate }}</div>
        <div class="fac-stats s">{{ stats['Sousse'] || 0 }} <span class="lbl">{{ 'ADMIN_DASHBOARD.MAP.CANDIDATES' | translate }}</span></div>
      </div>
      <div class="floating-label monastir" #labelMonastir>
        <div class="fac-name">{{ 'ADMIN_DASHBOARD.MAP.MONASTIR' | translate }}</div>
        <div class="fac-stats m">{{ stats['Monastir'] || 0 }} <span class="lbl">{{ 'ADMIN_DASHBOARD.MAP.CANDIDATES' | translate }}</span></div>
      </div>
      <div class="floating-label sfax" #labelSfax>
        <div class="fac-name">{{ 'ADMIN_DASHBOARD.MAP.SFAX' | translate }}</div>
        <div class="fac-stats sf">{{ stats['Sfax'] || 0 }} <span class="lbl">{{ 'ADMIN_DASHBOARD.MAP.CANDIDATES' | translate }}</span></div>
      </div>
    </div>
  `,
  styles: [`
    .ultimate-3d-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 500px;
      background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%);
      border-radius: 30px;
      overflow: hidden;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.05);
    }

    .canvas-container {
      width: 100%;
      height: 100%;
      cursor: grab;
    }

    .canvas-container:active {
      cursor: grabbing;
    }

    .floating-label {
      position: absolute;
      top: 0; left: 0;
      pointer-events: none;
      transform: translate(-50%, -120%);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 6px 10px;
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
      border: 1px solid rgba(255, 255, 255, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 10;
      
      &::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 6px 6px 0;
        border-style: solid;
        border-color: rgba(255, 255, 255, 0.95) transparent transparent transparent;
      }
    }

    /* Smart Label Offsets to prevent overlap and clipping */
    .floating-label.tunis {
      margin-left: 55px;
      margin-top: -5px;
    }
    .floating-label.tunis::after { left: 15%; }

    .floating-label.sousse {
      margin-left: -55px;
      margin-top: 5px;
    }
    .floating-label.sousse::after { left: 85%; }

    .floating-label.monastir {
      margin-left: 55px;
      margin-top: 15px;
    }
    .floating-label.monastir::after { left: 15%; }

    .floating-label.sfax {
      margin-left: 45px;
      margin-top: 20px;
    }
    .floating-label.sfax::after { left: 20%; }

    .floating-label.visible {
      opacity: 1;
    }

    .fac-name { 
      font-size: 0.65rem; 
      font-weight: 800; 
      color: #64748b; 
      letter-spacing: 1px;
      margin-bottom: 1px;
    }
    
    .fac-stats { 
      font-size: 1rem; 
      font-weight: 900; 
      display: flex;
      align-items: baseline;
      gap: 3px;
      
      &.t { color: #3b82f6; }
      &.s { color: #ef4444; }
      &.m { color: #f97316; }
      &.sf { color: #22c55e; }
      
      .lbl {
        font-size: 0.65rem;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
      }
    }
  `]
})
export class TunisiaMapChartComponent implements AfterViewInit, OnDestroy, OnInit, OnChanges {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @ViewChild('labelTunis') labelTunis!: ElementRef;
  @ViewChild('labelSousse') labelSousse!: ElementRef;
  @ViewChild('labelMonastir') labelMonastir!: ElementRef;
  @ViewChild('labelSfax') labelSfax!: ElementRef;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private mapGroup!: THREE.Group;
  private animationId!: number;
  private resizeObserver!: ResizeObserver;
  private controls!: OrbitControls;

  @Input() concoursId: string = '';

  private markerPositions: { element: HTMLElement, dummyObj: THREE.Object3D }[] = [];
  
  public stats: any = {};
  private translate = inject(TranslateService);
  private http = inject(HttpClient);
  private baseHost = (window.location.port === '4200' || window.location.hostname === 'localhost') 
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;

  constructor() {}

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
    this.http.get<any[]>(`${this.baseHost}/api/convocations/stats/by-faculte${params}`).subscribe({
      next: (data) => {
        this.stats = {}; // Reset
        data.forEach(s => {
          const name = (s.faculte || '').toLowerCase().trim();
          const count = s.count || 0;

          if (name.includes('tunis')) {
            this.stats['Tunis'] = (this.stats['Tunis'] || 0) + count;
          } else if (name.includes('sousse')) {
            this.stats['Sousse'] = (this.stats['Sousse'] || 0) + count;
          } else if (name.includes('monastir')) {
            this.stats['Monastir'] = (this.stats['Monastir'] || 0) + count;
          } else if (name.includes('sfax')) {
            this.stats['Sfax'] = (this.stats['Sfax'] || 0) + count;
          }
        });
      },
      error: (err) => console.error('Error fetching map stats', err)
    });
  }

  ngAfterViewInit() {
    this.initThree();
    this.createRealistic3DMap();
    this.animate();

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.mapContainer.nativeElement);
  }

  ngOnDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }

  private onResize() {
    if (!this.mapContainer || !this.renderer || !this.camera) return;
    const w = this.mapContainer.nativeElement.clientWidth;
    const h = this.mapContainer.nativeElement.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private initThree() {
    const w = this.mapContainer.nativeElement.clientWidth || 600;
    const h = this.mapContainer.nativeElement.clientHeight || 500;

    this.scene = new THREE.Scene();
    
    // Light fog to blend into the light background
    this.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.012);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    // Zoom out the camera slightly so Tunis doesn't get clipped at the top
    this.camera.position.set(0, -28, 36);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Enable soft shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.mapContainer.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.2;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 80;
    
    // Bright lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(10, 30, 40);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    // Fill light from the opposite side
    const fillLight = new THREE.PointLight(0xffffff, 1.5, 100);
    fillLight.position.set(-20, -20, 20);
    this.scene.add(fillLight);
  }

  private createTerrainTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Create a vertical gradient representing Tunisia's terrain (North -> South)
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    // Y=0 (North): Mediterranean Green (with a tiny hint of coastal blue)
    gradient.addColorStop(0.0, '#3a8755'); 
    // Y=150: Olive / lighter green
    gradient.addColorStop(0.3, '#8ab36b'); 
    // Y=300: Steppe / dry transition
    gradient.addColorStop(0.5, '#d0c68c'); 
    // Y=512 (South): Desert Sand
    gradient.addColorStop(0.9, '#cf9c63'); 
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createRealistic3DMap() {
    this.mapGroup = new THREE.Group();
    
    // Accurate coordinates for Tunisia boundary
    const tunisiaCoords = [
      [9.48214, 30.307556], [9.055603, 32.102692], [8.439103, 32.506285],
      [8.430473, 32.748337], [7.612642, 33.344115], [7.524482, 34.097376],
      [8.140981, 34.655146], [8.376368, 35.479876], [8.217824, 36.433177],
      [8.420964, 36.946427], [9.509994, 37.349994], [10.210002, 37.230002],
      [10.18065, 36.724038], [11.028867, 37.092103], [11.100026, 36.899996],
      [10.600005, 36.41], [10.593287, 35.947444], [10.939519, 35.698984],
      [10.807847, 34.833507], [10.149593, 34.330773], [10.339659, 33.785742],
      [10.856836, 33.76874], [11.108501, 33.293343], [11.488787, 33.136996],
      [11.432253, 32.368903], [10.94479, 32.081815], [10.636901, 31.761421],
      [9.950225, 31.37607], [10.056575, 30.961831], [9.970017, 30.539325],
      [9.48214, 30.307556]
    ];

    const shape = new THREE.Shape();
    const scale = 5.0; 
    const centerX = 9.5;
    const centerY = 33.8;

    tunisiaCoords.forEach((coord, index) => {
      const x = (coord[0] - centerX) * scale;
      const y = (coord[1] - centerY) * scale;
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    const extrudeSettings = {
      depth: 1.2,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.15,
      bevelThickness: 0.15
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Center the geometry and calculate its exact size for UV mapping
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    const centerOffset = new THREE.Vector3();
    bbox.getCenter(centerOffset);
    geometry.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);

    // Map the UVs precisely so the texture gradient covers from top to bottom
    const posAttribute = geometry.attributes['position'];
    const uvAttribute = geometry.attributes['uv'];
    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        
        // Normalize x,y to 0..1 range over the geometry size for UVs
        const u = (x / size.x) + 0.5;
        const v = (y / size.y) + 0.5;
        uvAttribute.setXY(i, u, v);
    }
    uvAttribute.needsUpdate = true;

    // Use our custom terrain texture for realistic colors
    const terrainTexture = this.createTerrainTexture();

    const material = new THREE.MeshPhysicalMaterial({ 
      map: terrainTexture,
      metalness: 0.05,
      roughness: 0.8, // More rough for terrain
      clearcoat: 0.1,
    });
    
    // For the sides of the extrusion, we can use a solid soil/rock color
    const sideMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8c7961, // Soil/rock color
      metalness: 0.1,
      roughness: 0.9,
    });

    const mesh = new THREE.Mesh(geometry, [material, sideMaterial]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.mapGroup.add(mesh);

    // Precise Markers for Faculties
    const pinGeom = new THREE.SphereGeometry(0.35, 32, 32);
    const ringGeom = new THREE.RingGeometry(0.45, 0.6, 32);
    
    const addPin = (lon: number, lat: number, color: number, refName: string) => {
       const pinMat = new THREE.MeshPhysicalMaterial({ 
         color, 
         metalness: 0.2, 
         roughness: 0.1,
         clearcoat: 1.0,
         emissive: color,
         emissiveIntensity: 0.5
       });
       const pin = new THREE.Mesh(pinGeom, pinMat);
       
       const x = (lon - centerX) * scale - centerOffset.x;
       const y = (lat - centerY) * scale - centerOffset.y;
       const z = 1.2 - centerOffset.z + 0.15; // Placed on the surface
       
       pin.position.set(x, y, z);
       pin.castShadow = true;
       
       // Add a decorative ring around the pin
       const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
       const ring = new THREE.Mesh(ringGeom, ringMat);
       ring.position.set(x, y, z - 0.1);
       this.mapGroup.add(ring);
       
       // Add a point light for glowing effect
       const light = new THREE.PointLight(color, 2, 5);
       light.position.set(x, y, z + 0.5);
       this.mapGroup.add(light);

       this.mapGroup.add(pin);
       
       // Add dummy object for HTML label tracking
       const dummy = new THREE.Object3D();
       dummy.position.set(x, y, z + 0.5);
       this.mapGroup.add(dummy);
       
       // Bind label element to dummy
       setTimeout(() => {
         let el: HTMLElement | null = null;
         if (refName === 'Tunis') el = this.labelTunis?.nativeElement;
         if (refName === 'Sousse') el = this.labelSousse?.nativeElement;
         if (refName === 'Monastir') el = this.labelMonastir?.nativeElement;
         if (refName === 'Sfax') el = this.labelSfax?.nativeElement;
         
         if (el) {
           this.markerPositions.push({ element: el, dummyObj: dummy });
           el.classList.add('visible');
         }
       }, 100);
    };

    addPin(10.1815, 36.8065, 0x3b82f6, 'Tunis');
    addPin(10.6369, 35.8256, 0xef4444, 'Sousse');
    addPin(10.8261, 35.7779, 0xf97316, 'Monastir');
    addPin(10.7602, 34.7405, 0x22c55e, 'Sfax');

    // Add a beautiful blue ocean/sea platform underneath
    const oceanGeom = new THREE.CylinderGeometry(25, 26, 0.5, 64);
    const oceanMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7, // Deep vivid water blue
      metalness: 0.1,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8,
      transmission: 0.3, // Glass/Water-like depth
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
    const ocean = new THREE.Mesh(oceanGeom, oceanMat);
    ocean.rotation.x = Math.PI / 2;
    ocean.position.z = -1.0;
    ocean.receiveShadow = true;
    this.mapGroup.add(ocean);

    // Add lines (khtout) to outline the map elegantly
    const edges = new THREE.EdgesGeometry(geometry, 20); // 20 degree threshold
    const lineMat = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      linewidth: 2, 
      transparent: true, 
      opacity: 0.8 
    });
    const mapOutline = new THREE.LineSegments(edges, lineMat);
    this.mapGroup.add(mapOutline);

    // Initial rotation
    this.mapGroup.rotation.x = -Math.PI / 6;
    this.scene.add(this.mapGroup);
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    // Slow auto-rotation for the map
    if (this.mapGroup) {
       this.mapGroup.rotation.z = Math.sin(Date.now() * 0.0005) * 0.05;
    }
    
    if (this.controls) {
      this.controls.update();
    }
    
    // Render scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    
    // Update floating labels positions based on 3D coordinates
    if (this.mapContainer && this.markerPositions.length > 0 && this.camera) {
      const w = this.mapContainer.nativeElement.clientWidth;
      const h = this.mapContainer.nativeElement.clientHeight;
      const w2 = w / 2;
      const h2 = h / 2;
      
      for (const marker of this.markerPositions) {
        const pos = new THREE.Vector3();
        marker.dummyObj.getWorldPosition(pos);
        
        // Project to 2D
        pos.project(this.camera);
        
        // Convert to screen coordinates
        const x = (pos.x * w2) + w2;
        const y = -(pos.y * h2) + h2;
        
        // Hide if behind camera or too far off edge
        if (pos.z > 1) {
          marker.element.style.opacity = '0';
        } else {
          marker.element.style.opacity = '1';
          marker.element.style.transform = `translate(-50%, -120%) translate(${x}px, ${y}px)`;
        }
      }
    }
  }
}
