import * as THREE from './lib/three.module.min.js'
import { OrbitControls } from './lib/OrbitControls.js'

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

document.getElementById('file-input').addEventListener('change', async (event) => {
  // Get map file data from input
  const file = event.target.files[0];
  if (!file) return;

  // Set file as form data 
  const formData = new FormData();
  formData.append('file', file);

  // Request converted map (.ot --> .json)
  const res = await fetch('/convert/', {
    method: 'POST',
    body: formData
  });

  // Render result
  const json = await res.json();
  renderVoxels(json.voxels, json.resolution);
});

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
