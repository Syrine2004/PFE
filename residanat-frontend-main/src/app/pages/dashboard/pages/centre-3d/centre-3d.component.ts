import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ConcoursService } from '../../../../core/services/concours.service';
import { DossierService } from '../../../../core/services/dossier.service';
import { catchError, filter, forkJoin, map, of, switchMap, tap } from 'rxjs';

declare const L: any;

type CenterDef = {
  key: string;
  label: string;
  facultyName: string;
  lat: number;
  lng: number;
  levels: number;
  entrance: string;
  occupancy: number; 
};

type ExamInfo = {
  centerKey: string;
  date: string | string[] | number[];
  heureAppel: string;
  salle: string;
  numPlace: string;
  inscription: string;
};

@Component({
  selector: 'app-centre-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './centre-3d.component.html',
  styleUrl: './centre-3d.component.scss'
})
export class Centre3dComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly concoursService = inject(ConcoursService);
  private readonly dossierService = inject(DossierService);
  private readonly ngZone = inject(NgZone);

  private map: any;
  private mapBaseLayer: any;
  private userMarker: any;
  private centerMarkers: any[] = [];
  private routeLine: any;
  private routeDepthLine: any;
  private vehicleMarker: any;
  private vehicleAnimReq: any;
  private vehicleRouteCoords: [number, number][] = [];
  private watchId: number | null = null;
  
  // Cesium Variables
  private cesiumViewer: any;
  private cesiumDestinationEntity: any;
  private cesiumAutoRotateTick?: () => void;
  private cesiumFlyThroughTick?: () => void;
  private cesiumFlyAngle = 0;
  private readonly fullscreenChangeHandler = () => {
    this.is3DFullscreen = !!document.fullscreenElement;
  };

  loadingMap = true;
  loadingCesium = true;
  cesiumError = '';
  show3D = false;
  isMapTilted = false;
  mapLayerMode: 'plan' | 'satellite' = 'plan';
  is3DAutoRotate = false;
  is3DFlyThrough = false;
  is3DFullscreen = false;
  threeDLayerMode: 'satellite' | 'plan' = 'satellite';
  threeDAltitude = 1800;

  userLocation: { lat: number; lng: number } | null = null;
  
  destination: CenterDef | null = null;

  routeDistanceKm = 0;
  routeDurationMin = 0;
  routeTimeStr = '';
  travelMode: 'driving' | 'walking' = 'driving';
  arrivalTime = '';
  isSelectionListOpen = false;
  hoveredCenterKey: string | null = null;

  myExamInfo: ExamInfo | null = null;

  manualOrigin: {lat: number, lng: number, label: string} | null = null;
  departureQuery: string = '';
  isSearchingOrigin = false;
  originSearchError = '';
  searchResults: any[] = [];
  searchDebounce: any;
  isMapClickMode = false;

  private readonly centers: CenterDef[] = [
    {
      key: 'tunis', label: 'Tunis', facultyName: 'Faculté de Médecine de Tunis',
      lat: 36.8065, lng: 10.1815, levels: 6, entrance: '15 Rue Djebel Lakhdhar', occupancy: 67
    },
    {
      key: 'sfax', label: 'Sfax', facultyName: 'Faculté de Médecine de Sfax',
      lat: 34.7406, lng: 10.7603, levels: 5, entrance: 'Avenue Majida Boulila', occupancy: 55
    },
    {
      key: 'sousse', label: 'Sousse', facultyName: 'Faculté de Médecine de Sousse',
      lat: 35.8256, lng: 10.6369, levels: 5, entrance: 'Avenue Mohamed Karoui', occupancy: 85
    },
    {
      key: 'monastir', label: 'Monastir', facultyName: 'Faculté de Médecine de Monastir',
      lat: 35.7643, lng: 10.8113, levels: 4, entrance: 'Avenue Fattouma Bourguiba', occupancy: 20
    }
  ];

  get centerChoices(): CenterDef[] { return this.centers; }

  ngOnInit(): void { 
    this.bootstrap();
    this.loadRealCandidateAssignment();
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    }
  }

  private loadRealCandidateAssignment(): void {
    this.authService.getProfile().pipe(
      filter((profile: any) => !!profile?.id),
      switchMap(profile =>
        this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').pipe(
          map(response => ({
            candidatId: profile.id,
            concoursId: response.content?.[0]?.id
          }))
        )
      ),
      filter((data: any) => !!data.concoursId),
      switchMap(data => this.dossierService.getDossierByCandidat(data.candidatId, data.concoursId as string)),
      filter((dossier: any) => !!dossier?.id),
      switchMap(dossier => this.dossierService.getConvocationInfo(dossier.id)),
      catchError(err => {
        console.warn('Could not fetch real convocation info, staying empty.', err);
        return of(null);
      })
    ).subscribe(convocation => {
      if (convocation) {
        // Normalize backend location text to robustly map faculty names.
        const normalizedLieu = this.normalizeText(convocation.lieuExamenDetail);
        let targetKey = 'tunis';
        if (normalizedLieu.includes('sfax')) targetKey = 'sfax';
        if (normalizedLieu.includes('sousse')) targetKey = 'sousse';
        if (normalizedLieu.includes('monastir')) targetKey = 'monastir';

        this.myExamInfo = {
          centerKey: targetKey,
          date: convocation.dateEpreuve,
          heureAppel: convocation.heureAppel,
          salle: convocation.salle,
          numPlace: convocation.place,
          inscription: convocation.numeroInscription
        };

        // If the candidate is assigned to a center, we can auto-select it!
        this.selectCenter(targetKey);
      }
    });
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  ngOnDestroy(): void {
    if (this.vehicleAnimReq) cancelAnimationFrame(this.vehicleAnimReq);
    if (this.watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(this.watchId);
    if (this.map) this.map.remove();
    this.set3DAutoRotate(false);
    this.set3DFlyThrough(false);
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    }
    if (this.cesiumViewer) this.cesiumViewer.destroy();
  }

  getOccupancyClass(occupancy: number): string {
    if (occupancy <= 30) return 'bg-green';
    if (occupancy <= 70) return 'bg-yellow';
    return 'bg-red';
  }

  getOccupancyState(occupancy: number): string {
    if (occupancy <= 30) return 'Faible';
    if (occupancy <= 70) return 'Moyen';
    return 'Élevé';
  }

  formatDuration(totalMin: number): string {
    if (totalMin < 60) return `${totalMin} min`;
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `${hours} h ${mins > 0 ? mins + ' min' : ''}`;
  }

  zoomIn(): void { if(this.map) this.map.zoomIn(); }
  zoomOut(): void { if(this.map) this.map.zoomOut(); }
  resetView(): void { 
    if(this.map) {
      if (this.routeLine && typeof this.routeLine.getBounds === 'function') {
        this.map.fitBounds(this.routeLine.getBounds(), { padding: [80, 80], animate: true, duration: 1.5 });
        return;
      }

      if (this.destination && this.userLocation) {
        this.map.fitBounds(L.latLngBounds([
          [this.userLocation.lat, this.userLocation.lng], 
          [this.destination.lat, this.destination.lng]
        ]), { padding: [50, 50], animate: true, duration: 1.5 });
      } else if (this.destination) {
        this.map.setView([this.destination.lat, this.destination.lng], 13, { animate: true, duration: 1 });
      } else {
        // Zoom on all Tunisia to see all faculties
        this.map.setView([34.0, 9.5], 6, { animate: true });
      }
    }
  }

  recenterOnRoute(): void {
    if (!this.map) return;

    if (this.routeLine && typeof this.routeLine.getBounds === 'function') {
      this.map.fitBounds(this.routeLine.getBounds(), {
        padding: [110, 110],
        maxZoom: 15,
        animate: true,
        duration: 1.8
      });
      return;
    }

    // Fallback if route is not ready yet.
    this.resetView();
  }

  toggle3D(): void {
    if (!this.destination) return; // Prevent 3D if no center
    this.show3D = !this.show3D;
    if (!this.show3D) {
      this.set3DAutoRotate(false);
      this.set3DFlyThrough(false);
    }
    if (this.show3D) {
      if (!this.cesiumViewer && !this.cesiumError) {
        this.loadingCesium = true;
        this.initCesium();
      }

      if (this.cesiumViewer) {
        setTimeout(() => {
          this.cesiumViewer.resize();
          this.focusDestinationInCesium();
        }, 300);
      }
    }
  }

  toggleMapTilt(): void {
    this.mapLayerMode = this.mapLayerMode === 'plan' ? 'satellite' : 'plan';
    this.isMapTilted = this.mapLayerMode === 'satellite';
    this.apply2DBaseLayer();

    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 200);
    }
  }

  downloadConvocation(): void {
    if(this.destination) {
      alert('Téléchargement de la convocation pour ' + this.destination.facultyName);
    }
  }

  selectCenter(key: string): void {
    const selected = this.centers.find(c => c.key === key);
    if (!selected) {
      this.destination = null;
      if(this.routeLine) {
        this.map.removeLayer(this.routeLine);
        this.routeLine = null;
      }
      if (this.routeDepthLine) {
        this.map.removeLayer(this.routeDepthLine);
        this.routeDepthLine = null;
      }
      if (this.vehicleMarker) {
        this.map.removeLayer(this.vehicleMarker);
        this.vehicleMarker = null;
        if (this.vehicleAnimReq) cancelAnimationFrame(this.vehicleAnimReq);
      }
      this.resetView();
      this.drawAllCenters();
      return;
    }
    this.destination = selected;
    this.routeDistanceKm = 0;
    this.routeDurationMin = 0;
    this.arrivalTime = '';
    if(this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }
    if (this.routeDepthLine) {
      this.map.removeLayer(this.routeDepthLine);
      this.routeDepthLine = null;
    }
    if (this.vehicleMarker) {
      this.map.removeLayer(this.vehicleMarker);
      this.vehicleMarker = null;
      if (this.vehicleAnimReq) cancelAnimationFrame(this.vehicleAnimReq);
    }
    this.refreshDestinationOnMap();
  }

  private async bootstrap(): Promise<void> {
    await this.ensureLeafletLoaded();
    this.initMap();
    this.detectDestinationFromCandidateData();
    this.startLiveGeolocation();
  }

  private async ensureLeafletLoaded(): Promise<void> {
    if ((window as any).L) return;
    
    // Add Leaflet
    const cssLink = document.createElement('link'); cssLink.rel = 'stylesheet'; cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(cssLink);
    
    // Add FontAwesome for icons (Critical for recenter button and travel modes)
    const faLink = document.createElement('link'); faLink.rel = 'stylesheet'; faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'; document.head.appendChild(faLink);

    await new Promise<void>((resolve) => {
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = () => resolve(); document.body.appendChild(script);
    });
  }

  private async ensureCesiumLoaded(): Promise<void> {
    if ((window as any).Cesium) return;

    const loadCss = (href: string) => new Promise<void>((resolve, reject) => {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = href;
      cssLink.onload = () => resolve();
      cssLink.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
      document.head.appendChild(cssLink);
    });

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });

    await loadCss('https://cdn.jsdelivr.net/npm/cesium@1.114/Build/Cesium/Widgets/widgets.css');
    await loadScript('https://cdn.jsdelivr.net/npm/cesium@1.114/Build/Cesium/Cesium.js');
    (window as any).CESIUM_BASE_URL = 'https://cdn.jsdelivr.net/npm/cesium@1.114/Build/Cesium/';
  }

  private initMap(): void {
    // Start zoomed out on Tunisia
    this.map = L.map('centre-3d-map', { zoomControl: false, minZoom: 6 }).setView([34.0, 9.5], 6);

    this.apply2DBaseLayer();
    
    this.drawAllCenters();

    // Setup map click listener
    this.map.on('click', (e: any) => {
      if (this.isMapClickMode) {
        this.ngZone.run(() => {
          this.setManualOriginFromCoords(e.latlng.lat, e.latlng.lng);
          this.isMapClickMode = false; // Turn off mode after picking
        });
      }
    });

    this.loadingMap = false;
  }

  private apply2DBaseLayer(): void {
    if (!this.map) return;

    if (this.mapBaseLayer) {
      this.map.removeLayer(this.mapBaseLayer);
      this.mapBaseLayer = null;
    }

    if (this.mapLayerMode === 'satellite') {
      this.mapBaseLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      });
    } else {
      this.mapBaseLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      });
    }

    this.mapBaseLayer.addTo(this.map);
  }

  private applyMapTiltEffect(): void {
    if (!this.map) return;

    const container = this.map.getContainer?.() as HTMLElement | undefined;
    if (!container) return;

    const mapPane = container.querySelector('.leaflet-map-pane') as HTMLElement | null;
    const markerPane = container.querySelector('.leaflet-marker-pane') as HTMLElement | null;
    const overlayPane = container.querySelector('.leaflet-overlay-pane') as HTMLElement | null;

    if (!mapPane) return;

    if (this.isMapTilted) {
      container.style.perspective = '1200px';
      container.style.transformStyle = 'preserve-3d';

      mapPane.style.transformOrigin = '50% 55%';
      mapPane.style.transformStyle = 'preserve-3d';
      mapPane.style.transition = 'transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      mapPane.style.transform = 'rotateX(52deg) rotateZ(-8deg) scale(1.18)';

      if (markerPane) {
        markerPane.style.transformOrigin = '50% 50%';
        markerPane.style.transition = 'transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        markerPane.style.transform = 'rotateX(-52deg) rotateZ(8deg) translateY(-24px)';
      }

      if (overlayPane) {
        overlayPane.style.transition = 'transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        overlayPane.style.transform = 'translateY(4px)';
      }
    } else {
      container.style.perspective = '';
      container.style.transformStyle = '';

      mapPane.style.transformOrigin = '';
      mapPane.style.transformStyle = '';
      mapPane.style.transition = 'transform 450ms ease';
      mapPane.style.transform = '';

      if (markerPane) {
        markerPane.style.transformOrigin = '';
        markerPane.style.transition = 'transform 450ms ease';
        markerPane.style.transform = '';
      }

      if (overlayPane) {
        overlayPane.style.transition = 'transform 450ms ease';
        overlayPane.style.transform = '';
      }
    }
  }

  private drawAllCenters(): void {
    this.centerMarkers.forEach(m => this.map.removeLayer(m));
    this.centerMarkers = [];

    this.centers.forEach((c, index) => {
      const isDestination = this.destination && c.key === this.destination.key;
      
      let modelHtml = '';
      let popupHtml = '';

      popupHtml = `
        <div class="marker-popup-simple">
          <div class="popup-title">${c.facultyName}</div>
        </div>
      `;

      // New Realistic 3D Destination Marker using generated Photorealistic models
      modelHtml = `
        <div class="dest-building-wrap realistic ${c.key} ${isDestination ? 'selected' : ''}">
          <div class="dest-shadow"></div>
          <div class="dest-building-3d">
            <img src="assets/images/fac_${c.key}.png" alt="${c.facultyName}" class="realistic-3d-img" />
          </div>
        </div>
      `;

      const iconHtml = `
        <div class="custom-leaflet-marker ${isDestination ? 'is-selected' : ''}" style="--marker-delay:${index * 120}ms;">
          ${popupHtml}
          ${modelHtml}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-icon-wrapper',
        html: iconHtml,
        iconSize: isDestination ? [110, 110] : [90, 90],
        iconAnchor: isDestination ? [55, 100] : [45, 80]
      });
      const marker = L.marker([c.lat, c.lng], { icon: customIcon, zIndexOffset: isDestination ? 1000 : 0 }).addTo(this.map);
      
      // Show assignment popup when hovering a faculty marker on the map.
      marker.on('mouseover', () => {
        this.ngZone.run(() => this.onHoverCenter(c.key));
      });

      marker.on('mouseout', () => {
        this.ngZone.run(() => this.onLeaveCenter());
      });

      // Click event to auto-select the faculty directly from the map
      marker.on('click', () => {
        this.ngZone.run(() => this.selectCenter(c.key));
      });

      this.centerMarkers.push(marker);
    });
  }

  private async initCesium(): Promise<void> {
    const Cesium = (window as any).Cesium;
    const container = document.getElementById('centre-3d-globe');

    if (!Cesium || !container) {
      this.cesiumError = 'Plan d\'accès 3D indisponible sur cet environnement.';
      this.loadingCesium = false;
      return;
    }

    try {
      if (!this.cesiumViewer) {
        this.cesiumViewer = new Cesium.Viewer('centre-3d-globe', {
          timeline: false,
          animation: false,
          sceneModePicker: false,
          geocoder: false,
          homeButton: false,
          navigationHelpButton: false,
          baseLayerPicker: false,
          infoBox: false,
          selectionIndicator: false,
          shadows: true,
          terrainShadows: Cesium.ShadowMode.ENABLED
        });

        this.cesiumViewer.scene.globe.depthTestAgainstTerrain = true;

        try {
          if (typeof Cesium.createWorldTerrainAsync === 'function') {
            this.cesiumViewer.terrainProvider = await Cesium.createWorldTerrainAsync();
          }
        } catch {
          // Terrain is optional; continue with default globe.
        }

        try {
          let buildingsTileset: any;
          if (typeof Cesium.createOsmBuildingsAsync === 'function') {
            buildingsTileset = await Cesium.createOsmBuildingsAsync();
          } else if (typeof Cesium.createOsmBuildings === 'function') {
            buildingsTileset = Cesium.createOsmBuildings();
          }

          if (buildingsTileset) {
            this.cesiumViewer.scene.primitives.add(buildingsTileset);
          }
        } catch {
          // 3D buildings are optional; continue if unavailable.
        }

        this.applyCesiumBaseLayer();
      }

      this.updateCesiumDestinationEntity();
      this.focusDestinationInCesium();
      this.cesiumError = '';
    } catch (e: any) {
      this.cesiumError = 'Erreur lors du chargement de la scène 3D.';
    } finally {
      this.loadingCesium = false;
    }
  }

  private refreshDestinationOnMap(): void {
    if (!this.map || !this.destination) return;
    this.drawAllCenters();
    // Use animate option for a smooth zoom feeling "ydhami9 fih"
    this.map.setView([this.destination.lat, this.destination.lng], 13, { animate: true, duration: 1.5 });
    this.tryBuildRoute();
    this.updateCesiumDestinationEntity();
    if (this.show3D) this.focusDestinationInCesium();
  }

  private updateCesiumDestinationEntity(): void {
    const Cesium = (window as any).Cesium;
    if (!Cesium || !this.cesiumViewer || !this.destination) return;

    if (this.cesiumDestinationEntity) {
      this.cesiumViewer.entities.remove(this.cesiumDestinationEntity);
      this.cesiumDestinationEntity = null;
    }

    this.cesiumDestinationEntity = this.cesiumViewer.entities.add({
      name: this.destination.facultyName,
      position: Cesium.Cartesian3.fromDegrees(this.destination.lng, this.destination.lat, 20),
      point: {
        pixelSize: 14,
        color: Cesium.Color.fromCssColorString('#2563eb'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3
      },
      label: {
        text: this.destination.facultyName,
        font: '600 14px Segoe UI',
        fillColor: Cesium.Color.fromCssColorString('#0f172a'),
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(255,255,255,0.88)'),
        pixelOffset: new Cesium.Cartesian2(0, -34),
        style: Cesium.LabelStyle.FILL
      }
    });
  }

  private focusDestinationInCesium(): void {
    const Cesium = (window as any).Cesium;
    if (!Cesium || !this.cesiumViewer || !this.destination) return;

    this.cesiumViewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    this.cesiumViewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(this.destination.lng, this.destination.lat, this.threeDAltitude),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 1.8
    });
  }

  recenter3D(): void {
    this.focusDestinationInCesium();
  }

  toggle3DAutoRotate(): void {
    this.set3DAutoRotate(!this.is3DAutoRotate);
  }

  toggle3DFlyThrough(): void {
    this.set3DFlyThrough(!this.is3DFlyThrough);
  }

  set3DAltitude(value: number): void {
    const normalized = Math.max(800, Math.min(5000, Number(value)));
    this.threeDAltitude = normalized;
    this.focusDestinationInCesium();
  }

  on3DAltitudeInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.set3DAltitude(Number(target.value));
  }

  async toggle3DFullscreen(): Promise<void> {
    const overlay = document.querySelector('.view-3d-overlay.visible') as HTMLElement | null;
    if (!overlay) return;

    if (!document.fullscreenElement) {
      await overlay.requestFullscreen();
      this.is3DFullscreen = true;
      return;
    }

    await document.exitFullscreen();
    this.is3DFullscreen = false;
  }

  set3DLayerMode(mode: 'satellite' | 'plan'): void {
    if (this.threeDLayerMode === mode) return;
    this.threeDLayerMode = mode;
    this.applyCesiumBaseLayer();
  }

  private set3DAutoRotate(enabled: boolean): void {
    const Cesium = (window as any).Cesium;
    if (!this.cesiumViewer || !Cesium) {
      this.is3DAutoRotate = false;
      return;
    }

    if (enabled && this.is3DFlyThrough) {
      this.set3DFlyThrough(false);
    }

    if (this.cesiumAutoRotateTick) {
      this.cesiumViewer.clock.onTick.removeEventListener(this.cesiumAutoRotateTick);
      this.cesiumAutoRotateTick = undefined;
    }

    this.is3DAutoRotate = enabled;
    if (!enabled) return;

    this.cesiumAutoRotateTick = () => {
      if (!this.show3D) return;
      this.cesiumViewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.0018);
    };

    this.cesiumViewer.clock.onTick.addEventListener(this.cesiumAutoRotateTick);
  }

  private set3DFlyThrough(enabled: boolean): void {
    const Cesium = (window as any).Cesium;
    if (!this.cesiumViewer || !Cesium || !this.destination) {
      this.is3DFlyThrough = false;
      return;
    }

    if (enabled && this.is3DAutoRotate) {
      this.set3DAutoRotate(false);
    }

    if (this.cesiumFlyThroughTick) {
      this.cesiumViewer.clock.onTick.removeEventListener(this.cesiumFlyThroughTick);
      this.cesiumFlyThroughTick = undefined;
      this.cesiumViewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }

    this.is3DFlyThrough = enabled;
    if (!enabled) return;

    this.cesiumFlyAngle = 0;
    this.cesiumFlyThroughTick = () => {
      if (!this.show3D || !this.destination) return;
      this.cesiumFlyAngle += 0.004;

      const center = Cesium.Cartesian3.fromDegrees(this.destination.lng, this.destination.lat, 0);
      const heading = this.cesiumFlyAngle;
      const pitch = Cesium.Math.toRadians(-38 + Math.sin(this.cesiumFlyAngle * 2.0) * 6);
      const range = this.threeDAltitude;

      this.cesiumViewer.camera.lookAt(center, new Cesium.HeadingPitchRange(heading, pitch, range));
    };

    this.cesiumViewer.clock.onTick.addEventListener(this.cesiumFlyThroughTick);
  }

  private applyCesiumBaseLayer(): void {
    const Cesium = (window as any).Cesium;
    if (!this.cesiumViewer || !Cesium) return;

    const imageryLayers = this.cesiumViewer.imageryLayers;
    while (imageryLayers.length > 0) {
      imageryLayers.remove(imageryLayers.get(0), true);
    }

    const provider = this.threeDLayerMode === 'satellite'
      ? new Cesium.UrlTemplateImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        })
      : new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        });

    imageryLayers.addImageryProvider(provider);
  }

  setTravelMode(mode: 'driving' | 'walking'): void {
    if (this.travelMode === mode) return;
    this.travelMode = mode;
    this.tryBuildRoute();
  }

  onSearchInput(query: string): void {
    this.departureQuery = query;
    if (!query || query.trim().length < 3) {
      this.searchResults = [];
      this.originSearchError = '';
      return;
    }

    if (this.searchDebounce) clearTimeout(this.searchDebounce);

    this.searchDebounce = setTimeout(async () => {
      this.isSearchingOrigin = true;
      this.originSearchError = '';
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=tn&limit=5&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        this.searchResults = data;
        if (data.length === 0) {
          this.originSearchError = 'Lieu introuvable';
        }
      } catch (err) {
        console.error(err);
        this.originSearchError = 'Erreur réseau';
      } finally {
        this.isSearchingOrigin = false;
      }
    }, 400); // 400ms debounce
  }

  selectSearchResult(result: any): void {
    const nameParts = result.display_name.split(',');
    const label = nameParts.length > 1 ? nameParts[0] + ',' + nameParts[1] : nameParts[0];

    this.manualOrigin = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      label: label
    };
    this.departureQuery = this.manualOrigin.label;
    this.searchResults = [];
    this.userLocation = { lat: this.manualOrigin.lat, lng: this.manualOrigin.lng };
    this.updateUserMarker();
    this.tryBuildRoute();
  }

  toggleMapClickMode(): void {
    this.isMapClickMode = !this.isMapClickMode;
    if (this.map) {
      if (this.isMapClickMode) {
        this.map.getContainer().style.cursor = 'crosshair';
      } else {
        this.map.getContainer().style.cursor = '';
      }
    }
  }

  setManualOriginFromCoords(lat: number, lng: number): void {
    this.manualOrigin = {
      lat: lat,
      lng: lng,
      label: `Position sur la carte (${lat.toFixed(3)}, ${lng.toFixed(3)})`
    };
    this.departureQuery = this.manualOrigin.label;
    this.searchResults = [];
    this.userLocation = { lat, lng };
    this.updateUserMarker();
    if (this.map) {
      this.map.getContainer().style.cursor = '';
    }
    this.tryBuildRoute();
  }

  clearManualOrigin(): void {
    this.manualOrigin = null;
    this.departureQuery = '';
    this.originSearchError = '';
    this.searchResults = [];
    this.isMapClickMode = false;
    if (this.map) this.map.getContainer().style.cursor = '';
    
    if (this.routeLine && this.map) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }
    if (this.routeDepthLine && this.map) {
      this.map.removeLayer(this.routeDepthLine);
      this.routeDepthLine = null;
    }
    if (this.vehicleMarker && this.map) {
      this.map.removeLayer(this.vehicleMarker);
      this.vehicleMarker = null;
      if (this.vehicleAnimReq) cancelAnimationFrame(this.vehicleAnimReq);
    }
    // We will redraw when the next GPS signal comes in
  }

  private detectDestinationFromCandidateData(): void {
    // Keep it simple
  }

  private startLiveGeolocation(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by your browser');
      return;
    }
    
    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        if (!this.manualOrigin) {
          this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          this.updateUserMarker();
          if(!this.routeLine) this.tryBuildRoute(); // Draw route once real GPS is acquired
        }
      },
      (err) => {
        console.error('Error getting location: ', err);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  }

  private updateUserMarker(): void {
    if (!this.map || !this.userLocation) return;
    if (this.userMarker) {
      this.userMarker.setLatLng([this.userLocation.lat, this.userLocation.lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div class="user-location-marker">
            <div class="pulse"></div>
            <div class="dot"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      this.userMarker = L.marker([this.userLocation.lat, this.userLocation.lng], {
        icon: userIcon, zIndexOffset: 2000
      }).addTo(this.map);
    }
  }

  private async tryBuildRoute(): Promise<void> {
    if (!this.userLocation || !this.map || !this.destination) return;
    const from = `${this.userLocation.lng},${this.userLocation.lat}`;
    const to = `${this.destination.lng},${this.destination.lat}`;

    // Standard OSRM Public Demo Profiles: 'car', 'foot', 'bike'.
    const osrmProfile = this.travelMode === 'walking' ? 'foot' : 'car';

    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/${osrmProfile}/${from};${to}?overview=full&geometries=geojson`);
      const data = await response.json();
      if (!data?.routes?.length) return;

      const route = data.routes[0];
      const latLngs = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);

      // ... existing gap logic ...
      latLngs.unshift([this.userLocation.lat, this.userLocation.lng]);

      if (this.routeLine) this.map.removeLayer(this.routeLine);
      if (this.routeDepthLine) this.map.removeLayer(this.routeDepthLine);

      this.routeDepthLine = L.polyline(latLngs, {
        color: '#334155',
        opacity: 0.35,
        weight: 9,
        lineCap: 'round',
        className: 'route-depth'
      }).addTo(this.map);
      
      this.routeLine = L.polyline(latLngs, {
        color: '#1d4ed8', weight: 5, dashArray: '8, 10', lineCap: 'round', className: 'route-animated'
      }).addTo(this.map);

      // --- Add Vehicle Marker ---
      if (this.vehicleMarker) this.map.removeLayer(this.vehicleMarker);
      const ts = Date.now();
      const vehicleHtml = `
        <div class="vehicle-icon-wrapper">
          <div class="vehicle-body-3d ${this.travelMode}" style="position:relative;width:65px;height:85px;display:flex;align-items:center;justify-content:center;transform-origin:center center;transition:transform 0.3s ease;will-change:transform;">
            ${this.travelMode === 'driving'
              ? `<img class="driving-img" src="assets/images/car_model.png?v=${Date.now()}" style="width:60px;height:60px;object-fit:contain;"/>`
              : `<img class="walking-img" src="assets/images/doctor_walk.gif?v=${Date.now()}" style="width:65px;height:85px;object-fit:contain;display:block;"/>`
            }
          </div>
        </div>
      `;
      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-icon',
        html: vehicleHtml,
        iconSize: [60, 80],
        iconAnchor: [30, 65]
      });
      // Start marker at the user's location
      this.vehicleMarker = L.marker(latLngs[0], { icon: vehicleIcon, zIndexOffset: 3000 }).addTo(this.map);
      this.startVehicleAnimation(latLngs);
      // ----------------------------

      this.routeDistanceKm = Number((route.distance / 1000).toFixed(2));
      
      // LOGIC CALIBRATION FOR TUNIS:
      // OSRM Public Demo often ignores 'foot' or uses ideal speeds. 
      // Google Maps says 9.8km = 21min (Driving) and 2h15 (Walking).
      
      let finalMinutes = Math.round(route.duration / 60);

      if (this.travelMode === 'driving') {
        // Apply Tunis Traffic Factor (1.8x) to match real city traffic (21 min for 10km)
        finalMinutes = Math.round(finalMinutes * 1.8);
      } else {
        // Ensure Walking is at least 5km/h (12 min per km) if OSRM gives car-like speeds
        const minWalkingMinutes = Math.round(this.routeDistanceKm * 13); // ~4.6 km/h
        if (finalMinutes < minWalkingMinutes) {
          finalMinutes = minWalkingMinutes;
        }
      }

      this.routeDurationMin = finalMinutes;
      this.routeTimeStr = this.formatDuration(this.routeDurationMin);

      const arrivalDate = new Date(Date.now() + this.routeDurationMin * 60000);
      this.arrivalTime = arrivalDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // FORCE marker redraw to update the distance/time values in the map popup!
      this.drawAllCenters();

      this.map.fitBounds(L.latLngBounds(latLngs), { padding: [80, 80], animate: true, duration: 2 });
    } catch { }
  }

  deselectCenter(): void {
    this.destination = null;
    this.routeDistanceKm = 0;
    this.routeDurationMin = 0;
    this.routeTimeStr = '';
    if (this.routeLine && this.map) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }
    if (this.routeDepthLine && this.map) {
      this.map.removeLayer(this.routeDepthLine);
      this.routeDepthLine = null;
    }
    if (this.vehicleMarker && this.map) {
      this.map.removeLayer(this.vehicleMarker);
      this.vehicleMarker = null;
    }
    if (this.vehicleAnimReq) cancelAnimationFrame(this.vehicleAnimReq);
    
    this.drawAllCenters();
    if(this.map) this.map.setView([34.0, 9.5], 6);
  }

  onHoverCenter(key: string): void {
    this.hoveredCenterKey = key;
  }

  onLeaveCenter(): void {
    this.hoveredCenterKey = null;
  }

  get isAssignedCenterSelected(): boolean {
    return !!this.destination && !!this.myExamInfo && this.destination.key === this.myExamInfo.centerKey;
  }

  get cardHeaderTitle(): string {
    if (!this.destination) return 'Plan d\'accès aux Centres';
    return this.isAssignedCenterSelected ? 'Votre Centre Affecté' : 'Centre Consulté';
  }

  get cardHeaderSubtitle(): string {
    if (!this.destination) {
      return 'Votre faculté affectée est sélectionnée automatiquement. Vous pouvez aussi consulter les autres centres.';
    }

    if (this.isAssignedCenterSelected) {
      return 'Vous consultez la faculté où vous passerez l’épreuve.';
    }

    return 'Vous consultez une autre faculté. Votre affectation reste disponible dans la liste.';
  }

  private startVehicleAnimation(coords: [number, number][]): void {
    this.vehicleRouteCoords = coords;
    if (this.vehicleAnimReq) cancelAnimationFrame(this.vehicleAnimReq);
    
    if (coords.length < 2) return;

    let startTime = performance.now();
    // Steady, smooth, slower movement (25s driving, 45s walking)
    const duration = this.travelMode === 'driving' ? 25000 : 45000; 

    // Compute total distance of the polyline to normalize speed
    let totalDist = 0;
    const distances = [0];
    for (let i = 0; i < coords.length - 1; i++) {
        const d = this.map.distance(coords[i], coords[i+1]);
        totalDist += d;
        distances.push(totalDist);
    }

    const animate = (time: number) => {
      let progress = ((time - startTime) % duration) / duration;
      let currentDist = progress * totalDist;
      
      // Find current segment
      let index = 0;
      for (let i = 0; i < distances.length - 1; i++) {
          if (currentDist >= distances[i] && currentDist <= distances[i+1]) {
              index = i;
              break;
          }
      }
      
      if (index < coords.length - 1) {
        const p1 = coords[index];
        const p2 = coords[index+1];
        const segmentDist = distances[index+1] - distances[index];
        const remainder = segmentDist === 0 ? 0 : (currentDist - distances[index]) / segmentDist;
        
        const lat = p1[0] + (p2[0] - p1[0]) * remainder;
        const lng = p1[1] + (p2[1] - p1[1]) * remainder;
        
        if (this.vehicleMarker) {
          this.vehicleMarker.setLatLng([lat, lng]);

          // Update orientation for character to face travel direction
          const deltaLat = p2[0] - p1[0];
          const deltaLng = p2[1] - p1[1];
          const angleDeg = Math.atan2(deltaLat, deltaLng) * (180 / Math.PI);
          
          const iconElement = this.vehicleMarker.getElement();
          if (iconElement) {
            const body = iconElement.querySelector('.vehicle-body-3d') as HTMLElement;
            if (body) {
              // Éviter la rotation complète qui met l'image 3D de la voiture à l'envers.
              // On se contente de la retourner (flip horizontal) selon sa direction.
              const flip = deltaLng >= 0 ? 1 : -1;
              body.style.transform = `scaleX(${flip})`;
            }
          }
        }
      }
      this.vehicleAnimReq = requestAnimationFrame(animate);
    };

    this.vehicleAnimReq = requestAnimationFrame(animate);
  }

  getExamInfo(key: string): ExamInfo | null {
    if (!this.myExamInfo) return null;
    return this.myExamInfo.centerKey === key ? this.myExamInfo : null;
  }

  formatExamDate(value: string | string[] | number[] | null | undefined): string {
    if (!value) return 'Date non disponible';

    let parsedDate: Date | null = null;

    if (Array.isArray(value) && value.length >= 3) {
      const year = Number(value[0]);
      const month = Number(value[1] ?? 1);
      const day = Number(value[2] ?? 1);
      const hour = Number(value[3] ?? 0);
      const minute = Number(value[4] ?? 0);
      const second = Number(value[5] ?? 0);
      parsedDate = new Date(year, Math.max(month - 1, 0), day, hour, minute, second);
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        parsedDate = new Date(`${trimmed}T00:00:00`);
      } else {
        const d = new Date(trimmed);
        if (!Number.isNaN(d.getTime())) parsedDate = d;
      }
    }

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      return typeof value === 'string' ? value : 'Date non disponible';
    }

    return parsedDate.toLocaleString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }
}
