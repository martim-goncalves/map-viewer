import * as THREE from './lib/three.module.min.js'
import { OrbitControls } from './lib/OrbitControls.js'
import { octomap2json } from './services/conversion_service.js'

// ____________________________________________________________________________
// Three.js setup

const canvas = document.getElementById('viewer');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 5, 5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

const grid = new THREE.GridHelper(10, 20);
scene.add(grid);

const axes = new THREE.AxesHelper(2);
scene.add(axes);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();


// ____________________________________________________________________________
// Control functions

document.getElementById('file-input').onchange = handleFileInput;

async function handleFileInput(event) {
  // Get file; halt handling if none
  const file = event.target.files[0];
  if (!file) return;
  // Attempt conversion
  try {
    const json = await octomap2json(file);
    if (json?.voxels && json?.resolution) {
      renderVoxels(json.voxels, json.resolution);
    } else {
      console.error("Invalid JSON response:", json);
    }
  } catch (err) {
    console.error("Conversion error:", err);
  }
}

function renderVoxels(voxels, res) {
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

  const dummy = new THREE.Object3D();

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
    dummy.position.set(voxel.x, voxel.y, voxel.z);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

  scene.add(instancedMesh);
}
