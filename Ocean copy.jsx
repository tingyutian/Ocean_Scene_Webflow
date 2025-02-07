import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import waterNormalsUrl from './waterNormals.jpg';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import modelTUrl from './T3.glb?url';

const Ocean = () => {
    const containerRef = useRef(null);
    
    useEffect(() => {
        // console.log('Ocean component mounted');
        const container = document.getElementById('three');
        
        // Early return if container is not found
        if (!container) return;
        
        let camera, scene, renderer;
        let water, sun, mesh, modelT;
        
        // Initialize scene
        const init = () => {
            // Check if container already has a renderer
            if (container.children.length > 0) {
                container.innerHTML = '';
            }
            
            renderer = new THREE.WebGLRenderer();
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setAnimationLoop(animate);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 0.5;
            container.appendChild(renderer.domElement);
            
            // Scene and camera setup
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 1, 20000);
            camera.position.set(30, 30, 120);
            sun = new THREE.Vector3();
            
            // Water setup
            const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
            
            // Add loading manager for better error handling
            const loadingManager = new THREE.LoadingManager();
            loadingManager.onError = function(url) {
                console.error('Error loading texture:', url);
            };

            const textureLoader = new THREE.TextureLoader(loadingManager);
            
            water = new Water(waterGeometry, {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: textureLoader.load(
                    waterNormalsUrl, 
                    function(texture) {  // Success callback
                        // console.log('Water normal texture loaded successfully');
                        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    },
                    function(xhr) {  // Progress callback
                        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                    },
                    function(error) {  // Error callback
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
            
            // Sky setup
            const sky = new Sky();
            sky.scale.setScalar(10000);
            scene.add(sky);
            
            const skyUniforms = sky.material.uniforms;
            skyUniforms['turbidity'].value = 10;
            skyUniforms['rayleigh'].value = 2;
            skyUniforms['mieCoefficient'].value = 0.005;
            skyUniforms['mieDirectionalG'].value = 0.8;
            
            const parameters = {
                elevation: 2,
                azimuth: 180
            };
            
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            const sceneEnv = new THREE.Scene();
            let renderTarget;
            
            const updateSun = () => {
                const phi = THREE.MathUtils.degToRad(90 - 2);
                const theta = THREE.MathUtils.degToRad(180);
                
                sun.setFromSphericalCoords(1, phi, theta);
                sky.material.uniforms['sunPosition'].value.copy(sun);
                water.material.uniforms['sunDirection'].value.copy(sun).normalize();
                
                if (renderTarget !== undefined) renderTarget.dispose();
                
                sceneEnv.add(sky);
                renderTarget = pmremGenerator.fromScene(sceneEnv);
                scene.add(sky);
                
                scene.environment = renderTarget.texture;
            };
            
            updateSun();
            
            // Add floating cube
            const geometry = new THREE.BoxGeometry(30, 30, 30);
            const material = new THREE.MeshStandardMaterial({ roughness: 0 });
            mesh = new THREE.Mesh(geometry, material);
            // scene.add(mesh);

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
        };
        
        // Animation
        const animate = () => {
            render();
        };
        
        // Add mouse position state at the top of useEffect
        let mouseX = 0;
        const windowHalfX = window.innerWidth / 2;
        
        // Add mouse move handler
        const onDocumentMouseMove = (event) => {
            mouseX = (event.clientX - windowHalfX) * 2;
        };
        
        // Add the event listener after init()
        document.addEventListener('mousemove', onDocumentMouseMove);
        
        // Modify the render function
        const render = () => {
            const time = performance.now() * 0.001;
            
            // Update camera rotation based on mouse position
            camera.position.x += (mouseX * 0.015 - camera.position.x) * 0.05;
            // camera.lookAt(scene.position);
            camera.lookAt(new THREE.Vector3(0, 16, 0));
            
            // mesh.position.y = Math.sin(time) * 20 + 5;
            // mesh.rotation.x = time * 0.5;
            // mesh.rotation.z = time * 0.51;

            if (modelT) {
                modelT.position.y = Math.sin(time) * 20 + 5;  // Floating motion
                modelT.rotation.z = time * 0.5;               // X-axis rotation
                modelT.rotation.y = time * 0.51; 
                modelT.rotation.x = time * 0.51;              
            }
            
            water.material.uniforms['time'].value += 1.0 / 40.0;
            
            renderer.render(scene, camera);
        };
        
        // Handle window resize
        const onWindowResize = () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        
        // Initialize everything
        init();
        
        // Add event listener
        window.addEventListener('resize', onWindowResize);
        
        // Cleanup
        return () => {
            // console.log('Ocean component unmounting');
            document.removeEventListener('mousemove', onDocumentMouseMove);
            window.removeEventListener('resize', onWindowResize);
            if (renderer) {
                renderer.dispose();
                renderer.forceContextLoss();
                renderer.domElement.remove();
            }
            if (scene) {
                scene.traverse((object) => {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (object.material.length) {
                            for (const material of object.material) {
                                material.dispose();
                            }
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }
        };
    }, []);
    
    return null;
};

export default Ocean;
