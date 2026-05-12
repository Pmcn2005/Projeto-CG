import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
const BACKGROUND = new THREE.Color(0x202020);


/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
    scene = new THREE.Scene();
    scene.background = BACKGROUND;
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////

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
function update() { }

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
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() { }

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() { }

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) { }

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) { }

init();
animate();