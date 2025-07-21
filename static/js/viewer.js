import * as THREE from './lib/three.module.min.js'
import { OrbitControls } from './lib/OrbitControls.js'
import { octomap2json } from './services/conversion_service.js'


// ____________________________________________________________________________
// Three.js setup

const canvas = document.getElementById('viewer');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.7;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xF0F0F0); // 0xF0F0F0

const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 100
);
camera.position.set(5, 5, 5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

const grid = new THREE.GridHelper(10, 20);
scene.add(grid);

const axes = new THREE.AxesHelper(2);
scene.add(axes);

const cameraPositionElement = document.getElementById('camera-position');
const cameraRotationElement = document.getElementById('camera-rotation');
const sceneRotationElement = document.getElementById('scene-rotation');

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  
  // Update info
  const camPos = camera.position;
  cameraPositionElement.textContent = `Camera Position: X: ${camPos.x.toFixed(2)}, Y: ${camPos.y.toFixed(2)}, Z: ${camPos.z.toFixed(2)}`;
  const camRot = camera.rotation;
  cameraRotationElement.textContent = `Camera Rotation: X: ${(camRot.x * 180 / Math.PI).toFixed(2)}°, Y: ${(camRot.y * 180 / Math.PI).toFixed(2)}°, Z: ${(camRot.z * 180 / Math.PI).toFixed(2)}°`;
  const scnRot = scene.rotation;
  sceneRotationElement.textContent = `Scene Rotation: X: ${(scnRot.x * 180 / Math.PI).toFixed(2)}°, Y: ${(scnRot.y * 180 / Math.PI).toFixed(2)}°, Z: ${(scnRot.z * 180 / Math.PI).toFixed(2)}°`;
}

animate();


// ____________________________________________________________________________
// State

let mapData;
let isShadingEnabled = false;


// ____________________________________________________________________________
// Handler functions

document
  .getElementById('file-input')
  .addEventListener('change', handleFileInput);

document
  .getElementById('shading-mode')
  .addEventListener('change', handleShadingModeToggle);

renderer
  .domElement
  .addEventListener('dblclick', handleSetFocus);

async function handleFileInput(event) {
  // Get file; halt handling if none
  const file = event.target.files[0];
  if (!file) return;
  // Attempt conversion
  try {
    const json = await octomap2json(file);
    if (!json?.voxels || !json?.resolution) {
      console.error("Invalid JSON response:", json);
      return;
    }
    mapData = json;
    renderVoxels(json.voxels, json.resolution);
  } catch (err) {
    console.error("Conversion error:", err);
  }
}

function handleSetFocus(event) { // [FIXME] :: Weird behavior
  const mouse = new THREE.Vector2(
    (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
    -(event.clientY / renderer.domElement.clientHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const point = intersects[0].point;
    controls.target.copy(point);
    controls.update();
  }
}

function handleShadingModeToggle() {
  isShadingEnabled = document.getElementById('shading-mode').checked;
  if (!mapData) {
    if (isShadingEnabled) {
      const message = "No map data to render.";
      console.warn(message);
      alert(message);
    }
    return;
  }
  renderVoxels(mapData.voxels, mapData.resolution);
}


// ____________________________________________________________________________
// Control functions

function renderVoxels(voxels, res) {
  if (!isShadingEnabled) {
    renderVoxelsRaw(voxels, res);
  } else {
    renderVoxelsShaded(voxels, res);
  }
}

function renderVoxelsRaw(voxels, res) {
  // Clear scene but keep grid and axes
  scene.clear();
  scene.add(grid, axes);

  // Rotate scene -90 degrees along X to match octomap orientation
  scene.rotation.x = -Math.PI / 2;

  // Create geometry and mat once (basic mat = no shading; preserves color)
  const geometry = new THREE.BoxGeometry(res, res, res);
  const material = new THREE.MeshBasicMaterial();

  /** ::[NOTE]:: 
   * Use InstancedMesh for better performance over individual Mesh instances. 
   * Can group objects with different color and materials instead of creating 
   * a new one for each voxel - provides a massive rendering speed up.
   */
  const instancedMesh = new THREE.InstancedMesh(
    geometry, 
    material, 
    voxels.length
  );

  // Base representation of a voxel replicated N times on the mesh
  const dummy = new THREE.Object3D();

  // Iterate to render each voxel
  for (let i = 0; i < voxels.length; i++) {
    const voxel = voxels[i];

    // Set color per instance
    const color = new THREE.Color(
      voxel.color[0] / 255,
      voxel.color[1] / 255,
      voxel.color[2] / 255
    );
    instancedMesh.setColorAt(i, color);

    // Position voxel
    const size = voxel.size ?? 1.0; // Preserve scale if size not provided
    const scale = size / res;
    dummy.position.set(voxel.x, voxel.y, voxel.z); // Set center
    dummy.scale.set(scale, scale, scale); // Scale to match pruned octree nodes
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }

  scene.add(instancedMesh);
}

function renderVoxelsShaded(voxels, res) {
  // Clear scene but keep grid and axes
  scene.clear();
  scene.add(grid, axes);

  // Rotate scene -90 degrees along X to match octomap orientation
  scene.rotation.x = -Math.PI / 2;

  // Geometry for voxel cube
  const geometry = new THREE.BoxGeometry(res, res, res);

  // Standard material that supports lighting and per-instance color
  const material = new THREE.MeshPhysicalMaterial({
    roughness: 0.4,
    metalness: 0.7,
    clearcoat: 0.6,
    clearcoatRoughness: 0.3,
    reflectivity: 0.9
  });

  // InstancedMesh setup
  const instancedMesh = new THREE.InstancedMesh(
    geometry, material, voxels.length
  );
  instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(voxels.length * 3), 3
  );

  const dummy = new THREE.Object3D();

  for (let i = 0; i < voxels.length; i++) {
    const voxel = voxels[i];

    // Set position and scale
    const size = voxel.size ?? 1.0;
    const scale = size / res;
    dummy.position.set(voxel.x, voxel.y, voxel.z);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);

    // Set per-instance color in the buffer
    const rgb = boostColor(...voxel.color, 1.2, 1.7);
    instancedMesh.instanceColor.setXYZ(i, ...rgb);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  instancedMesh.instanceColor.needsUpdate = true;

  // Lighting setup
  const tintLight = new THREE.AmbientLight(0xDDFF00, 0.075);
  scene.add(tintLight);

  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xF0FEFE, 0.8);
  directionalLight.position.set(0.2, 0.2, 1);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.radius = 4; // for softness
  directionalLight.shadow.bias = -0.001;
  scene.add(directionalLight);

  // Add instanced voxels to scene
  scene.add(instancedMesh);
}


// ____________________________________________________________________________
// Auxiliary functions

function boostColor(r, g, b, gain = 1.2, saturation = 1.3) {
  const color = new THREE.Color(r / 255, g / 255, b / 255);
  color.multiplyScalar(gain); // Brightness
  const hsl = {};
  color.getHSL(hsl);
  hsl.s = Math.min(1, hsl.s * saturation); // Saturation cap at 1
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return color;
}
