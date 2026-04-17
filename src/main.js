import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

import { buildAdminBlock } from './buildings/AdminBlock.js';
import { buildComputerCore } from './buildings/ComputerCore.js';
import { buildElectronicsCore } from './buildings/ElectronicsCore.js';
import { buildLibrary } from './buildings/Library.js';
import { buildCanteen } from './buildings/Canteen.js';

let camera, scene, renderer, controls;
let objects = []; 
let raycaster;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Reused temporaries to reduce per-frame allocations
const vehicleRaycaster = new THREE.Raycaster();
const tmpVehicleDir = new THREE.Vector3();
const tmpVehicleRayOrigin = new THREE.Vector3();
const tmpCameraDir = new THREE.Vector3();
const tmpCamVecX = new THREE.Vector3();
const tmpCamVecZ = new THREE.Vector3();
const tmpWorldVel = new THREE.Vector3();
const tmpWorldDir = new THREE.Vector3();
const tmpNormal = new THREE.Vector3();
const tmpNormalMatrix = new THREE.Matrix3();
const tmpDownDir = new THREE.Vector3(0, -1, 0);
const downRay = new THREE.Raycaster();
const wallRay = new THREE.Raycaster();

// State
let currentObjective = 0;
window.interactiveObjects = {};
let inDialogue = false;
let gateOpening = false;
let gateOpenAmount = 0;
let leftDoor, rightDoor;
const walkableFloors = []; // Track explicitly walkable multi-level surfaces

let mapCamera, mapRenderer, mapMarkerUI;
let guardWalkingActive = false;
let globalGuardMesh;

// Arrays for animated environment
const vehicles = [];

// UI UI Elements
const uiOverlay = document.getElementById('ui-overlay');
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const dialogueBox = document.getElementById('dialogue-box');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const actionBtn = document.getElementById('dialogue-btn-action');
const dialogueSpeaker = document.getElementById('dialogue-speaker');

function setDialogueSpeaker(name) {
    if (dialogueSpeaker) dialogueSpeaker.textContent = name;
}

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 400, 1900); // Expanded render distance

    // Realistic Lighting System
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.6); // Sun & Sky
    scene.add(hemiLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(200, 300, 150);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; 
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = -500;
    dirLight.shadow.camera.right = 500;
    dirLight.shadow.camera.top = 500;
    dirLight.shadow.camera.bottom = -500;
    scene.add(dirLight);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 16, 170); // Looking at the gate from the street

    controls = new PointerLockControls(camera, document.body);

    instructions.addEventListener('click', function () {
        if(!inDialogue) controls.lock();
    });

    controls.addEventListener('lock', function () {
        inDialogue = false;
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        dialogueBox.style.display = 'none';
        uiOverlay.style.display = 'block';
        updateObjectiveUI();
    });

    controls.addEventListener('unlock', function () {
        if (!inDialogue) {
            blocker.style.display = 'flex';
            instructions.style.display = 'block';
            uiOverlay.style.display = 'none';
        }
    });

    scene.add(camera);

    // Keyboard & Raycaster
    document.addEventListener('keydown', (e) => {
        if(inDialogue) return;
        switch (e.code) {
            case 'ArrowUp': case 'KeyW': moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': moveRight = true; break;
            case 'Space': if (canJump === true) velocity.y += 200; canJump = false; break;
        }
    });
    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'ArrowUp': case 'KeyW': moveForward = false; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
            case 'ArrowDown': case 'KeyS': moveBackward = false; break;
            case 'ArrowRight': case 'KeyD': moveRight = false; break;
        }
    });

    raycaster = new THREE.Raycaster();
    document.addEventListener('mousedown', onMouseClick);
    
    // Chat Actions
    chatInput.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        const msg = chatInput.value.trim();
        if (!msg) return;
        e.preventDefault();
        chatInput.value = '';
        addChatMessage(msg, 'player');
        processChatCommand(msg);
    });

    actionBtn.addEventListener('click', () => {
        if (currentObjective === 0) {
            addChatMessage('Let me check that...', 'npc');
            dialogueBox.style.display = 'none';
            guardWalkingActive = true;
            
            setTimeout(() => {
                dialogueBox.style.display = 'block';
                actionBtn.style.display = 'none';
                chatInput.style.display = 'none';
                addChatMessage('I have verified your ID. You may enter. Your classes are strictly held in the massive Block 6 deep inside the campus center.', 'npc');
                
                let oldDismiss = document.getElementById('temp-dismiss');
                if(oldDismiss) oldDismiss.remove();
                
                const dismissBtn = document.createElement('button');
                dismissBtn.id = 'temp-dismiss';
                dismissBtn.innerText = "Enter Campus";
                dismissBtn.style.padding = '10px';
                dismissBtn.style.background = '#4CAF50';
                dismissBtn.style.color = 'white';
                dismissBtn.style.border = 'none';
                dismissBtn.style.marginTop = '15px';
                dismissBtn.style.cursor = 'pointer';
                dismissBtn.style.width = '100%';
                dismissBtn.addEventListener('click', () => {
                     dialogueBox.style.display = 'none';
                     inDialogue = false;
                     controls.lock();
                     let d = document.getElementById('temp-dismiss'); if(d) d.remove();
                });
                chatLog.appendChild(dismissBtn);

                guardWalkingActive = false;
                gateOpening = true;
                currentObjective = 1;
                document.getElementById('minimap-container').style.display = 'block';
                updateObjectiveUI('Follow your Minimap to Block 6 (First Year Block) to mark attendance.');
            }, 3000);
        } else if (currentObjective === 1 && window.interactiveObjects.terminal) {
            // Check if player clicked attendance terminal!
            // Wait, this applies if the player interacts with the terminal specifically
        }
    });

    buildHyperRealisticWorld();

    // Secondary UI Renderer for Top-Down GTA Minimap
    const minimapCanvas = document.getElementById('minimap');
    mapRenderer = new THREE.WebGLRenderer({ canvas: minimapCanvas, antialias: true, alpha: true });
    mapRenderer.setSize(250, 250);
    mapCamera = new THREE.OrthographicCamera(-1000, 1000, 1000, -1000, 1, 3000);
    mapCamera.rotation.x = -Math.PI / 2; // Flat top-down
    mapMarkerUI = document.getElementById('minimap-marker');

    renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer realistic shadows
    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize);
    
    updateObjectiveUI();
}

function buildHyperRealisticWorld() {
    // 1. Terrain Grass (Inside & Outside)
    const floorGeo = new THREE.PlaneGeometry(4000, 4000, 50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d7b43, roughness: 0.9, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 2. The Great Road
    const roadZ = 120;
    const roadGeo = new THREE.PlaneGeometry(4000, 60);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }); // Asphalt
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.2, roadZ);
    road.receiveShadow = true;
    scene.add(road);
    
    // Median Lines
    for (let i = -2000; i < 2000; i += 40) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(20, 2), new THREE.MeshStandardMaterial({color: 0xffdd00}));
        line.rotation.x = -Math.PI / 2;
        line.position.set(i, 0.3, roadZ);
        scene.add(line);
    }

    // Outer Paths
    const pathGeo = new THREE.PlaneGeometry(80, 2400);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 }); // Concrete
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.1, -1000);
    path.receiveShadow = true;
    scene.add(path);

    // 3. CAMPUS BOUNDARY WALLS (Massively scaled up for Gigascale)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8B3A3A, roughness: 0.9 });
    const gateZ = 80;
    const boundsSize = 1200; // Giant Radius
    
    // Back Wall (Leaves a massive 300-unit wide gap for the Back Gate)
    const bWallL = new THREE.Mesh(new THREE.BoxGeometry(boundsSize - 150, 60, 10), wallMat);
    bWallL.position.set(-150 - (boundsSize-150)/2, 30, gateZ - boundsSize); bWallL.castShadow = true; scene.add(bWallL); objects.push(bWallL);
    
    const bWallR = new THREE.Mesh(new THREE.BoxGeometry(boundsSize - 150, 60, 10), wallMat);
    bWallR.position.set(150 + (boundsSize-150)/2, 30, gateZ - boundsSize); bWallR.castShadow = true; scene.add(bWallR); objects.push(bWallR);

    // 3.5 BACK GATE & DOORS (Triple width = 300 gaps, 120 Height)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.7 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
    const bPillarL = new THREE.Mesh(new THREE.BoxGeometry(20, 120, 20), stoneMat); bPillarL.position.set(-160, 60, gateZ - boundsSize); bPillarL.castShadow = true; scene.add(bPillarL); objects.push(bPillarL);
    const bPillarR = new THREE.Mesh(new THREE.BoxGeometry(20, 120, 20), stoneMat); bPillarR.position.set(160, 60, gateZ - boundsSize); bPillarR.castShadow = true; scene.add(bPillarR); objects.push(bPillarR);
    const bArch = new THREE.Mesh(new THREE.BoxGeometry(340, 15, 25), stoneMat); bArch.position.set(0, 126, gateZ - boundsSize); bArch.castShadow = true; scene.add(bArch);
    
    // BACK DOORS (Currently closed. Need ID scan to open).
    const bDL = new THREE.Mesh(new THREE.BoxGeometry(150, 115, 4), ironMat); bDL.position.set(-75, 57.5, gateZ - boundsSize); bDL.castShadow = true; scene.add(bDL); objects.push(bDL);
    const bDR = new THREE.Mesh(new THREE.BoxGeometry(150, 115, 4), ironMat); bDR.position.set(75, 57.5, gateZ - boundsSize); bDR.castShadow = true; scene.add(bDR); objects.push(bDR);
    // Left Wall
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(10, 60, boundsSize), wallMat);
    wallL.position.set(-boundsSize, 30, gateZ - (boundsSize/2)); wallL.castShadow = true; scene.add(wallL); objects.push(wallL);
    // Right Wall
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(10, 60, boundsSize), wallMat);
    wallR.position.set(boundsSize, 30, gateZ - (boundsSize/2)); wallR.castShadow = true; scene.add(wallR); objects.push(wallR);
    
    // Front Walls (Leaving 50 unit wide gap for main entrance to perfectly seal with pillars)
    const frontWallL = new THREE.Mesh(new THREE.BoxGeometry(boundsSize - 25, 60, 10), wallMat);
    frontWallL.position.set(-25 - (boundsSize-25)/2, 30, gateZ); frontWallL.castShadow = true; scene.add(frontWallL); objects.push(frontWallL);
    
    const frontWallR = new THREE.Mesh(new THREE.BoxGeometry(boundsSize - 25, 60, 10), wallMat);
    frontWallR.position.set(25 + (boundsSize-25)/2, 30, gateZ); frontWallR.castShadow = true; scene.add(frontWallR); objects.push(frontWallR);

    // 4. MAIN FRONT GATE & DOORS

    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(10, 80, 10), stoneMat); pillarL.position.set(-20, 40, gateZ); pillarL.castShadow = true; scene.add(pillarL); objects.push(pillarL);
    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(10, 80, 10), stoneMat); pillarR.position.set(20, 40, gateZ); pillarR.castShadow = true; scene.add(pillarR); objects.push(pillarR);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(50, 8, 12), stoneMat); arch.position.set(0, 84, gateZ); arch.castShadow = true; scene.add(arch);
    
    leftDoor = new THREE.Group(); leftDoor.position.set(-15, 0, gateZ);
    const lDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(14.5, 75, 2), ironMat); lDoorMesh.position.set(7.25, 37.5, 0); lDoorMesh.castShadow = true;
    leftDoor.add(lDoorMesh); scene.add(leftDoor); objects.push(lDoorMesh);
    
    rightDoor = new THREE.Group(); rightDoor.position.set(15, 0, gateZ);
    const rDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(14.5, 75, 2), ironMat); rDoorMesh.position.set(-7.25, 37.5, 0); rDoorMesh.castShadow = true;
    rightDoor.add(rDoorMesh); scene.add(rightDoor); objects.push(rDoorMesh);

    // 5. SECURITY BOOTH (Hollow)
    const cabinGrp = new THREE.Group(); cabinGrp.position.set(28, 0, gateZ + 15);
    const cabinMat = new THREE.MeshStandardMaterial({color: 0xf0f0f0, roughness: 0.5});
    const roof = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 16), cabinMat); roof.position.set(0, 25, 0); roof.castShadow = true; cabinGrp.add(roof);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(16, 24, 2), cabinMat); backWall.position.set(0, 12, 7); cabinGrp.add(backWall); backWall.castShadow = true;
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2, 24, 16), cabinMat); rightWall.position.set(7, 12, 0); cabinGrp.add(rightWall); rightWall.castShadow = true;
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(16, 24, 2), cabinMat); frontWall.position.set(0, 12, -7); cabinGrp.add(frontWall); frontWall.castShadow = true;
    
    const guardMesh = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 16), new THREE.MeshStandardMaterial({color: 0x000080})); 
    guardMesh.position.set(-2, 4, 0); guardMesh.castShadow = true;
    guardMesh.userData = { interactive: true, id: 'Guard' };
    cabinGrp.add(guardMesh); objects.push(guardMesh);
    globalGuardMesh = guardMesh;
    
    objects.push(backWall, rightWall, frontWall);
    scene.add(cabinGrp);

    // 5.5 BACK GATE SECURITY BOOTH
    const bCabinGrp = new THREE.Group(); bCabinGrp.position.set(180, 0, gateZ - boundsSize + 20);
    const bRoof = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 20), cabinMat); bRoof.position.set(0, 30, 0); bRoof.castShadow = true; bCabinGrp.add(bRoof);
    const bCWall = new THREE.Mesh(new THREE.BoxGeometry(20, 29, 2), cabinMat); bCWall.position.set(0, 14.5, 9); bCWall.castShadow = true; bCabinGrp.add(bCWall);
    
    const bGuard = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 16), new THREE.MeshStandardMaterial({color: 0x000080})); 
    bGuard.position.set(0, 4, 0); bGuard.castShadow = true;
    bGuard.userData = { interactive: true, id: 'BackGuard' };
    bCabinGrp.add(bGuard); objects.push(bGuard, bCWall);
    scene.add(bCabinGrp);

    // 6. PROCEDURAL CAMPUS BLOCKS (Scaled out to fit massive bounds)
    const blockColors = [0x555555, 0xAA4433, 0x334466, 0x667755];
    for(let i=1; i<=15; i++) {
        // Blocks 1 through 5 are generated dynamically by the mega-injection context.
        if (i <= 5) continue;
        const blkWidth = 80 + Math.random() * 80;
        const blkDepth = 80 + Math.random() * 80;
        const blkHeight = 150 + Math.random() * 200; 
        const px = -1000 + (Math.random() * 2000); 
        const pz = 50 - (Math.random() * 1100); 
        
        // Push procedural blocks strictly to the far edges to protect ALL inner campus pathways, registration desks, and custom architecture blocks
        if (Math.abs(px) < 800 && pz > -900) continue; 
        
        const bMat = new THREE.MeshStandardMaterial({ color: blockColors[i % blockColors.length], roughness: 0.8 });
        const block = new THREE.Mesh(new THREE.BoxGeometry(blkWidth, blkHeight, blkDepth), bMat);
        block.position.set(px, blkHeight/2, pz);
        block.castShadow = true; block.receiveShadow = true;
        scene.add(block);
        objects.push(block);
    }
    
    // Main Registration Desk
    const register = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 8), new THREE.MeshStandardMaterial({color:0x00ff00, emissive:0x006600}));
    register.position.set(0, 10, -100);
    register.castShadow = true;
    register.userData = { interactive: true, id: 'Register' };
    scene.add(register);
    objects.push(register);
    window.interactiveObjects.register = register;

    // 7. CITY SHOPS (Outside)
    for(let i=-3; i<=3; i++) {
        if(i === 0) continue; // Skip road entrance
        const shop = new THREE.Group();
        shop.position.set(i * 60, 0, roadZ + 40);
        
        const body = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 30), new THREE.MeshStandardMaterial({color: Math.random() * 0xffffff}));
        body.position.set(0, 10, 0); body.castShadow = true; shop.add(body);
        
        // Awnings
        const awning = new THREE.Mesh(new THREE.BoxGeometry(45, 2, 10), new THREE.MeshStandardMaterial({color: 0xffffff}));
        awning.position.set(0, 15, -15); awning.rotation.x = -0.3; awning.castShadow = true; shop.add(awning);
        
        scene.add(shop);
        objects.push(body);
    }

    // 8. ORGANIC TREES
    function createTree(x, z) {
        const tree = new THREE.Group();
        tree.position.set(x, 0, z);
        const trunkD = 2 + Math.random();
        const trunkH = 10 + Math.random() * 10;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkD, trunkD, trunkH, 8), new THREE.MeshStandardMaterial({color: 0x4a2e15, roughness:1}));
        trunk.position.y = trunkH/2; trunk.castShadow = true; tree.add(trunk);
        
        const leavesH = 15 + Math.random() * 10;
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(8 + Math.random()*4, leavesH, 7), new THREE.MeshStandardMaterial({color: 0x228b22, roughness: 1}));
        leaves.position.y = trunkH + (leavesH/2) - 4; leaves.castShadow = true; tree.add(leaves);
        
        scene.add(tree);
        objects.push(trunk);
    }
    // Scatter trees EXCLUSIVELY outside the campus (near the road and shops)
    for(let i=0; i<160; i++) {
        let tx = -1800 + Math.random() * 3600;
        let tz;
        if (Math.random() > 0.5) {
            // Far left and right of the campus entrance walls to prevent clipping gate geometry
            tx = tx > 0 ? 300 + Math.random()*1500 : -300 - Math.random()*1500;
            tz = 10 + Math.random() * 70; // 10 to 80 (before road)
        } else {
            // Squeezed safely between the city shops (Z=160) and outer slums (Z=250+) 
            tz = 180 + Math.random() * 60; // 180 to 240
        }
        createTree(tx, tz);
    }

    // 9. ANIMATED TRAFFIC (Scaled up cars)
    function createCar(zRow, speed, color) {
        const car = new THREE.Group();
        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(20, 9, 10), new THREE.MeshStandardMaterial({color: color, metalness: 0.5, roughness:0.2}));
        body.position.set(0, 6.5, 0); body.castShadow = true; car.add(body);
        objects.push(body); // Push to collision array
        // Cabin
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 8), new THREE.MeshStandardMaterial({color: 0x111111, metalness: 0.9, roughness:0.1}));
        cabin.position.set(-2, 15, 0); cabin.castShadow = true; car.add(cabin);
        // Tires
        const tr = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.9});
        const tGeo = new THREE.CylinderGeometry(2.5, 2.5, 2, 16);
        for(const pos of [[-6, 2.5, 5.5], [6, 2.5, 5.5], [-6, 2.5, -5.5], [6, 2.5, -5.5]]) {
            const tire = new THREE.Mesh(tGeo, tr); tire.rotation.x = Math.PI/2;
            tire.position.set(...pos); tire.castShadow = true; car.add(tire);
        }
        car.position.set(-2000 + Math.random()*4000, 0, zRow);
        car.userData = { speed: speed };
        scene.add(car);
        vehicles.push(car);
    }
    createCar(roadZ - 10, -50, 0xff0000); // Red car left
    createCar(roadZ - 10, -60, 0x0000ff); // Blue car left
    createCar(roadZ + 10, 50, 0x00ff00); // Green car right
    createCar(roadZ + 10, 70, 0xffaa00); // Yellow car right

    // 10. THE GREAT RIVER (Spanning horizontally behind campus)
    const riverGeo = new THREE.PlaneGeometry(6000, 300);
    const riverMat = new THREE.MeshStandardMaterial({ 
        color: 0x1ca3ec, metalness: 0.95, roughness: 0.05, 
        transparent: true, opacity: 0.85 
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.5, -2000); // Deep behind new campus bounds
    scene.add(river);

    // 11. FARMS & AGRICULTURAL BLOCKS
    for(let f=0; f<3; f++) {
        const farmX = -1200 + (f * 1200); 
        const farmZ = -1600;
        
        // Soil Patch
        const plot = new THREE.Mesh(new THREE.PlaneGeometry(800, 300), new THREE.MeshStandardMaterial({color: 0x4a3018, roughness: 0.9}));
        plot.rotation.x = -Math.PI / 2;
        plot.position.set(farmX, 0.4, farmZ);
        plot.receiveShadow = true;
        scene.add(plot);
        
        // Procedural Crops in uniform rows
        const cropColors = [0xffd700, 0x8b0000, 0xff8c00]; 
        const cCol = cropColors[f];
        for(let row=0; row<12; row++) {
            for(let col=0; col<30; col++) {
                const crop = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshStandardMaterial({color: cCol, roughness: 0.8}));
                crop.position.set(farmX - 350 + (col*23), 1.5, farmZ - 100 + (row*15));
                crop.castShadow = true;
                scene.add(crop);
            }
        }
    }

    // 12. DEEP FOREST BOUNDARY
    // Spawns 400 thick trees deeply on the horizon to form an endless organic border
    for(let i=0; i<400; i++) {
        createTree(-3000 + Math.random()*6000, -2200 - Math.random()*1200);
    }

    // 13. SLUM DISTRICT (Directly behind the outermost shops)
    const dirtGeo = new THREE.PlaneGeometry(3600, 600);
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x3b2b1a, roughness: 1, metalness: 0 });
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.set(0, 0.3, 450); 
    scene.add(dirt);

    const slumColors = [0x503020, 0x4a4a4a, 0x6e3c23, 0x3d3a33, 0x5a2a1a];
    for(let i=0; i<600; i++) {
        const sw = 10 + Math.random() * 20;
        const sh = 20 + Math.random() * 30; 
        const sd = 10 + Math.random() * 20;
        const col = slumColors[Math.floor(Math.random() * slumColors.length)];
        const shack = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), new THREE.MeshStandardMaterial({color: col, roughness: 0.9}));
        shack.position.set(-1600 + Math.random() * 3200, sh/2, 250 + Math.random() * 400);
        shack.castShadow = true; shack.receiveShadow = true;
        scene.add(shack);
    }

    // 14. OUTER RESIDENTIAL SPREAD
    const aptColors = [0xcccccc, 0xeeeeee, 0xb0c4de, 0xdedede];
    for(let col=-15; col<=15; col++) {
        for(let row=0; row<8; row++) {
            const hx = col * 120 + (Math.random() * 20);
            const hz = 800 + (row * 150) + (Math.random() * 20);
            
            // Randomly pick small house or tall apartment, massively scaled tall
            const isTall = Math.random() > 0.6;
            const hw = 30 + Math.random() * 20;
            const hd = 30 + Math.random() * 20;
            const hh = isTall ? 150 + Math.random() * 150 : 60 + Math.random() * 40;

            const resMat = new THREE.MeshStandardMaterial({color: aptColors[Math.floor(Math.random() * aptColors.length)], roughness: 0.6});
            const house = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), resMat);
            house.position.set(hx, hh/2, hz);
            house.castShadow = true; house.receiveShadow = true;
            scene.add(house);
            
            // Give them slightly overlapping smaller roofs to simulate detail
            const roof = new THREE.Mesh(new THREE.BoxGeometry(hw+2, 4, hd+2), new THREE.MeshStandardMaterial({color: 0x333333}));
            roof.position.set(hx, hh + 2, hz);
            scene.add(roof);
        }
    }

    // 15. GLOBAL STUDENT NPCs
    const stColors = [0xaa0000, 0x00aa00, 0x0000aa, 0xaaaa00, 0x555555, 0xff00ff];
    const dialogues = [
        "Hey, can you help me find the math block?",
        "I am so late for my test!",
        "This college is massive, my legs hurt.",
        "Did you do the homework?",
        "I'm just going to the cafe, see you later.",
        "That green register near the gate marks your attendance!"
    ];
    for(let i=0; i<150; i++) {
        // Spawn inside sprawling campus limits
        const px = -1100 + Math.random()*2200;
        const pz = 50 - Math.random()*1100;
        
        // Avoid spawning inside the immediate Gate pathway and massive Gigascale admin block footprint
        if(px > 50 && pz > -500 && pz < 100) continue; 
        if(Math.abs(px) < 100 && pz > 0) continue;

        const col = stColors[Math.floor(Math.random()*stColors.length)];
        const dia = dialogues[Math.floor(Math.random()*dialogues.length)];
        createNPC(px, 0, pz, "Student", dia, col);
    }
    
    // Massive phase 2 modular injections!
    const context = { objects, walkableFloors };
    
    scene.add(buildAdminBlock(context, createNPC));
    scene.add(buildComputerCore(context, createNPC));
    scene.add(buildElectronicsCore(context, createNPC));
    scene.add(buildLibrary(context, createNPC));
    scene.add(buildCanteen(context, createNPC));

    // Ensure Block 6 exists so the minimap/objective flow is achievable.
    buildFirstYearBlock();

    // Sync all geometric physical floors universally into the lateral rigid body crash pool
    walkableFloors.forEach(floor => {
        if (!objects.includes(floor)) objects.push(floor);
    });
} // Closes buildHyperRealisticWorld()

function buildFirstYearBlock() {
    const fGrp = new THREE.Group();
    // Vast structural block situated at the distant center axis of the campus limits
    fGrp.position.set(0, 0, -1400);
    scene.add(fGrp);

    const wallMat = new THREE.MeshStandardMaterial({color: 0xcccccc, roughness: 0.9});
    const floorMat = new THREE.MeshStandardMaterial({color: 0xaaaaaa, roughness: 0.8});

    // Massive Footprint
    const floor = new THREE.Mesh(new THREE.BoxGeometry(600, 2, 400), floorMat);
    floor.position.set(0, 0, 0); floor.receiveShadow = true; fGrp.add(floor); walkableFloors.push(floor);

    // Outer Walls (Heights = 60)
    const wB = new THREE.Mesh(new THREE.BoxGeometry(600, 60, 2), wallMat); wB.position.set(0, 30, -199); fGrp.add(wB); objects.push(wB);
    const wL = new THREE.Mesh(new THREE.BoxGeometry(2, 60, 400), wallMat); wL.position.set(-299, 30, 0); fGrp.add(wL); objects.push(wL);
    const wR = new THREE.Mesh(new THREE.BoxGeometry(2, 60, 400), wallMat); wR.position.set(299, 30, 0); fGrp.add(wR); objects.push(wR);
    
    // Front walls leaving massive glass gap
    const wF1 = new THREE.Mesh(new THREE.BoxGeometry(250, 60, 2), wallMat); wF1.position.set(-175, 30, 199); fGrp.add(wF1); objects.push(wF1);
    const wF2 = new THREE.Mesh(new THREE.BoxGeometry(250, 60, 2), wallMat); wF2.position.set(175, 30, 199); fGrp.add(wF2); objects.push(wF2);

    // Front Glass Entrance
    const glass = new THREE.Mesh(new THREE.BoxGeometry(100, 60, 2), new THREE.MeshStandardMaterial({color: 0xadd8e6, transparent: true, opacity: 0.4}));
    glass.position.set(0, 30, 199); fGrp.add(glass);

    // Classrooms Inside Block 6 (Partitioning it up into 4 deep halls)
    for(let xP = -150; xP <= 150; xP += 150) {
        if(xP !== 0) { // Don't block middle hallway
            const part = new THREE.Mesh(new THREE.BoxGeometry(2, 60, 300), wallMat);
            part.position.set(xP, 30, -50); fGrp.add(part); objects.push(part);
        }
    }

    // Freshman Attendance Terminal at deepest center
    const terminalGeo = new THREE.BoxGeometry(8, 25, 8);
    const terminalMat = new THREE.MeshStandardMaterial({color: 0x0055ff, emissive: 0x001155});
    const terminal = new THREE.Mesh(terminalGeo, terminalMat);
    terminal.position.set(0, 12.5, -150);
    terminal.userData = { interactive: true, id: 'Attendance Terminal' };
    fGrp.add(terminal); objects.push(terminal);
    window.interactiveObjects.terminal = terminal;

    // A roaming professor in the 1st Year block
    createNPC(0, 0, -80, "Head of Academics", "Welcome to Block 6. Please register your attendance at the glowing blue terminal before exploring the rest of your engineering domains.", 0xffffff);

    // The Massive Playground Behind First Year Block
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(1600, 800), new THREE.MeshStandardMaterial({color: 0x228B22}));
    grass.rotation.x = -Math.PI/2;
    grass.position.set(0, 0.5, -600);
    grass.receiveShadow = true; fGrp.add(grass);
}

function createNPC(x, y, z, role, dialog, colorHex) {
    const npcGrp = new THREE.Group();
    npcGrp.position.set(x, y, z);
    
    // Body (Cylinder)
    const bodyGeo = new THREE.CylinderGeometry(2.5, 2.5, 9, 16);
    const bodyMat = new THREE.MeshStandardMaterial({color: colorHex, roughness: 0.8});
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 4.5;
    body.castShadow = true; npcGrp.add(body);
    
    // Head (Sphere)
    const headGeo = new THREE.SphereGeometry(2.2, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({color: 0xffdcb1, roughness: 0.5});
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 10.5;
    head.castShadow = true; npcGrp.add(head);

    // Hitbox for raycaster
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(7, 14, 7), new THREE.MeshBasicMaterial({visible: false}));
    hitbox.position.y = 7;
    hitbox.userData = { interactive: true, id: role, dialog: dialog };
    npcGrp.add(hitbox); objects.push(hitbox);

    scene.add(npcGrp);
}

// Modular architecture block.

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
    if (!controls.isLocked) return;
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
        if (intersects[0].distance < 40) {
            const object = intersects[0].object;
            if (object.userData && object.userData.interactive) {
                triggerInteraction(object.userData.id, object);
            }
        }
    }
}

function triggerInteraction(id, object) {
    if (id === 'Guard' && currentObjective === 0) {
        setDialogueSpeaker('Officer Miller');
        inDialogue = true;
        controls.unlock();
        instructions.style.display = 'none';
        blocker.style.display = 'block';
        blocker.style.backgroundColor = 'rgba(0,0,0,0.4)';
        uiOverlay.style.display = 'none';
        
        dialogueBox.style.display = 'block';
        chatLog.innerHTML = '<div class="chat-msg npc-msg">Halt! You can\'t just walk into the campus. State your business or show your ID using the button above. You can also ask me questions.</div>';
        chatInput.style.display = 'block';
        actionBtn.style.display = 'block';
        actionBtn.innerText = "Show ID & Enter";
        chatInput.focus();
    } 
    else if (id === 'BackGuard') {
        setDialogueSpeaker('Back Gate Officer');
        inDialogue = true;
        controls.unlock();
        instructions.style.display = 'none';
        blocker.style.display = 'block';
        blocker.style.backgroundColor = 'rgba(0,0,0,0.4)';
        uiOverlay.style.display = 'none';
        
        dialogueBox.style.display = 'block';
        chatLog.innerHTML = '<div class="chat-msg npc-msg">This is the rear exit. Scanning required before opening the colossal back gate. Do you have your exit pass?</div>';
        chatInput.style.display = 'block';
        actionBtn.style.display = 'block';
        actionBtn.innerText = "Scan ID to Exit";
        chatInput.focus();
    }
    else if (id === 'Register' && currentObjective === 1) {
        setDialogueSpeaker('Campus System');
        // Keep the storyline consistent: attendance is marked at Block 6 terminal, not at the gate.
        if (window.interactiveObjects.register) {
            window.interactiveObjects.register.material.color.setHex(0x0000ff);
            window.interactiveObjects.register.material.emissive.setHex(0x000088);
        }
        inDialogue = true;
        controls.unlock();
        instructions.style.display = 'none';
        blocker.style.display = 'block';
        blocker.style.backgroundColor = 'rgba(0,0,0,0.1)';
        uiOverlay.style.display = 'none';

        dialogueBox.style.display = 'block';
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>Campus System:</strong> Gate entry verified. Proceed to Block 6 and use the Attendance Terminal to mark attendance.</div>`;
        chatInput.style.display = 'none';
        actionBtn.style.display = 'none';

        let oldDismiss = document.getElementById('temp-dismiss');
        if(oldDismiss) oldDismiss.remove();
        const dismissBtn = document.createElement('button');
        dismissBtn.id = 'temp-dismiss';
        dismissBtn.textContent = 'Continue';
        dismissBtn.onclick = () => {
            dialogueBox.style.display = 'none';
            inDialogue = false;
            controls.lock();
            let d = document.getElementById('temp-dismiss'); if(d) d.remove();
        };
        chatLog.appendChild(dismissBtn);

        updateObjectiveUI('Follow your Minimap to Block 6 (First Year Block) to mark attendance.');
    }
    else if (id === 'Attendance Terminal' && currentObjective === 1) {
        setDialogueSpeaker('Campus System');
        currentObjective = 2; // FREE-ROAM UNLOCKED
        if(window.interactiveObjects.terminal) {
            window.interactiveObjects.terminal.material.color.setHex(0x00ff00);
            window.interactiveObjects.terminal.material.emissive.setHex(0x008800);
        }
        
        inDialogue = true;
        controls.unlock();
        instructions.style.display = 'none';
        blocker.style.display = 'block';
        blocker.style.backgroundColor = 'rgba(0,0,0,0.1)'; 
        dialogueBox.style.display = 'block';
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>Campus System:</strong> Attendance successfully marked! You are now free to explore the campus and locate your first academic challenge!</div>`;
        actionBtn.style.display = 'none';
        chatInput.style.display = 'none';
        
        let oldDismiss = document.getElementById('temp-dismiss');
        if(oldDismiss) oldDismiss.remove();
        const dismissBtn = document.createElement('button');
        dismissBtn.id = 'temp-dismiss';
        dismissBtn.textContent = 'Explore Campus';
        dismissBtn.onclick = () => {
            dialogueBox.style.display = 'none';
            controls.lock();
            let d = document.getElementById('temp-dismiss'); if(d) d.remove();
        };
        dialogueBox.appendChild(dismissBtn);

        updateObjectiveUI('GTA Open World: Explore the detailed academic universe. Look for roaming faculty to begin your missions.');
    }
    else if (object && object.userData && object.userData.dialog) {
        setDialogueSpeaker(id);
        // Any general NPC interaction popup
        inDialogue = true;
        controls.unlock();
        instructions.style.display = 'none';
        blocker.style.display = 'block';
        blocker.style.backgroundColor = 'rgba(0,0,0,0.1)'; 
        uiOverlay.style.display = 'none';
        
        dialogueBox.style.display = 'block';
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>${id}:</strong> ${object.userData.dialog}</div>`;
        
        chatInput.style.display = 'none';
        actionBtn.style.display = 'none';
        
        // Add robust dismiss button exclusively for simple NPC chat
        let oldDismiss = document.getElementById('temp-dismiss');
        if(oldDismiss) oldDismiss.remove();
        
        const dismissBtn = document.createElement('button');
        dismissBtn.id = 'temp-dismiss';
        dismissBtn.innerText = "Continue (+)";
        dismissBtn.style.padding = '10px';
        dismissBtn.style.background = '#4CAF50';
        dismissBtn.style.color = 'white';
        dismissBtn.style.border = 'none';
        dismissBtn.style.marginTop = '15px';
        dismissBtn.style.cursor = 'pointer';
        dismissBtn.style.width = '100%';
        dismissBtn.addEventListener('click', () => {
             dialogueBox.style.display = 'none';
             inDialogue = false;
             controls.lock();
        });
        chatLog.appendChild(dismissBtn);
    }
}

function addChatMessage(msg, sender) {
    const p = document.createElement('div');
    p.classList.add('chat-msg');
    p.classList.add(sender === 'player' ? 'player-msg' : 'npc-msg');
    p.innerText = msg;
    chatLog.appendChild(p);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function processChatCommand(msg) {
    const text = msg.toLowerCase();
    
    setTimeout(() => {
        if (text.includes("name") || text.includes("who are you")) {
            addChatMessage("I am Officer Miller, head of security at this College.", 'npc');
        } 
        else if (text.includes("where") || text.includes("class") || text.includes("building") || text.includes("register") || text.includes("block")) {
            addChatMessage("The buildings behind me are Block 1 through 15. Your attendance register is straight down the main path.", 'npc');
        } 
        else if (text.includes("rule") || text.includes("policy") || text.includes("weapon") || text.includes("gta")) {
            addChatMessage("This isn't an action movie. The rules here are strict: go to class, learn, and respect the campus grounds.", 'npc');
        } 
        else if (text.includes("open") || text.includes("gate") || text.includes("id")) {
            addChatMessage("If you're a new student, use the green 'Show ID & Enter' button in the top right of this chat to verify yourself in our system.", 'npc');
        }
        else if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
            addChatMessage("Hello. State your business.", 'npc');
        }
        else {
            addChatMessage("I don't understand. Stick to business: either show your ID or ask for directions.", 'npc');
        }
    }, 600);
}

function updateObjectiveUI(customText) {
    const objText = document.getElementById('objective-text');
    if (!objText) return;
    
    if (customText) {
        objText.innerHTML = "<strong>OBJECTIVE:</strong> " + customText;
    } else if (currentObjective === 0) {
        objText.innerHTML = "<strong>OBJECTIVE:</strong> Walk to the Security Booth and present your ID.";
    } else if (currentObjective === 1) {
        objText.innerHTML = "<strong>OBJECTIVE:</strong> Follow your Minimap to Block 6 (First Year Block) and use the Attendance Terminal.";
    } else if (currentObjective === 2) {
        objText.innerHTML = "<strong>ATTENDANCE MARKED!</strong> Welcome to college. Free roam activated.";
    }
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    let delta = (time - prevTime) / 1000;
    if (delta > 0.1) delta = 0.1; 

    // Handle gate animation
    if (gateOpening && leftDoor && rightDoor) {
        if (gateOpenAmount < Math.PI / 2) {
            gateOpenAmount += 0.5 * delta; // Smoothed animation based on delta
            leftDoor.rotation.y = gateOpenAmount; 
            rightDoor.rotation.y = -gateOpenAmount; 
        }
    }

    // Vehicle Traffic
    vehicles.forEach(car => {
        const speed = car.userData.speed;
        tmpVehicleDir.set(speed > 0 ? 1 : -1, 0, 0);
        
        // Ray origin slightly ahead of the car body to avoid self-intersection
        tmpVehicleRayOrigin.set(car.position.x + (speed > 0 ? 11 : -11), 6.5, car.position.z);
        vehicleRaycaster.set(tmpVehicleRayOrigin, tmpVehicleDir);
        
        // Check for static environment objects (NPCs, Trees, other Cars)
        let hitDist = 15; // Stop if obstacle is within 15 units
        let stopped = false;
        
        // Call intersectObjects carefully on objects array. The body of 'this' car was avoided via ray offset.
        const hits = vehicleRaycaster.intersectObjects(objects, false);
        if (hits.length > 0 && hits[0].distance < hitDist) {
            stopped = true;
        }

        // Explicit Player Raycast Check (Player geometry is dynamically bound to camera without an object mesh)
        const diffX = camera.position.x - tmpVehicleRayOrigin.x;
        const diffZ = camera.position.z - tmpVehicleRayOrigin.z;
        if (Math.abs(diffZ) < 8) { // If player is in same lane
            if ((speed > 0 && diffX > 0 && diffX < hitDist + 5) || 
                (speed < 0 && diffX < 0 && diffX > -(hitDist + 5))) {
                stopped = true;
            }
        }
        
        if (!stopped) {
            car.position.x += speed * delta;
        }
        
        if(speed > 0 && car.position.x > 500) car.position.x = -500;
        if(speed < 0 && car.position.x < -500) car.position.x = 500;
    });

    if (controls.isLocked === true) {
        let playerPos = camera.position;
        
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 300.0 * delta; // Heavy Newton Gravity applied instantly

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

        // Apply raw vertical physics before calculating rigid body floor collision! (Fixes vibration loop)
        playerPos.y += (velocity.y * delta);

        // ---- ADVANCED DOWNWARD FLOORS PHYSICS ----
        let floorY = 16; 
        tmpVehicleRayOrigin.set(playerPos.x, playerPos.y, playerPos.z);
        // Cast a downward ray to catch slopes underneath
        downRay.set(tmpVehicleRayOrigin, tmpDownDir);
        downRay.near = 0;
        downRay.far = 30;
        if(walkableFloors.length > 0) {
            const hits = downRay.intersectObjects(walkableFloors, false);
            if (hits.length > 0) {
                // If within distance of the floor, lock to it (fixes jumping off stairs)
                if (hits[0].distance < 20) {
                    floorY = hits[0].point.y + 16;
                }
            }
        }

        // Snap to stairs if walking down
        if (playerPos.y <= floorY + 1.5) {
            velocity.y = Math.max(0, velocity.y);
            playerPos.y = floorY;
            canJump = true;
        }

        // ---- HORIZONTAL WALL COLLISION (VECTOR SLIDING) ----
        let speedX = -velocity.x * delta;
        let speedZ = -velocity.z * delta;
        
        if (Math.abs(speedX) > 0 || Math.abs(speedZ) > 0) {
            // Extract true world vectors based on Camera rotation (PointerLockControls inner mechanics)
            tmpCamVecX.setFromMatrixColumn(camera.matrix, 0).normalize();
            tmpCamVecZ.crossVectors(camera.up, tmpCamVecX).normalize();
            
            // Map the WASD pure speeds into the actual physical world velocity
            tmpWorldVel.set(0, 0, 0);
            tmpWorldVel.addScaledVector(tmpCamVecX, speedX);
            tmpWorldVel.addScaledVector(tmpCamVecZ, speedZ);

            if (tmpWorldVel.length() > 0) {
                tmpWorldDir.copy(tmpWorldVel).normalize();
                wallRay.set(playerPos, tmpWorldDir);
                wallRay.near = 0;
                wallRay.far = 5;
                const wallHits = wallRay.intersectObjects(objects, false);
                
                if (wallHits.length > 0) {
                    const hit = wallHits[0];
                    if (hit.face) {
                        // Adjust wall face projection by the object's relative mesh rotation!
                        tmpNormal.copy(hit.face.normal);
                        tmpNormalMatrix.getNormalMatrix(hit.object.matrixWorld);
                        tmpNormal.applyMatrix3(tmpNormalMatrix).normalize();
                        
                        const dot = tmpWorldVel.dot(tmpNormal);
                        
                        // We only shave off momentum clipping INTO the wall, allowing pure lateral coasting!
                        if (dot < 0) {
                            tmpWorldVel.sub(tmpNormal.multiplyScalar(dot));
                            // Map the corrected world velocity back into the local raw values for PointerLock movement!
                            speedX = tmpWorldVel.dot(tmpCamVecX);
                            speedZ = tmpWorldVel.dot(tmpCamVecZ);
                        }
                    } else {
                        // Dead stop if the math fails
                        speedX = 0; speedZ = 0;
                    }
                }
            }
        }

        controls.moveRight(speedX);
        controls.moveForward(speedZ);
        
        if (window.interactiveObjects.register) {
           window.interactiveObjects.register.rotation.y = time * 0.001;
           window.interactiveObjects.register.position.y = 3 + Math.sin(time * 0.002);
        }
        if (window.interactiveObjects.terminal) {
            window.interactiveObjects.terminal.rotation.y = time * 0.002;
        }

        if (guardWalkingActive && globalGuardMesh) {
            globalGuardMesh.position.z -= 15 * delta;
        }

        // Draw Map UI last over scene if active
        if (currentObjective >= 1 && mapCamera && mapRenderer) {
            mapCamera.position.set(camera.position.x, 800, camera.position.z);
            mapRenderer.render(scene, mapCamera);

            // Compute compass heading relative to player camera view direction
            camera.getWorldDirection(tmpCameraDir);
            const angle = Math.atan2(tmpCameraDir.x, tmpCameraDir.z);
            const rotDeg = angle * (180 / Math.PI) + 180;
            mapMarkerUI.style.transform = `translate(-50%, -50%) rotate(${rotDeg}deg)`;
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}
