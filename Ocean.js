// Import necessary modules from CDNs (using ES modules)
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Replace these URLs with the actual asset links (e.g., from your Webflow Assets)
const waterNormalsUrl = './assets/waterNormals.jpg';
const modelTUrl = './assets/T3.glb';

// Global variables
let camera, scene, renderer;
let water, sun, modelT;
let mouseX = 0;
const windowHalfX = window.innerWidth / 2;

// Initialize the scene once the DOM is loaded
function init() {
  // Get the container element by ID (make sure an element with id="three" exists)
  const container = document.getElementById('three');
  if (!container) {
    console.error('No container element with id "three" found.');
    return;
  }

  // If the container already has child elements (such as a previous canvas), clear them.
  if (container.children.length > 0) {
    container.innerHTML = '';
  }

  // Create the renderer and set its properties
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  container.appendChild(renderer.domElement);

  // Create the scene and camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    1,
    20000
  );
  camera.position.set(30, 30, 120);
  sun = new THREE.Vector3();

  // Set up a LoadingManager for better error handling
  const loadingManager = new THREE.LoadingManager();
  loadingManager.onError = function(url) {
    console.error('Error loading texture:', url);
  };

  const textureLoader = new THREE.TextureLoader(loadingManager);

  // --- Water Setup ---
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: textureLoader.load(
      waterNormalsUrl,
      // Success callback:
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      },
      // Progress callback:
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      // Error callback:
      function (error) {
        console.error('Error loading water normal texture:', error);
      }
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: scene.fog !== undefined,
    alpha: 1.0,
    size: 3.0
  });
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // --- Sky Setup ---
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  // PMREM generator and environment for realistic lighting
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const sceneEnv = new THREE.Scene();
  let renderTarget;

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - 2);  // elevation
    const theta = THREE.MathUtils.degToRad(180);     // azimuth

    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();

    if (renderTarget !== undefined) renderTarget.dispose();

    sceneEnv.add(sky);
    renderTarget = pmremGenerator.fromScene(sceneEnv);
    scene.add(sky);
    scene.environment = renderTarget.texture;
  }
  updateSun();

  // --- Load GLTF Model ---
  const loader = new GLTFLoader(loadingManager);
  loader.load(
    modelTUrl,
    function (gltf) {
      modelT = gltf.scene;
      modelT.position.set(0, 0, 0);
      modelT.scale.set(20, 20, 20);
      scene.add(modelT);
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.error('Error loading GLTF model:', error);
    }
  );

  // --- Event Listeners ---
  document.addEventListener('mousemove', onDocumentMouseMove);
  window.addEventListener('resize', onWindowResize);
}

// Animation loop: called by renderer.setAnimationLoop
function animate() {
  render();
}

// Render function: updates the scene each frame
function render() {
  const time = performance.now() * 0.001;

  // Update camera position based on mouse movement
  camera.position.x += (mouseX * 0.015 - camera.position.x) * 0.05;
  // Point the camera toward a fixed point (adjust as needed)
  camera.lookAt(new THREE.Vector3(0, 16, 0));

  // If the model is loaded, update its position and rotation to create a floating effect
  if (modelT) {
    modelT.position.y = Math.sin(time) * 20 + 5;  // Floating motion
    modelT.rotation.z = time * 0.5;
    modelT.rotation.y = time * 0.51;
    modelT.rotation.x = time * 0.51;
  }

  // Update water shader time uniform
  water.material.uniforms['time'].value += 1.0 / 40.0;

  // Render the scene
  renderer.render(scene, camera);
}

// Mouse move handler: updates mouseX for camera movement
function onDocumentMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) * 2;
}

// Resize handler: updates camera and renderer when the window size changes
function onWindowResize() {
  const container = document.getElementById('three');
  if (!container) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Initialize everything when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', init);

// Optional: You can add cleanup code (such as removing event listeners or disposing of resources)
// when the page is unloaded if needed.