import React, { useEffect } from "react";
import * as THREE from "./utils/three.module";
import { CameraUtils } from "./utils/CameraUtils";
import { OrbitControls } from "./OrbitControls";
import "@mediapipe/pose";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { FBXLoader } from "./utils/FBXLoader";
import { image } from "@tensorflow/tfjs-core";

/*
Credit for 3d model: "Palm Plant" (https://skfb.ly/6VsxQ) by SomeKevin is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
*/

const HOST =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://interactive-frame.netlify.app";

let camera, scene, renderer;
let cameraControls;
let bottomLeftCorner, bottomRightCorner, topLeftCorner;
let detector;

let plant;
let defaultVideoWidth = 640;

let planeGeo;
let texture;
let backwallImageField;
let frontwallImageField;
let planeTop;
let planeBottom;
let frontImageSurface;
let backImageSurface;
let planeRight;
let mainLight;
let planeLeft;
let color;
let intensity;
let directionalLight;
let Dlight;
let light;
let container;
let singleImageField;
let singleImageMountain;
let transparentImage;

let frontImageSurfaceMaterial;
let backImageSurfaceMaterial;


/* Detect if device is a touch screen or not */
let touchscreen = "ontouchstart" in window ? true : false;

const setupCamera = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available"
    );
  }

  const video = document.getElementById("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
    },
  });
  video.srcObject = stream;

  return new Promise(
    (resolve) => (video.onloadedmetadata = () => resolve(video))
  );
};

const setup = async () => {
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet
  );
  const video = await setupCamera();
  video.play();
  return video;
};

async function init() {
  container = document.getElementById("container");

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true;
  renderer.shadowMapSoft = true;

  // scene
  scene = new THREE.Scene();

  // camera
  planeGeo = new THREE.PlaneGeometry(100.1, 100.1);

  camera = new THREE.PerspectiveCamera(                        
    45,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.set(0, 50, 100);
  scene.add(camera);

  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 40, 0);
  cameraControls.maxDistance = 400;
  cameraControls.minDistance = 10;
  cameraControls.dispose();
  cameraControls.update();

  bottomLeftCorner = new THREE.Vector3();
  bottomRightCorner = new THREE.Vector3();
  topLeftCorner = new THREE.Vector3();

  if (touchscreen) {
    bottomRightCorner.set(50.0, -0.0, -20.0);
    bottomLeftCorner.set(-50.0, -0.0, -20.0);
    topLeftCorner.set(-50.0, 100.0, -20.0);
  } else {
    bottomRightCorner.set(50.0, -0.0, -30.0);
    bottomLeftCorner.set(-50.0, -0.0, -30.0);
    topLeftCorner.set(-50.0, 100.0, -30.0);
  }



  // texture for frame
  texture = new THREE.TextureLoader().load(
    `${HOST}/white-wall-texture.jpeg`
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  // field single
  singleImageField = new THREE.TextureLoader().load(`${HOST}/whideField.jpeg`);
  singleImageField.wrapS = THREE.RepeatWrapping;
  singleImageField.wrapT = THREE.RepeatWrapping;

  // mountain single
  singleImageMountain = new THREE.TextureLoader().load(`${HOST}/mountains.jpg`);
  singleImageMountain.wrapS = THREE.RepeatWrapping;
  singleImageMountain.wrapT = THREE.RepeatWrapping;

  // backwall field split background
  backwallImageField = new THREE.TextureLoader().load(`${HOST}/whideFieldBackground.jpg`);
  backwallImageField.wrapS = THREE.RepeatWrapping;
  backwallImageField.wrapT = THREE.RepeatWrapping;

  // frontwall field split foregrounds
  frontwallImageField = new THREE.TextureLoader().load(`${HOST}/whideFieldForegroundTransparentBG.png`);
  frontwallImageField.wrapS = THREE.RepeatWrapping;
  frontwallImageField.dwrapT = THREE.RepeatWrapping;


  // backwall mountain split background


  // frontwall mountain split foreground


  // middlelayer mountain split


  // transparent image
  transparentImage = new THREE.TextureLoader().load(`${HOST}/transparent.png`);
  transparentImage.wrapS = THREE.RepeatWrapping;
  transparentImage.dwrapT = THREE.RepeatWrapping;



  // upperwall
  planeTop = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0xffffff, map: texture })
  );
  planeTop.position.y = 100;
  planeTop.rotateX(Math.PI / 2);
  planeTop.receiveShadow = true;
  scene.add(planeTop);

  // bottomwall
  planeBottom = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0xffffff, map: texture })
  );
  planeBottom.rotateX(-Math.PI / 2);
  planeBottom.receiveShadow = true;
  scene.add(planeBottom);





  // frontwall - frontlayer of split image comes here
  frontImageSurface = new THREE.Mesh(
    planeGeo,
    frontImageSurfaceMaterial = new THREE.MeshPhongMaterial({map: frontwallImageField, transparent: true, alphaTest: 0.5}) // options needed to allow transparency of the cut parts on the foreground
  );
  frontImageSurface.position.z = -15;
  frontImageSurface.position.y = 53;
  // frontImageSurface.rotateY(Math.PI);
  frontImageSurface.receiveShadow = true;
  scene.add(frontImageSurface);

  // backwall - backlayer of split image or single image comes here
  backImageSurface = new THREE.Mesh(
    planeGeo,
    backImageSurfaceMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, map: backwallImageField })
  );
  backImageSurface.position.z = -20;
  backImageSurface.position.y = 50;
  // backImageSurface.rotateY(Math.PI);
  backImageSurface.receiveShadow = true;
  scene.add(backImageSurface);






  // rightwall
  planeRight = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0xffffff, map: texture })
  );
  planeRight.position.x = 50;
  planeRight.position.y = 50;
  planeRight.receiveShadow = true;
  planeRight.rotateY(-Math.PI / 2);
  scene.add(planeRight);

  // leftwall
  planeLeft = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0xffffff, map: texture })
  );
  planeLeft.position.x = -50;
  planeLeft.position.y = 50;
  planeLeft.receiveShadow = true;
  planeLeft.rotateY(Math.PI / 2);
  scene.add(planeLeft);

  // lights
  mainLight = new THREE.PointLight(0xffffff, 1, 250);
  mainLight.position.y = 50;
  mainLight.position.z = 10;
  // scene.add(mainLight);

  color = 0xffffff;
  // const color = 0xdfebff;
  // const intensity = 1;
  intensity = 1;
  directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(0, 60, 0);
  // directionalLight.position.set(100, 100, 50);
  directionalLight.castShadow = true;
  // directionalLight.target.position.set(0, 20, -40);
  // scene.add(directionalLight);
  // scene.add(directionalLight.target);

  Dlight = new THREE.DirectionalLight(0x404040, 1);
  Dlight.position.set(100, 120, 300);
  Dlight.castShadow = true;
  Dlight.shadow.camera.top = 200;
  Dlight.shadow.camera.bottom = -200;
  Dlight.shadow.camera.right = 200;
  Dlight.shadow.camera.left = -200;
  Dlight.shadow.mapSize.set(4096, 4096);
  scene.add(Dlight);

  light = new THREE.AmbientLight(0xffffff, 0.8); // soft white light
  light.position.set(0, 0, 300);
  scene.add(light);

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousemove", onDocumentMouseMove, false);

  // add listeners for keyboard input
  document.addEventListener("keypress", onKeyboardInput, false);
}

function changeSetup(setup) {
  console.log("SETUP ", setup, " SELECTED");
}

function setScene(newSetup, /*prevSetup*/) {
  // clearSurfaces(prevSetup);
  if(newSetup === "fieldSingle") {
    frontImageSurfaceMaterial.map = transparentImage;
    backImageSurfaceMaterial.map = singleImageField;
    // backImageSurface.position.z = -20;

  } else if(newSetup === "fieldMultiple") {
    frontImageSurfaceMaterial.map = frontwallImageField;
    backImageSurfaceMaterial.map = backwallImageField;
  } else if(newSetup === "mountainsSingle") {
    frontImageSurfaceMaterial.map = transparentImage;
    backImageSurfaceMaterial.map = singleImageMountain;
    // backImageSurface.position.z = -20;

  } else if(newSetup === "mountainsMultiple") {
    // set mountainsMultiple
  }
}

function onDocumentMouseMove(event) {
  // Manually fire the event in OrbitControls
  cameraControls.handleMouseMoveRotate(event);
}

function onKeyboardInput(event) {
  handleKeyboardInput(event);
}

// controll how sensitive the camera reacts in two steps
function setSensitivity(sensitivity) {
  if(sensitivity === "soft") {
    // set small motions for camera
  } else if(sensitivity === "hard") {
    // set large motions for camera
  }
}

// define what should be done when keys 1 - 8 are pressed. handler for face movement in orbitControls (handleFaceMoveRotate())
function handleKeyboardInput(event) {
  if(event.key === "1") {
    console.log("fieldSingle - soft");
    setScene("fieldSingle");
    setSensitivity("soft");
  } else if(event.key === "2") {
    console.log("fieldMultiple - soft");
    setScene("fieldMultiple");
    setSensitivity("soft");
  } else if(event.key === "3") {
    console.log("field single - hard");
    setScene("fieldSingle");
    setSensitivity("hard");
  } else if(event.key === "4") {
    console.log("field multiple - hard");
    setScene("fieldMultiple");
    setSensitivity("hard");
  // } else if(event.key === "5") {
  //   console.log("5 PRESSED");
  // } else if(event.key === "6") {
  //   console.log("6 PRESSED");
  // } else if(event.key === "7") {
  //   console.log("7 PRESSED");
  // } else if(event.key === "8") {
  //   console.log("8 PRESSED");
  }
}

// clearing the walls for changing the setup
function clearSurfaces(prevSetup) {
  if(prevSetup === "fieldSingle") {
    // remove fieldSingle
  } else if(prevSetup === "fieldMultiple") {
    // remove fieldMultiple
  } else if(prevSetup === "mountainsSingle") {
    // remove mountainsSingle
  } else if(prevSetup === "mountainsMultiple") {
    // remove mountainsMultiple
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onFaceMove(faceX, leftEyeYPosition) {
  // Manually fire the event in OrbitControls
  cameraControls.handleFaceMoveRotate(faceX, leftEyeYPosition);
}

function scaleValue(value, from, to) {
  var scale = (to[1] - to[0]) / (from[1] - from[0]);
  var capped = Math.min(from[1], Math.max(from[0], value)) - from[0];

  return ~~(capped * scale + to[0]);
}

function getFaceCoordinates(poses) {
  const leftEye = poses[0]?.keypoints.filter(
    (keypoint) => keypoint.name === "left_eye"
  )[0];
  const rightEye = poses[0]?.keypoints.filter(
    (keypoint) => keypoint.name === "right_eye"
  )[0];

  /* 
    The coordinates for the eyes will be based on the default size of the video element (640x480).
    We need to do some calculation to make it match the window size instead
  */

  if (leftEye.score > 0.7) {
    let scaledLeftEyeXCoordinate = scaleValue(
      leftEye.x,
      [0, defaultVideoWidth],
      [0, window.innerWidth]
    );

    let scaledRightEyeXCoordinate = scaleValue(
      rightEye.x,
      [0, defaultVideoWidth],
      [0, window.innerWidth]
    );

    const leftEyePosition = window.innerWidth - scaledLeftEyeXCoordinate;
    // const rightEyePosition = window.innerWidth - scaledRightEyeXCoordinate;
    const leftEyeYPosition = leftEye.y;

    // const middleEyes = leftEyePosition - rightEyePosition / 2;

    // onFaceMove(middleEyes, leftEyeYPosition);
    onFaceMove(leftEyePosition, leftEyeYPosition);
  }
}

async function animate() {
  requestAnimationFrame(animate);

  const poses = await detector?.estimatePoses(video);
  getFaceCoordinates(poses);

  // set the projection matrix to encompass the portal's frame
  CameraUtils.frameCorners(
    camera,
    bottomLeftCorner,
    bottomRightCorner,
    topLeftCorner,
    false
  );

  renderer.render(scene, camera);
}

const App = () => {
  useEffect(async () => {
    init();
    await setup();
    animate();
  }, []);
  return <></>;
};

export default App;
