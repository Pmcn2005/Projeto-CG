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
let balloons = [];
let cameraHelpers = [];
let axesHelpers = [];
let scene, renderer, camera;
let droneWatch;
let droneScale = 1;
let ballonScale = 1;
const clock = new THREE.Clock();

let collisionAnimating = false;
let collisionHelpers = [];
let showHelpers = false;
let showCollisionSpheres = false;

let pressed = {
    camera_1: false,
    camera_2: false,
    camera_3: false,
    camera_4: false,
    camera_5: false,
    moveRight: false,    // D
    moveLeft: false,     // A
    moveUp: false,       // W
    moveDown: false,     // S
    moveForward: false,  // U
    moveBackward: false, // J
    yawLeft: false,      // I
    yawRight: false,     // K
    pitchUp: false,      // O
    pitchDown: false     // L
};

function addAxesHelper(obj, size) {
    const axesHelper = new THREE.AxesHelper(size);
    axesHelper.visible = false;
    obj.add(axesHelper);
    axesHelpers.push(axesHelper);
}


/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
    scene = new THREE.Scene();
    scene.background = BACKGROUND;

    droneWatch = new DroneWatch();
    scene.add(droneWatch);

    let strap = new Strap();
    scene.add(strap);

    let ballonsPositions = [
        [0, -30, 0],
        [-20, 35, 0],
        [0, 25, 20],
        [-15, 20, 15]
    ]

    for (let i = 0; i < 4; i++) {
        balloons[i] = new Balloon();
        balloons[i].position.set(ballonsPositions[i][0], ballonsPositions[i][1], ballonsPositions[i][2]);
        scene.add(balloons[i]);
    }

    // Mostrar eixos de coordenadas globais
    const axesHelper = new THREE.AxesHelper(10);
    axesHelper.visible = false;
    scene.add(axesHelper);
    axesHelpers.push(axesHelper);

    // Adicionar luz ambiente
    const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Cor branca, intensidade 0.5
    scene.add(ambientLight);
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function setupCameras() {
    const positions = [
        [0, 60, 0],    // 1 - top (ortho)
        [20, 0, 0],    // 2 - side (ortho)
        [0, 0, 20],    // 3 - front (ortho)
        [40, 40, 40],  // 4 - perspective (ortho)
        // 5 - perspective (perspetiva) — mesma posição que a 4
    ];

    // Câmeras 0-3: ortográficas
    for (let i = 0; i < 4; i++) {
        cameras[i] = new THREE.OrthographicCamera(
            WIDTH / -32,
            WIDTH / 32,
            HEIGHT / 32,
            HEIGHT / -32,
            0.1,
            1000
        );
        cameras[i].position.set(...positions[i]);
        cameras[i].lookAt(0, 0, 0);

        const helper = new THREE.CameraHelper(cameras[i]);
        helper.visible = false;
        cameraHelpers.push(helper);
        scene.add(helper);
    }

    // Câmera 4: perspetiva (mesma posição que cameras[3])
    cameras[4] = new THREE.PerspectiveCamera(95, WIDTH / HEIGHT, 1, 1000);
    cameras[4].position.set(...positions[3]);
    cameras[4].lookAt(0, 0, 0);

    const helper = new THREE.CameraHelper(cameras[4]);
    helper.visible = false;
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
class Strap extends THREE.Group {
    constructor() {
        super();
        this._strap = null;
        this._loadStrap();
        this.rotateY(Math.PI / 2);
        this.scale.set(droneScale, droneScale, droneScale);
    }

    _loadStrap() {
        const loader = new GLTFLoader();

        loader.load('../assets/strap.gltf', (gltf) => {
            this._strap = gltf.scene;

            this._strap.scale.set(0.22, 0.10, 0.10);
            this._strap.position.set(0, -2, 0);
            this.add(this._strap);

            console.log("Strap loaded and added to DroneWatch");
        });
    }
}

class DroneWatch extends THREE.Group {
    constructor() {
        super();
        this.deployProgress = 0; // 0 = recolhido, 1 = totalmente estendido
        this.targetDeployProgress = 0;

        this._body = new WatchBody();
        this.add(this._body);
        this._addRotors();

        const axesHelper = new THREE.AxesHelper(8);
        axesHelper.visible = false;
        this.add(axesHelper);
        axesHelpers.push(axesHelper);
        this.rotation.order = 'YXZ';
        this.scale.set(droneScale, droneScale, droneScale)
    }

    _addRotors() {
        this.rotors = [];
        const corners = [
            [3, 0, -2.5],   // Canto Frontal Direito
            [-3, 0, -2.5],  // Canto Frontal Esquerdo
            [3, 0, 2.5],  // Canto Traseiro Direito
            [-3, 0, 2.5]  // Canto Traseiro Esquerdo
        ];

        const angles = [
            Math.PI / 4,       // 45 deg
            3 * Math.PI / 4,   // 135 deg
            -Math.PI / 4,      // -45 deg
            -3 * Math.PI / 4   // -135 deg
        ];

        for (let i = 0; i < 4; i++) {
            const rotor = new RotorAssembly();
            rotor.position.set(...corners[i]);
            rotor.rotation.y = angles[i];
            this.add(rotor);
            this.rotors.push(rotor);
        }
    }

    toggleDeploy() {
        this.targetDeployProgress = this.targetDeployProgress === 1 ? 0 : 1;
    }

    update(dt, pressed) {
        // 1. Animação de recolha / extensão
        const deploySpeed = 1.5
        if (this.deployProgress < this.targetDeployProgress) {
            this.deployProgress = Math.min(1, this.deployProgress + dt * deploySpeed);
        } else if (this.deployProgress > this.targetDeployProgress) {
            this.deployProgress = Math.max(0, this.deployProgress - dt * deploySpeed);
        }

        const isFullyDeployed = this.deployProgress === 1;

        // Atualizar braços e hélices
        this.rotors.forEach(rotor => {
            // Recolhe rodando o braço no eixo Y
            rotor.armGroup.rotation.y = (1 - this.deployProgress) * Math.PI;

            if (isFullyDeployed) {
                // Rotação constante das hélices
                rotor.propellerGroup.rotation.y += 20 * dt;
            }
        });

        // 2 a 6. Controlo de movimento do DroneWatch (apenas se totalmente estendido)
        if (isFullyDeployed) {
            const moveSpeed = 15 * dt;
            const rotSpeed = 2 * dt;
            const minX = -50;
            const maxX = 50;
            const minY = 0;
            const maxY = 50;
            const minZ = -50;
            const maxZ = 50;
            const maxRot = Math.PI / 4;
            const minRot = -Math.PI / 4;

            // Translações (eixos locais)
            if (pressed.moveLeft) this.translateX(-moveSpeed);
            if (pressed.moveRight) this.translateX(moveSpeed);
            if (pressed.moveUp) this.translateY(moveSpeed);
            if (pressed.moveDown) this.translateY(-moveSpeed);
            if (pressed.moveForward) this.translateZ(-moveSpeed);
            if (pressed.moveBackward) this.translateZ(moveSpeed);

            // Limitar o movimento do drone 
            this.position.x = THREE.MathUtils.clamp(this.position.x, minX, maxX);
            this.position.y = THREE.MathUtils.clamp(this.position.y, minY, maxY);
            this.position.z = THREE.MathUtils.clamp(this.position.z, minZ, maxZ);

            // Rotações
            if (pressed.yawLeft) this.rotation.y += rotSpeed;
            if (pressed.yawRight) this.rotation.y -= rotSpeed;
            if (pressed.pitchUp && this.rotation.z > minRot) this.rotation.z -= rotSpeed;
            if (pressed.pitchDown && this.rotation.z < maxRot) this.rotation.z += rotSpeed;
        }
    }
}

class WatchBody extends THREE.Group {
    constructor() {
        super();
        this._addWatchBody();
        this._addScreen();
        this._addButton();
        this._addCameraLense();

        const axesHelper = new THREE.AxesHelper(6);
        axesHelper.visible = false;
        this.add(axesHelper);
        axesHelpers.push(axesHelper);
    }

    _addWatchBody() {
        this._bodyGroup = new THREE.Object3D();
        this.add(this._bodyGroup);

        const box = new THREE.BoxGeometry(6, 2, 5);

        const material = new THREE.MeshBasicMaterial({
            color: 0xfffffff,
            wireframe: false
        });

        const mesh = new THREE.Mesh(box, material);
        mesh.position.set(0, 0, 0);
        this._bodyGroup.add(mesh);
        addAxesHelper(mesh, 4);
    }

    _addScreen() {
        const box = new THREE.BoxGeometry(4, 1, 4);
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            wireframe: false
        });
        const mesh = new THREE.Mesh(box, material);
        mesh.position.set(0, 0.51, 0);
        this._bodyGroup.add(mesh);
        addAxesHelper(mesh, 2);
    }

    _addButton() {
        const box = new THREE.BoxGeometry(0.4, 0.2, 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: false
        });
        const mesh = new THREE.Mesh(box, material);
        mesh.position.set(2.5, 1.1, 0);
        this._bodyGroup.add(mesh);
        addAxesHelper(mesh, 1);
    }

    _addCameraLense() {
        const box = new THREE.CylinderGeometry(0.3, 0.3, 1, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x808080,
            wireframe: false
        });
        const mesh = new THREE.Mesh(box, material);
        mesh.position.set(-2.5, 0.501, 0);
        this._bodyGroup.add(mesh);
        addAxesHelper(mesh, 1);
    }
}

class RotorAssembly extends THREE.Group {
    constructor() {
        super();

        // Grupo do braço — tudo o que estende/recolhe roda junto
        this.armGroup = new THREE.Group();
        this.add(this.armGroup);

        // Grupo das hélices — para rodar continuamente
        this.propellerGroup = new THREE.Group();
        this.propellerGroup.position.set(3.5, 0.2, 0);
        this.armGroup.add(this.propellerGroup);

        this._addBase();
        this._addArm();
        this._addMotor();
        this._addFrame();
        this._addPropeller();
        this._addCollisionSphere();

        const axesHelper = new THREE.AxesHelper(4);
        axesHelper.visible = false;
        this.add(axesHelper);
        axesHelpers.push(axesHelper);
    }

    // Cilindro fixo nos cantos do relógio (pivot de rotação do braço)
    _addBase() {
        const cyl = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0x555555 });
        const mesh = new THREE.Mesh(cyl, material);
        this.add(mesh);
        addAxesHelper(mesh, 2);
    }

    // Braço que liga a base ao motor
    _addArm() {
        const box = new THREE.BoxGeometry(3.5, 0.6, 0.6);
        const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const mesh = new THREE.Mesh(box, material);
        mesh.position.set(1.75, -0.5, 0);
        this.armGroup.add(mesh);
        addAxesHelper(mesh, 2);
    }

    // Cilindro na ponta do braço (motor)
    _addMotor() {
        const cyl = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const mesh = new THREE.Mesh(cyl, material);
        mesh.position.set(3.5, -0.25, 0);
        this.armGroup.add(mesh);
        addAxesHelper(mesh, 1.5);
    }

    // Caixilharia (toro à volta do motor)
    _addFrame() {
        const toro = new THREE.TorusGeometry(2.22, 0.25, 8, 24);
        const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const mesh = new THREE.Mesh(toro, material);
        mesh.rotation.x = Math.PI / 2;
        mesh.scale.set(1, 1, 2);
        mesh.position.set(3.5, 0.1, 0);
        this.armGroup.add(mesh);
        addAxesHelper(mesh, 2);
    }

    // Hélice
    _addPropeller() {
        const box = new THREE.BoxGeometry(3, 0.2, 0.6);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(box, material);
        this.propellerGroup.add(mesh);
        addAxesHelper(mesh, 2);
    }

    _addCollisionSphere() {
        this.collisionSphere = new CollisionSphere(this.propellerGroup, 2.47, droneScale);
    }
}

class Balloon extends THREE.Group {
    constructor() {
        super();
        this._addBody();
        this._addKnot();
        this._addRibbon();
        this._addCollisionSphere();

        this.isPopping = false;

        const axesHelper = new THREE.AxesHelper(8);
        axesHelper.visible = false;
        this.add(axesHelper);
        axesHelpers.push(axesHelper);
        this.scale.set(ballonScale, ballonScale, ballonScale)
    }

    // Corpo do balão (esfera vermelha, low-poly)
    _addBody() {
        const sphere = new THREE.SphereGeometry(5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(sphere, material);
        mesh.position.set(0, 0, 0);
        this.add(mesh);
        addAxesHelper(mesh, 6);
    }

    // Nó na base do balão
    _addKnot() {
        const cone = new THREE.ConeGeometry(0.8, 1.5, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
        const mesh = new THREE.Mesh(cone, material);
        mesh.position.set(0, -5.5, 0);
        this.add(mesh);
        addAxesHelper(mesh, 2);
    }

    // Fita suspensa
    _addRibbon() {
        const cyl = new THREE.CylinderGeometry(0.05, 0.05, 10, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const mesh = new THREE.Mesh(cyl, material);
        mesh.position.set(0, -11, 0);
        this.add(mesh);
        addAxesHelper(mesh, 3);
    }

    _addCollisionSphere() {
        this.collisionSphere = new CollisionSphere(this, 5, ballonScale);
    }

    _pop() {
        this.position.y += 300;
        collisionAnimating = false;
    }
}

class CollisionSphere {
    constructor(parent, baseRadius, scale) {
        this.parent = parent;
        this.center = new THREE.Vector3();
        this.radius = baseRadius * scale;

        // Inicializar o centro com a posição global
        this.parent.getWorldPosition(this.center);

        // Visualização da esfera de colisão (wireframe)
        const geo = new THREE.SphereGeometry(baseRadius, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        this.debugMesh = new THREE.Mesh(geo, mat);
        this.debugMesh.visible = false;
        parent.add(this.debugMesh);
        collisionHelpers.push(this.debugMesh);
    }

    _updateCenter() {
        this.parent.getWorldPosition(this.center);
    }

    _intersects(other) {
        return this.center.distanceTo(other.center) <= this.radius + other.radius;
    }

    _scale(factor) {
        this.radius *= factor;
    }
}

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions() {
    for (let i = 0; i < balloons.length; i++) {
        for (let j = 0; j < 4; j++) {
            if (balloons[i].collisionSphere._intersects(droneWatch.rotors[j].collisionSphere)) {
                collisionAnimating = true;
                balloons[i].isPopping = true;
            }
        }
    }
}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() {
    for (let i = 0; i < balloons.length; i++) {
        if (balloons[i].isPopping) {
            balloons[i]._pop();
            balloons[i].isPopping = false;
        }
    }
}

////////////
/* UPDATE */
////////////
function update(dt) {
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

    if (droneWatch) {
        droneWatch.update(dt, pressed);
        for (let i = 0; i < 4; i++) {
            droneWatch.rotors[i].collisionSphere._updateCenter();
        }
    }

    for (let i = 0; i < balloons.length; i++) {
        balloons[i].collisionSphere._updateCenter();
    }

    checkCollisions();
    handleCollisions();
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
    window.addEventListener("keyup", onKeyUp);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    update(dt);
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
    if (collisionAnimating) return;
    switch (e.key.toLowerCase()) {
        case "1": pressed.camera_1 = true; break;
        case "2": pressed.camera_2 = true; break;
        case "3": pressed.camera_3 = true; break;
        case "4": pressed.camera_4 = true; break;
        case "5": pressed.camera_5 = true; break;
        case "h":
            showHelpers = !showHelpers;
            cameraHelpers.forEach(h => h.visible = showHelpers);
            axesHelpers.forEach(h => h.visible = showHelpers);
            break;
        case "c":
            showCollisionSpheres = !showCollisionSpheres;
            collisionHelpers.forEach(h => h.visible = showCollisionSpheres);
            break;
        case "q":
            if (droneWatch) droneWatch.toggleDeploy();
            break;
        case "a": pressed.moveLeft = true; break;
        case "d": pressed.moveRight = true; break;
        case "w": pressed.moveUp = true; break;
        case "s": pressed.moveDown = true; break;
        case "u": pressed.moveForward = true; break;
        case "j": pressed.moveBackward = true; break;
        case "i": pressed.yawLeft = true; break;
        case "k": pressed.yawRight = true; break;
        case "o": pressed.pitchDown = true; break;
        case "l": pressed.pitchUp = true; break;
    }
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {
    if (collisionAnimating) return;
    switch (e.key.toLowerCase()) {
        case "a": pressed.moveLeft = false; break;
        case "d": pressed.moveRight = false; break;
        case "w": pressed.moveUp = false; break;
        case "s": pressed.moveDown = false; break;
        case "u": pressed.moveForward = false; break;
        case "j": pressed.moveBackward = false; break;
        case "i": pressed.yawLeft = false; break;
        case "k": pressed.yawRight = false; break;
        case "o": pressed.pitchDown = false; break;
        case "l": pressed.pitchUp = false; break;
    }
}

init();
animate();