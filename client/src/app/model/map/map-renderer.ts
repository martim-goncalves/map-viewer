import { ElementRef } from "@angular/core";

import * as THREE from 'three'; 
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { MapData } from "./map-data";
import { VoxelData } from "./voxel-data";
import { Map } from "./map";
import { RegionBounds } from "./region-bounds";
import { Projection } from "./projection";

export class MapRenderer {

  // TODO Make MapRenderer use the map via arguments instead of composition.

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.Camera;
  private perspectiveCamera!: THREE.PerspectiveCamera;
  private orthographicCamera!: THREE.OrthographicCamera;
  private controls!: OrbitControls;
  private grid!: THREE.GridHelper;
  private axes!: THREE.AxesHelper;
  private animationFrameId!: number;

  public getDomElement = () => this.renderer.domElement;

  private map!: Map;
  public setMap(map: MapData): void { this.map = new Map(map); }
  public getMap = (): Map => this.map;
  public hasMap = () => this.map != null;
  public getMapData = (): MapData | null => this.hasMap() ? this.map.getMap() : null;
  public setBounds(bounds: RegionBounds): void { this.map?.select(bounds); }
  public clearBounds(): void { this.map?.deselect(); }

  private cameraProjection: Projection = Projection.PERSPECTIVE;

  /**
   * Arrow functions capture the lexical `this` - the value of it for their 
   * surroundings. This aspect makes them the most suitable to be passed as 
   * callback functions without worrying about muddling the meaning of `this` 
   * with the value for it where they are called. An option would be to write 
   * it as a proper method and bind `this` on the `constructor`: 
   *    - this.animate.bind(this);
   */
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public resize(cameraAspect: number, rendererSize: number[]): void {
    // Window Dimensions
    const [width, height] = rendererSize;
    // Perspective
    this.perspectiveCamera.aspect = cameraAspect;
    this.perspectiveCamera.updateProjectionMatrix();
    // Ortho
    const frustumSize = 10;
    this.orthographicCamera.left = (frustumSize * cameraAspect) / -2;
    this.orthographicCamera.right = (frustumSize * cameraAspect) / 2;
    this.orthographicCamera.top = frustumSize / 2;
    this.orthographicCamera.bottom = frustumSize / -2;
    this.orthographicCamera.updateProjectionMatrix();
    // General    
    this.renderer.setSize(width, height);
  }

  public init(viewerCanvas: ElementRef<HTMLCanvasElement>): void {
    const canvas = viewerCanvas.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.7;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Perspective camera setup
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 100
    );
    this.perspectiveCamera.position.set(5, 5, 5);

    // Orthographic camera setup
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10;
    this.orthographicCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2, (frustumSize * aspect) / 2, 
      frustumSize / 2, frustumSize / -2, 0.1, 100
    );
    this.orthographicCamera.position.set(5, 5, 5);

    // Camera assignment
    this.camera = this.cameraProjection === Projection.PERSPECTIVE
      ? this.perspectiveCamera
      : this.orthographicCamera;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.update();

    this.grid = new THREE.GridHelper(10, 20);
    this.scene.add(this.grid);

    this.axes = new THREE.AxesHelper(2);
    this.scene.add(this.axes);

    this.animate();
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.controls.dispose();
    this.renderer.dispose();
  }

  public renderVoxels(shaded: boolean): void {
    if (!this.map) return;
    const mapData = this.map.getMap();
    console.info(`Selected voxels: ${mapData.voxels.length}`);
    if (!shaded) {
      this.renderVoxelsRaw(mapData.voxels, mapData.resolution);
    } else {
      this.renderVoxelsShaded(mapData.voxels, mapData.resolution);
    }
  }

  private renderVoxelsRaw(voxels: VoxelData[], res: number): void {
    this.clearSceneExceptBase();

    const geometry = new THREE.BoxGeometry(res, res, res);
    const material = new THREE.MeshBasicMaterial();

    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      voxels.length
    );

    const dummy = new THREE.Object3D();

    for (let i = 0; i < voxels.length; i++) {
      const voxel = voxels[i];

      const color = new THREE.Color(
        voxel.color[0] / 255,
        voxel.color[1] / 255,
        voxel.color[2] / 255
      );
      instancedMesh.setColorAt(i, color);

      const size = voxel.size ?? 1.0;
      const scale = size / res;
      dummy.position.set(voxel.x, voxel.y, voxel.z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    this.scene.add(instancedMesh);
  }

  private renderVoxelsShaded(voxels: VoxelData[], res: number): void {
    this.clearSceneExceptBase();

    const geometry = new THREE.BoxGeometry(res, res, res);

    const material = new THREE.MeshPhysicalMaterial({
      roughness: 0.4,
      metalness: 0.7,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
      reflectivity: 0.9,
    });

    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      voxels.length
    );
    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(voxels.length * 3), 3
    );

    const dummy = new THREE.Object3D();

    for (let i = 0; i < voxels.length; i++) {
      const voxel = voxels[i];

      const size = voxel.size ?? 1.0;
      const scale = size / res;
      dummy.position.set(voxel.x, voxel.y, voxel.z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);

      const rgb = this.boostColor(...voxel.color, 1.2, 1.7);
      instancedMesh.instanceColor.setXYZ(i, rgb.r, rgb.g, rgb.b);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor.needsUpdate = true;

    // Lighting setup
    const tintLight = new THREE.AmbientLight(0xddff00, 0.075);
    this.scene.add(tintLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xf0fefe, 0.8);
    directionalLight.position.set(0.2, 0.2, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.radius = 4;
    directionalLight.shadow.bias = -0.001;
    this.scene.add(directionalLight);

    this.scene.add(instancedMesh);
  }

  /**
   * Clear the scene but keep the grid and axes. Remove all children that are 
   * not grid or axes. Rotate scene -90 degrees along X to match octomap 
   * orientation.
   */
  private clearSceneExceptBase(): void {
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.children.forEach((object) => {
      if (object !== this.grid && object !== this.axes) {
        objectsToRemove.push(object);
      }
    });
    objectsToRemove.forEach((object) => this.scene.remove(object));
    this.scene.rotation.x = -Math.PI / 2;
  }

  private boostColor(
    r: number, g: number, b: number, 
    gain = 1.2, 
    saturation = 1.3
  ): THREE.Color {
    const color = new THREE.Color(r / 255, g / 255, b / 255);
    color.multiplyScalar(gain);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.s = Math.min(1, hsl.s * saturation);
    color.setHSL(hsl.h, hsl.s, hsl.l);
    return color;
  }

  public changeFocus(event: MouseEvent): void {
    const mouse = new THREE.Vector2(
      (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
      -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.controls.target.copy(point);
      this.controls.update();
    }
  }

  public setCameraProjectionMode(projectionMode: Projection): void {
    if (this.cameraProjection === projectionMode) return;
    
    const oldCamera = this.camera;
    this.cameraProjection = projectionMode;

    switch(this.cameraProjection) {
      case Projection.PERSPECTIVE:
        this.camera = this.perspectiveCamera;
        break;
      case Projection.ORTHOGRAPHIC:
        this.camera = this.orthographicCamera;
        break;
      default:
        console.error(
          `MapRenderer - Invalid projection mode provided ${projectionMode}`
        );
    }
    
    this.camera.position.copy(oldCamera.position);
    this.camera.quaternion.copy(oldCamera.quaternion);
    this.controls.object = this.camera;
    this.controls.update();
  }

}
