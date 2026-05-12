import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
const BACKGROUND = new THREE.Color(0x202020);
const HEIGHT = window.innerHeight;
const WIDTH = window.innerWidth;

let cameras = [];
let cameraHelpers = [];
let scene, renderer, camera;
let droneWatch;

let pressed = {
    camera_1: false,
    camera_2: false,
    camera_3: false,
    camera_4: false,
    camera_5: false,
};

///////////////////////
/* CLASS DEFINITIONS */
///////////////////////
class DroneWatch extends THREE.Group {
    constructor() {
        super();
        // this.body = new Body();
        this.strap = null;
        // this.rotors = [new RotorAssembly(), new RotorAssembly(), new RotorAssembly(), new RotorAssembly()];
    }

    loadStrap() {
        const loader = new GLTFLoader();

        loader.load('../assets/strap.gltf', (gltf) => {
            this.pulseira = gltf.scene;

            this.pulseira.scale.set(0.5, 0.5, 0.5);

            this.add(this.pulseira);

            console.log("Pulseira carregada e adicionada ao DroneWatch");
        });
    }
}

// class Body extends THREE.GROUP {
//     constructor() {
//         super();

//     }
// }

// class RotorAssembly extends THREE.GROUP { }



// class Arm extends THREE.GROUP { }

// class Propeller extends THREE.GROUP { }



/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
    scene = new THREE.Scene();
    scene.background = BACKGROUND;

    droneWatch = new DroneWatch();
    droneWatch.loadStrap();
    scene.add(droneWatch);

    // Mostrar eixos de coordenadas
    const axesHelper = new THREE.AxesHelper(10); // 50 é o tamanho
    scene.add(axesHelper);

    // Adicionar luz ambiente
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function setupCameras() {
    const positions = [
        [0, 30, 0],    // 1 - top (ortho)
        [40, 0, 0],    // 2 - side (ortho)
        [0, 0, 40],    // 3 - front (ortho)
        [50, 20, 25],  // 4 - perspective (ortho)
        // 5 - perspective (perspetiva) — mesma posição que a 4
    ];

    // Câmeras 0-3: ortográficas
    for (let i = 0; i < 4; i++) {
        cameras[i] = new THREE.OrthographicCamera(
            WIDTH / -16,
            WIDTH / 16,
            HEIGHT / 16,
            HEIGHT / -16,
            1,
            1000
        );
        cameras[i].position.set(...positions[i]);
        cameras[i].lookAt(0, 0, 0);

        const helper = new THREE.CameraHelper(cameras[i]);
        cameraHelpers.push(helper);
        scene.add(helper);
    }

    // Câmera 4: perspetiva (mesma posição que cameras[3])
    cameras[4] = new THREE.PerspectiveCamera(95, WIDTH / HEIGHT, 1, 1000);
    cameras[4].position.set(...positions[3]);
    cameras[4].lookAt(0, 0, 0);

    const helper = new THREE.CameraHelper(cameras[4]);
    cameraHelpers.push(helper);
    scene.add(helper);

    camera = cameras[0];
}

function setCamera(index) {
    camera = cameras[index];
}
/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions() { }

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() { }

////////////
/* UPDATE */
////////////
function update() {
    // Handle camera changes
    if (pressed.camera_1) setCamera(0);
    pressed.camera_1 = false;
    if (pressed.camera_2) setCamera(1);
    pressed.camera_2 = false;
    if (pressed.camera_3) setCamera(2);
    pressed.camera_3 = false;
    if (pressed.camera_4) setCamera(3);
    pressed.camera_4 = false;
    if (pressed.camera_5) setCamera(4);
    pressed.camera_5 = false;
}

/////////////
/* DISPLAY */
/////////////
function render() {
    renderer.render(scene, camera);
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(renderer.domElement);

    createScene();
    setupCameras();
    camera = cameras[0]; // Começar com a câmera frontal

    window.addEventListener("keydown", onKeyDown);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
    requestAnimationFrame(animate);
    update();
    render();
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() { }

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {
    switch (e.key) {
        case "1": pressed.camera_1 = true; break;
        case "2": pressed.camera_2 = true; break;
        case "3": pressed.camera_3 = true; break;
        case "4": pressed.camera_4 = true; break;
        case "5": pressed.camera_5 = true; break;
        case "h": case "H": cameraHelpers.forEach(h => h.visible = !h.visible); break;
    }
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) { }

init();
animate();