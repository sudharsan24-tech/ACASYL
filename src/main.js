import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

import { buildAdminBlock } from './buildings/AdminBlock.js';
import { buildComputerCore } from './buildings/ComputerCore.js';
import { buildElectronicsCore } from './buildings/ElectronicsCore.js';
import { buildLibrary } from './buildings/Library.js';
import { buildCanteen } from './buildings/Canteen.js';
import { buildAcademicBlock } from './buildings/AcademicBlock.js';
import { addCollisionBox, addDoorSet, addWalkableBox, createStaircase, furnishClassroom } from './buildings/buildingUtils.js';

let camera, scene, renderer, controls;
let objects = []; 
let raycaster;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// World/minimap tuning (keep these in sync so the minimap matches reachable space)
const CAMPUS_BOUNDS_SIZE = 2200;
const MAP_EXTENT = 2200;
const PLAYER_HEIGHT = 16;
const PLAYER_RADIUS = 8;
const COLLISION_CHECK_DISTANCE = 14;

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
const tmpSideDir = new THREE.Vector3();
const tmpProbeOrigin = new THREE.Vector3();
const tmpSizeVec2 = new THREE.Vector2();
const tmpScreenPos = new THREE.Vector3();
const tmpHoverWorldPos = new THREE.Vector3();
const tmpObjectiveWorldPos = new THREE.Vector3();
const downRay = new THREE.Raycaster();
const wallRay = new THREE.Raycaster();
const hoverRay = new THREE.Raycaster();

// State
let currentObjective = 0;
window.interactiveObjects = {};
let inDialogue = false;
let activeDialogueId = null;
let gateOpening = false;
let gateOpenAmount = 0;
let leftDoor, rightDoor;
let backGateOpening = false;
let backGateOpenAmount = 0;
let backDoorLeftMesh, backDoorRightMesh;
const walkableFloors = []; // Track explicitly walkable multi-level surfaces

let mapCamera, mapRenderer, mapMarkerUI;
let mapTargetUI;
let minimapCanvas;
let hoverTagEl;
let campusLabelLayerEl;
let guardWalkingActive = false;
let globalGuardMesh;
let beeMentorStep = 0;
let professorLessonStep = 0;
let professorCompletedLessonIndex = -1;
let activeProfessorLessonIndex = null;
let csProfessorLessonStep = 0;
let csProfessorCompletedLessonIndex = -1;
let activeCsProfessorLessonIndex = null;
let activeLessonTrack = null;
let computerScienceAccessUnlocked = false;

const PROFESSOR_LESSONS = [
    {
        title: "Kirchhoff's Law",
        shortTitle: 'Kirchhoff',
        videoSrc: '/lessons/Kirchoff.mp4',
        introQuestion: "Welcome to Basic Electrical Engineering. Before I start the visual lesson, answer two short checks. First: what does Kirchhoff's Current Law track at a node?",
        followupQuestion: 'Second check: why do we assign a sign convention before writing circuit equations?',
        lessonCopy: 'Basic Electrical Engineering visual lesson. Watch the Kirchhoff overview before continuing.',
    },
    {
        title: "Ohm's Law",
        shortTitle: 'Ohm',
        videoSrc: '/lessons/Ohm.mp4',
        lessonCopy: "Basic Electrical Engineering visual lesson. Watch the Ohm's Law walkthrough before continuing.",
    },
    {
        title: 'PN Junction',
        shortTitle: 'PN Junction',
        videoSrc: '/lessons/PN.mp4',
        lessonCopy: 'Basic Electrical Engineering visual lesson. Watch the PN junction walkthrough before continuing.',
    },
];

const CS_PROFESSOR_LESSONS = [
    {
        title: 'C Programming Concepts 1',
        shortTitle: 'CPC 1',
        videoSrc: '/lessons/CPC1.mp4',
        introQuestion: 'Welcome to the Computer Science block. Before I start the first visual, answer two short checks. First: what does a variable store in a C program?',
        followupQuestion: 'Second check: why do we use loops in programming?',
        lessonCopy: 'Computer Science visual lesson. Watch C Programming Concepts 1 before continuing.',
    },
    {
        title: 'C Programming Concepts 2',
        shortTitle: 'CPC 2',
        videoSrc: '/lessons/CPC2.mp4',
        lessonCopy: 'Computer Science visual lesson. Watch C Programming Concepts 2 before continuing.',
    },
    {
        title: 'C Programming Concepts 3',
        shortTitle: 'CPC 3',
        videoSrc: '/lessons/CPC3.mp4',
        lessonCopy: 'Computer Science visual lesson. Watch C Programming Concepts 3 before continuing.',
    },
];

const KIRCHHOFF_QUIZ_DURATION = 300;
const KIRCHHOFF_QUIZ_BLUEPRINT = [
    ['easy', 2],
    ['intermediate', 2],
    ['hard', 1],
];
const KIRCHHOFF_QUIZ_QUESTION_BANK = {
    easy: [
        {
            id: 'easy-1',
            difficulty: 'Easy',
            points: 10,
            prompt: 'According to Kirchhoff\'s Current Law, what is true at any circuit node?',
            options: ['Total current entering equals total current leaving', 'Voltage is always zero', 'Resistance is the same in every branch', 'Power entering always exceeds power leaving'],
            answerIndex: 0,
        },
        {
            id: 'easy-2',
            difficulty: 'Easy',
            points: 10,
            prompt: 'Kirchhoff\'s Voltage Law is applied around a:',
            options: ['Closed loop', 'Single resistor only', 'Node only', 'Current source terminal only'],
            answerIndex: 0,
        },
        {
            id: 'easy-3',
            difficulty: 'Easy',
            points: 10,
            prompt: 'If 2 A enters a node and 2 A leaves the node, the algebraic current sum at that node is:',
            options: ['0 A', '2 A', '4 A', '-2 A'],
            answerIndex: 0,
        },
        {
            id: 'easy-4',
            difficulty: 'Easy',
            points: 10,
            prompt: 'KCL is mainly a statement of conservation of:',
            options: ['Charge', 'Resistance', 'Temperature', 'Power factor'],
            answerIndex: 0,
        },
    ],
    intermediate: [
        {
            id: 'intermediate-1',
            difficulty: 'Intermediate',
            points: 20,
            prompt: 'At a node, 6 A enters. Two branches leave with 2 A and 1.5 A. The current in the third leaving branch is:',
            options: ['2.5 A', '3.5 A', '4.5 A', '7.5 A'],
            answerIndex: 0,
        },
        {
            id: 'intermediate-2',
            difficulty: 'Intermediate',
            points: 20,
            prompt: 'In a loop with a 12 V source and drops of 5 V and 3 V, the remaining drop must be:',
            options: ['4 V', '6 V', '8 V', '10 V'],
            answerIndex: 0,
        },
        {
            id: 'intermediate-3',
            difficulty: 'Intermediate',
            points: 20,
            prompt: 'Why is choosing a consistent current direction before applying Kirchhoff\'s laws useful?',
            options: ['It keeps equation signs consistent even if the assumed direction is wrong', 'It removes the need for loop equations', 'It guarantees every answer is positive', 'It makes resistance values identical'],
            answerIndex: 0,
        },
        {
            id: 'intermediate-4',
            difficulty: 'Intermediate',
            points: 20,
            prompt: 'If the algebraic sum of voltages around a loop is +3 V, what does it indicate?',
            options: ['One or more voltage signs or values are inconsistent', 'KVL is invalid for that loop', 'Current must be zero in every branch', 'The source voltage is always 3 V'],
            answerIndex: 0,
        },
    ],
    hard: [
        {
            id: 'hard-1',
            difficulty: 'Hard',
            points: 40,
            prompt: 'At a node, 4 A and 1 A enter. One branch leaves with 3 A. If currents entering are positive and leaving are negative, the unknown branch current is:',
            options: ['-2 A', '+2 A', '-8 A', '+8 A'],
            answerIndex: 0,
        },
        {
            id: 'hard-2',
            difficulty: 'Hard',
            points: 40,
            prompt: 'Traverse a loop clockwise: +18 V rise across a source, then drops of 7 V and Vx, then a 3 V rise. By KVL, Vx is:',
            options: ['14 V', '8 V', '28 V', '2 V'],
            answerIndex: 0,
        },
        {
            id: 'hard-3',
            difficulty: 'Hard',
            points: 40,
            prompt: 'A student writes a loop equation and gets a negative current solution. What is the best interpretation?',
            options: ['The assumed current direction is opposite to the actual current direction', 'Kirchhoff\'s laws failed for that circuit', 'The resistor values must be negative', 'The loop should be ignored completely'],
            answerIndex: 0,
        },
    ],
};
const kirchhoffQuizState = {
    ready: false,
    passed: false,
    attempts: 0,
    questions: [],
    previousQuestionIds: [],
    currentIndex: 0,
    score: 0,
    selectedOptionIndex: null,
    answersLocked: false,
    timeRemaining: KIRCHHOFF_QUIZ_DURATION,
    timerId: null,
    autoSubmitted: false,
};
const OHM_GAME_INITIAL_BLUEPRINT = [
    ['easy', 1],
    ['intermediate', 1],
    ['hard', 1],
];
const OHM_GAME_RETRY_BLUEPRINT = [
    ['easy', 1],
    ['intermediate', 2],
];
const OHM_GAME_QUESTION_BANK = {
    easy: [
        {
            id: 'ohm-easy-1',
            difficulty: 'Easy',
            prompt: "Ohm's Law is written as:",
            options: ['V = I x R', 'P = V x I', 'Q = C x V', 'f = 1 / T'],
            answerIndex: 0,
        },
        {
            id: 'ohm-easy-2',
            difficulty: 'Easy',
            prompt: 'If current is 2 A and resistance is 5 ohms, voltage is:',
            options: ['10 V', '2.5 V', '7 V', '3 V'],
            answerIndex: 0,
        },
        {
            id: 'ohm-easy-3',
            difficulty: 'Easy',
            prompt: 'If voltage is fixed and resistance increases, current will:',
            options: ['Decrease', 'Increase', 'Stay the same', 'Become zero in every case'],
            answerIndex: 0,
        },
    ],
    intermediate: [
        {
            id: 'ohm-intermediate-1',
            difficulty: 'Intermediate',
            prompt: 'A resistor has 24 V across it and carries 3 A. Its resistance is:',
            options: ['8 ohms', '21 ohms', '27 ohms', '72 ohms'],
            answerIndex: 0,
        },
        {
            id: 'ohm-intermediate-2',
            difficulty: 'Intermediate',
            prompt: 'Current through a 12-ohm resistor connected to 36 V is:',
            options: ['3 A', '4 A', '12 A', '48 A'],
            answerIndex: 0,
        },
        {
            id: 'ohm-intermediate-3',
            difficulty: 'Intermediate',
            prompt: 'Which rearrangement of Ohm\'s Law is correct for current?',
            options: ['I = V / R', 'I = V x R', 'I = R / V', 'I = 1 / (V x R)'],
            answerIndex: 0,
        },
        {
            id: 'ohm-intermediate-4',
            difficulty: 'Intermediate',
            prompt: 'A circuit current is 0.5 A and the supply is 9 V. The resistance is:',
            options: ['18 ohms', '4.5 ohms', '9.5 ohms', '0.18 ohm'],
            answerIndex: 0,
        },
    ],
    hard: [
        {
            id: 'ohm-hard-1',
            difficulty: 'Hard',
            prompt: 'A resistor draws 0.25 A from a 48 V source. If the voltage doubles and the resistor is unchanged, the current becomes:',
            options: ['0.5 A', '0.125 A', '0.25 A', '96 A'],
            answerIndex: 0,
        },
        {
            id: 'ohm-hard-2',
            difficulty: 'Hard',
            prompt: 'For a fixed current of 4 A, what resistance is needed to produce a 60 V drop?',
            options: ['15 ohms', '56 ohms', '64 ohms', '240 ohms'],
            answerIndex: 0,
        },
        {
            id: 'ohm-hard-3',
            difficulty: 'Hard',
            prompt: 'A lamp rated at 12 V carries 1.5 A. If modeled as a resistor at that operating point, its resistance is:',
            options: ['8 ohms', '18 ohms', '13.5 ohms', '0.125 ohm'],
            answerIndex: 0,
        },
    ],
};
const ohmGameState = {
    ready: false,
    passed: false,
    attempts: 0,
    questions: [],
    previousQuestionIds: [],
    currentIndex: 0,
    selectedOptionIndex: null,
    livesRemaining: 3,
    maxLives: 3,
    answersLocked: false,
};
const PN_COMPONENT_SEQUENCE = ['voltage-source', 'wire', 'p-type', 'n-type'];
const PN_COMPONENT_LIBRARY = {
    'voltage-source': {
        label: 'Voltage Source',
        shortLabel: 'Voltage',
        description: 'Provides the bias for the PN junction circuit.',
    },
    wire: {
        label: 'Wire',
        shortLabel: 'Wire',
        description: 'Carries current between the source and the junction.',
    },
    'p-type': {
        label: 'P-type Semiconductor',
        shortLabel: 'P-type',
        description: 'Forms the anode side of the PN junction.',
    },
    'n-type': {
        label: 'N-type Semiconductor',
        shortLabel: 'N-type',
        description: 'Forms the cathode side of the PN junction.',
    },
};
const PN_BUILD_STEPS = [
    {
        title: 'Step 1',
        instruction: 'Place the voltage source first so the PN junction circuit has a bias supply.',
        hint: 'Start with the component that creates the potential difference: the voltage source.',
    },
    {
        title: 'Step 2',
        instruction: 'Add the wire next so current can travel from the source toward the junction.',
        hint: 'Use the conductor after the source. The wire is the current path.',
    },
    {
        title: 'Step 3',
        instruction: 'Place the P-type semiconductor to form the anode side of the PN junction.',
        hint: 'The left side of the junction should be the P-type region.',
    },
    {
        title: 'Step 4',
        instruction: 'Finish with the N-type semiconductor to complete the PN junction path.',
        hint: 'Complete the build with the N-type region on the far side of the junction.',
    },
];
const PN_UNLOCK_QUESTION_BANK = {
    'voltage-source': [
        {
            id: 'pn-source-1',
            difficulty: 'Easy',
            prompt: 'Which component provides the potential difference needed to bias a PN junction circuit?',
            options: ['Voltage source', 'Wire only', 'P-type region', 'N-type region'],
            answerIndex: 0,
            unlocksComponentId: 'voltage-source',
            hint: 'The circuit needs a component that supplies voltage across the junction.',
        },
        {
            id: 'pn-source-2',
            difficulty: 'Easy',
            prompt: 'A PN junction cannot show forward or reverse bias behavior unless it is connected to a:',
            options: ['Voltage source', 'Loose open terminal', 'Resistor only', 'Ground symbol only'],
            answerIndex: 0,
            unlocksComponentId: 'voltage-source',
            hint: 'Bias requires an applied voltage across the semiconductor junction.',
        },
    ],
    wire: [
        {
            id: 'pn-wire-1',
            difficulty: 'Easy',
            prompt: 'What is the role of the wire in a simple PN junction circuit?',
            options: ['To connect components and provide a current path', 'To create charge carriers', 'To replace the semiconductor', 'To block all current'],
            answerIndex: 0,
            unlocksComponentId: 'wire',
            hint: 'The circuit still needs a conducting path between the source and the junction.',
        },
        {
            id: 'pn-wire-2',
            difficulty: 'Intermediate',
            prompt: 'Why is a wire required between the voltage source and a PN junction setup?',
            options: ['It completes the circuit path for current flow', 'It changes P-type into N-type', 'It creates the depletion region', 'It acts as the bias supply'],
            answerIndex: 0,
            unlocksComponentId: 'wire',
            hint: 'Think about what physically completes the loop so current can move.',
        },
    ],
    'p-type': [
        {
            id: 'pn-p-1',
            difficulty: 'Intermediate',
            prompt: 'In a PN junction, which region is rich in holes as majority carriers?',
            options: ['P-type semiconductor', 'N-type semiconductor', 'Wire', 'Voltage source'],
            answerIndex: 0,
            unlocksComponentId: 'p-type',
            hint: 'The region named after positive carriers contains holes as the majority carriers.',
        },
        {
            id: 'pn-p-2',
            difficulty: 'Intermediate',
            prompt: 'Which side of a PN junction is called the anode in a simple diode model?',
            options: ['P-type side', 'N-type side', 'Wire side', 'Battery case'],
            answerIndex: 0,
            unlocksComponentId: 'p-type',
            hint: 'The anode is the positive-side semiconductor region.',
        },
    ],
    'n-type': [
        {
            id: 'pn-n-1',
            difficulty: 'Hard',
            prompt: 'Which region of a PN junction contributes electrons as the majority carriers?',
            options: ['N-type semiconductor', 'P-type semiconductor', 'Voltage source', 'Wire'],
            answerIndex: 0,
            unlocksComponentId: 'n-type',
            hint: 'The region named after negative charge carriers has electrons in majority.',
        },
        {
            id: 'pn-n-2',
            difficulty: 'Hard',
            prompt: 'To complete a PN junction path after the P-type region, which component must be placed on the opposite side?',
            options: ['N-type semiconductor', 'Another voltage source', 'An extra wire only', 'A switch'],
            answerIndex: 0,
            unlocksComponentId: 'n-type',
            hint: 'A PN junction needs both semiconductor regions, not two copies of the same one.',
        },
    ],
};
const pnGameState = {
    ready: false,
    passed: false,
    attempts: 0,
    questions: [],
    previousQuestionIds: [],
    currentIndex: 0,
    selectedOptionIndex: null,
    answersLocked: false,
    questionFeedback: '',
    unlockedComponentIds: [],
    selectedComponentId: null,
    placedComponentIds: PN_COMPONENT_SEQUENCE.map(() => null),
    buildHint: '',
};
const MINI_GAME_TYPES = {
    KIRCHHOFF: 'kirchhoff',
    OHM: 'ohm',
    PN: 'pn',
};
let activeMiniGameType = null;
const campusLabels = [];
let miniGameStartLock = false;

// Arrays for animated environment
const vehicles = [];
const interactiveMeshes = [];

// UI UI Elements
const uiOverlay = document.getElementById('ui-overlay');
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const dialogueBox = document.getElementById('dialogue-box');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const actionBtn = document.getElementById('dialogue-btn-action');
const dialogueSpeaker = document.getElementById('dialogue-speaker');
const dialogueContext = document.getElementById('dialogue-context');
const minimapContainer = document.getElementById('minimap-container');
const minimapSubtitle = document.querySelector('.minimap-subtitle');
const objectiveDistanceEl = document.getElementById('objective-distance');
const objectiveStateEl = document.getElementById('objective-state');
const worldStatusEl = document.getElementById('world-status');
const lessonModal = document.getElementById('lesson-modal');
const lessonTitleEl = document.getElementById('lesson-title');
const lessonCopyEl = document.getElementById('lesson-copy');
const lessonVideo = document.getElementById('lesson-video');
const lessonCloseBtn = document.getElementById('lesson-close');
const lessonVideoSource = lessonVideo?.querySelector('source');
const quizModal = document.getElementById('quiz-modal');
const quizCloseBtn = document.getElementById('quiz-close');
const quizKickerEl = document.getElementById('quiz-kicker');
const quizStartScreen = document.getElementById('quiz-start-screen');
const quizGameScreen = document.getElementById('quiz-game-screen');
const quizBuildScreen = document.getElementById('quiz-build-screen');
const quizResultScreen = document.getElementById('quiz-result-screen');
const quizStartBtn = document.getElementById('quiz-start-btn');
const quizStartTitle = document.getElementById('quiz-title');
const quizLeadEl = document.getElementById('quiz-lead');
const quizRuleListEl = document.getElementById('quiz-rule-list');
const quizQuestionNumberEl = document.getElementById('quiz-question-number');
const quizDifficultyEl = document.getElementById('quiz-difficulty');
const quizPointsCardEl = document.getElementById('quiz-points-card');
const quizPointsEl = document.getElementById('quiz-points');
const quizScoreCardEl = document.getElementById('quiz-score-card');
const quizScoreEl = document.getElementById('quiz-score');
const quizTimerCardEl = document.getElementById('quiz-timer-card');
const quizTimerEl = document.getElementById('quiz-timer');
const quizLivesCardEl = document.getElementById('quiz-lives-card');
const quizLivesEl = document.getElementById('quiz-lives');
const quizQuestionTextEl = document.getElementById('quiz-question-text');
const quizQuestionFeedbackEl = document.getElementById('quiz-question-feedback');
const quizOptionsEl = document.getElementById('quiz-options');
const quizNextBtn = document.getElementById('quiz-next-btn');
const quizBuildStageEl = document.getElementById('quiz-build-stage');
const quizUnlockedCountEl = document.getElementById('quiz-unlocked-count');
const quizBuildStepCountEl = document.getElementById('quiz-build-step-count');
const quizBuildInstructionsEl = document.getElementById('quiz-build-instructions');
const quizBuildHintEl = document.getElementById('quiz-build-hint');
const quizComponentBankEl = document.getElementById('quiz-component-bank');
const quizCircuitSlotsEl = document.getElementById('quiz-circuit-slots');
const quizValidateBtn = document.getElementById('quiz-validate-btn');
const quizResetBuildBtn = document.getElementById('quiz-reset-build-btn');
const quizResultTitleEl = document.getElementById('quiz-result-title');
const quizResultCopyEl = document.getElementById('quiz-result-copy');
const quizResultScoreEl = document.getElementById('quiz-result-score');
const quizRetryBtn = document.getElementById('quiz-retry-btn');
const quizResultCloseBtn = document.getElementById('quiz-result-close');

function setDialogueSpeaker(name) {
    if (dialogueSpeaker) dialogueSpeaker.textContent = name;
}

function setDialogueContext(text) {
    if (dialogueContext) dialogueContext.textContent = text;
}

function setWorldStatus(text) {
    if (worldStatusEl) worldStatusEl.textContent = text;
}

function setObjectiveState(text) {
    if (objectiveStateEl) objectiveStateEl.textContent = text;
}

function showChatInput(placeholder = 'Type a message and press Enter...') {
    chatInput.style.display = 'block';
    chatInput.disabled = false;
    chatInput.readOnly = false;
    chatInput.value = '';
    chatInput.placeholder = placeholder;
    requestAnimationFrame(() => {
        chatInput.focus();
    });
    setTimeout(() => {
        chatInput.focus();
    }, 60);
}

function hideChatInput() {
    chatInput.style.display = 'none';
    chatInput.value = '';
}

function moveChatCursorToEnd() {
    const end = chatInput.value.length;
    chatInput.setSelectionRange(end, end);
}

function submitChatInput() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatInput.value = '';
    addChatMessage(msg, 'player');
    processChatCommand(msg);
}

function shuffleArray(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function appendDialogueChoiceButtons(choices) {
    const wrap = document.createElement('div');
    wrap.className = 'professor-choice-wrap';

    choices.forEach(({ label, onClick }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dialogue-choice-btn';
        btn.textContent = label;
        btn.addEventListener('click', onClick);
        wrap.appendChild(btn);
    });

    chatLog.appendChild(wrap);
}

function appendProfessorChoiceButtons() {
    if (professorCompletedLessonIndex < 0) return;

    const repeatLesson = getLatestProfessorLesson();
    const nextLesson = getUpcomingProfessorLesson();
    const choices = [];

    if (nextLesson) {
        choices.push({
            label: `Next: ${nextLesson.shortTitle}`,
            onClick: () => {
                chatInput.value = 'next';
                submitChatInput();
            },
        });
    }

    choices.push({
        label: `Repeat: ${repeatLesson.shortTitle}`,
        onClick: () => {
            chatInput.value = 'repeat';
            submitChatInput();
        },
    });

    appendDialogueChoiceButtons(choices);
}

function getActiveMiniGameLabel() {
    if (activeMiniGameType === MINI_GAME_TYPES.OHM) return "Ohm's Law Challenge";
    if (activeMiniGameType === MINI_GAME_TYPES.PN) return 'PN Junction Challenge';
    return 'Kirchhoff Challenge';
}

function inferActiveMiniGameType() {
    if (activeMiniGameType) return activeMiniGameType;
    if (isPnGameRequired()) return MINI_GAME_TYPES.PN;
    if (isOhmGameRequired()) return MINI_GAME_TYPES.OHM;
    if (isKirchhoffQuizRequired()) return MINI_GAME_TYPES.KIRCHHOFF;
    return MINI_GAME_TYPES.KIRCHHOFF;
}

function releaseMiniGameStartLockSoon() {
    requestAnimationFrame(() => {
        miniGameStartLock = false;
    });
}

function startActiveMiniGameAttempt() {
    if (miniGameStartLock) return;
    miniGameStartLock = true;
    const gameType = inferActiveMiniGameType();
    activeMiniGameType = gameType;

    if (gameType === MINI_GAME_TYPES.OHM) {
        if (quizModal.style.display !== 'flex') {
            openOhmGameModal('start');
        }
        startOhmGameAttempt();
        releaseMiniGameStartLockSoon();
        return;
    }

    if (gameType === MINI_GAME_TYPES.PN) {
        if (quizModal.style.display !== 'flex') {
            openPnGameModal('start');
        }
        startPnGameAttempt();
        releaseMiniGameStartLockSoon();
        return;
    }

    if (quizModal.style.display !== 'flex') {
        openKirchhoffQuizModal('start');
    }
    beginKirchhoffQuizAttempt();
    releaseMiniGameStartLockSoon();
}

function isKirchhoffQuizRequired() {
    return professorCompletedLessonIndex === 0 && !kirchhoffQuizState.passed;
}

function canRetryKirchhoffQuiz() {
    return kirchhoffQuizState.attempts < 2;
}

function isOhmGameRequired() {
    return professorCompletedLessonIndex === 1 && !ohmGameState.passed;
}

function isPnGameRequired() {
    return professorCompletedLessonIndex === 2 && !pnGameState.passed;
}

function canRetryOhmGame() {
    return ohmGameState.attempts < 2;
}

function setQuizRules(items) {
    quizRuleListEl.innerHTML = '';
    items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'quiz-rule-item';
        row.textContent = item;
        quizRuleListEl.appendChild(row);
    });
}

function configureQuizStats({ showPoints = false, showScore = false, showTimer = false, showLives = false } = {}) {
    quizPointsCardEl.style.display = showPoints ? 'block' : 'none';
    quizScoreCardEl.style.display = showScore ? 'block' : 'none';
    quizTimerCardEl.style.display = showTimer ? 'block' : 'none';
    quizLivesCardEl.style.display = showLives ? 'block' : 'none';
}

function getQuestionPool(bank, blueprint, difficulty, previousIds = []) {
    const source = bank[difficulty] || [];
    const fresh = source.filter((question) => !previousIds.includes(question.id));
    const needed = blueprint.find(([level]) => level === difficulty)?.[1] || 0;
    if (fresh.length >= needed) {
        return fresh;
    }
    return source;
}

function createQuestionSet(bank, blueprint, previousIds = []) {
    const selected = [];

    blueprint.forEach(([difficulty, count]) => {
        const pool = shuffleArray(getQuestionPool(bank, blueprint, difficulty, previousIds));
        selected.push(...pool.slice(0, count).map(buildQuizQuestionVariant));
    });

    return shuffleArray(selected);
}

function getQuizQuestionPool(difficulty, previousIds = []) {
    const bank = KIRCHHOFF_QUIZ_QUESTION_BANK[difficulty] || [];
    const fresh = bank.filter((question) => !previousIds.includes(question.id));
    if (fresh.length >= KIRCHHOFF_QUIZ_BLUEPRINT.find(([level]) => level === difficulty)?.[1]) {
        return fresh;
    }
    return bank;
}

function buildQuizQuestionVariant(question) {
    const options = shuffleArray(question.options.map((text, index) => ({ text, originalIndex: index })));
    return {
        ...question,
        options: options.map((option) => option.text),
        answerIndex: options.findIndex((option) => option.originalIndex === question.answerIndex),
    };
}

function createKirchhoffQuizQuestions(previousIds = []) {
    return createQuestionSet(KIRCHHOFF_QUIZ_QUESTION_BANK, KIRCHHOFF_QUIZ_BLUEPRINT, previousIds);
}

function createOhmGameQuestions(previousIds = [], retryMode = false) {
    const blueprint = retryMode ? OHM_GAME_RETRY_BLUEPRINT : OHM_GAME_INITIAL_BLUEPRINT;
    return createQuestionSet(OHM_GAME_QUESTION_BANK, blueprint, previousIds);
}

function createPnAssemblySlots() {
    return PN_COMPONENT_SEQUENCE.map(() => null);
}

function createPnGameQuestions(previousIds = []) {
    const selected = PN_COMPONENT_SEQUENCE.map((componentId) => {
        const source = PN_UNLOCK_QUESTION_BANK[componentId] || [];
        const fresh = source.filter((question) => !previousIds.includes(question.id));
        const pool = fresh.length > 0 ? fresh : source;
        const question = pool[Math.floor(Math.random() * pool.length)];
        return buildQuizQuestionVariant(question);
    });

    return shuffleArray(selected);
}

function stopKirchhoffQuizTimer() {
    if (kirchhoffQuizState.timerId) {
        clearInterval(kirchhoffQuizState.timerId);
        kirchhoffQuizState.timerId = null;
    }
}

function formatQuizTime(totalSeconds) {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function prepareKirchhoffQuizGate({ resetAttempts = false, autoOpen = false } = {}) {
    kirchhoffQuizState.ready = true;
    kirchhoffQuizState.questions = [];
    kirchhoffQuizState.currentIndex = 0;
    kirchhoffQuizState.score = 0;
    kirchhoffQuizState.selectedOptionIndex = null;
    kirchhoffQuizState.answersLocked = false;
    kirchhoffQuizState.autoSubmitted = false;
    kirchhoffQuizState.timeRemaining = KIRCHHOFF_QUIZ_DURATION;
    stopKirchhoffQuizTimer();

    if (resetAttempts) {
        kirchhoffQuizState.attempts = 0;
        kirchhoffQuizState.previousQuestionIds = [];
    }

    if (autoOpen) {
        openKirchhoffQuizModal('start');
    }
}

function prepareOhmGameGate({ resetAttempts = false, autoOpen = false } = {}) {
    ohmGameState.ready = true;
    ohmGameState.questions = [];
    ohmGameState.currentIndex = 0;
    ohmGameState.selectedOptionIndex = null;
    ohmGameState.livesRemaining = ohmGameState.maxLives;
    ohmGameState.answersLocked = false;

    if (resetAttempts) {
        ohmGameState.attempts = 0;
        ohmGameState.previousQuestionIds = [];
    }

    if (autoOpen) {
        openOhmGameModal('start');
    }
}

function preparePnGameGate({ resetAttempts = false, autoOpen = false } = {}) {
    pnGameState.ready = true;
    pnGameState.passed = false;
    pnGameState.questions = [];
    pnGameState.currentIndex = 0;
    pnGameState.selectedOptionIndex = null;
    pnGameState.answersLocked = false;
    pnGameState.questionFeedback = '';
    pnGameState.unlockedComponentIds = [];
    pnGameState.selectedComponentId = null;
    pnGameState.placedComponentIds = createPnAssemblySlots();
    pnGameState.buildHint = '';

    if (resetAttempts) {
        pnGameState.attempts = 0;
        pnGameState.previousQuestionIds = [];
    }

    if (autoOpen) {
        openPnGameModal('start');
    }
}

function setQuizScreen(screen) {
    quizStartScreen.style.display = screen === 'start' ? 'flex' : 'none';
    quizGameScreen.style.display = screen === 'game' ? 'flex' : 'none';
    quizBuildScreen.style.display = screen === 'build' ? 'flex' : 'none';
    quizResultScreen.style.display = screen === 'result' ? 'flex' : 'none';
    quizCloseBtn.style.display = screen === 'game' || screen === 'build' ? 'none' : 'inline-flex';
}

function applyQuizShellForKirchhoff(screen) {
    configureQuizStats({ showPoints: true, showScore: true, showTimer: true, showLives: false });
    quizKickerEl.textContent = 'Kirchhoff Challenge';
    quizLeadEl.textContent = 'Pass the Kirchhoff challenge to unlock the next lesson.';
    setQuizRules([
        '5 questions: 2 easy, 2 intermediate, 1 hard.',
        'Scoring: 10 + 10 + 20 + 20 + 40 = 100. No negative marking.',
        'Timer: 5 minutes. The quiz auto-submits when time ends.',
        'Score 50 or more to pass and unlock the next lesson.',
        'One retry is allowed with new or shuffled questions.',
    ]);
    quizStartTitle.textContent = kirchhoffQuizState.attempts === 0 ? 'Mini-Game' : 'Mini-Game Retry';
    quizStartBtn.textContent = kirchhoffQuizState.attempts === 0 ? 'Start Game' : 'Start Retry';
    quizNextBtn.textContent = 'Next Question';
    quizRetryBtn.textContent = 'Retry';
    quizResultCloseBtn.style.display = 'inline-flex';
    quizCloseBtn.textContent = 'Close Challenge';
}

function applyQuizShellForOhm(screen) {
    configureQuizStats({ showPoints: false, showScore: false, showTimer: false, showLives: true });
    quizKickerEl.textContent = "Ohm's Law Challenge";
    quizLeadEl.textContent = "Finish the Ohm's Law mini-game to unlock the next lesson.";
    setQuizRules(
        ohmGameState.attempts === 0
            ? [
                '3 questions total: 1 easy, 1 intermediate, 1 hard.',
                'You start with 3 lives. Each wrong answer costs 1 life.',
                'The run ends immediately if all 3 lives are lost.',
                'If all lives are lost once, a retry starts with 2 intermediate and 1 easy question.',
                'If all lives are lost again, you must rewatch the Ohm lesson video.',
            ]
            : [
                'Retry set: 3 questions total with 2 intermediate and 1 easy question.',
                'You still start with 3 lives.',
                'Each wrong answer costs 1 life.',
                'If all lives are lost again, the lesson video must be rewatched before another run.',
            ]
    );
    quizStartTitle.textContent = ohmGameState.attempts === 0 ? 'Mini-Game' : 'Mini-Game Retry';
    quizStartBtn.textContent = ohmGameState.attempts === 0 ? 'Start Game' : 'Start Retry';
    quizNextBtn.textContent = 'Next Question';
    quizRetryBtn.textContent = 'Retry';
    quizResultCloseBtn.style.display = 'inline-flex';
    quizCloseBtn.textContent = 'Close Challenge';
}

function applyQuizShellForPn(screen) {
    configureQuizStats({ showPoints: false, showScore: false, showTimer: false, showLives: false });
    quizKickerEl.textContent = 'PN Junction Challenge';
    quizLeadEl.textContent = 'Unlock the circuit components, then assemble the PN junction correctly.';
    setQuizRules([
        'Answer 4 concept questions to unlock the voltage source, wire, P-type semiconductor, and N-type semiconductor.',
        'Each correct answer unlocks one component needed for the circuit build.',
        'Use the unlocked component bank to assemble the PN junction circuit step by step.',
        'If the circuit is incorrect, hints are shown and you can retry the build.',
        'A correct circuit completes the final lesson.',
    ]);
    quizStartTitle.textContent = pnGameState.attempts === 0 ? 'Mini-Game' : 'Mini-Game Retry';
    quizStartBtn.textContent = 'Start Game';
    quizNextBtn.textContent = 'Unlock Component';
    quizRetryBtn.textContent = 'Retry';
    quizRetryBtn.style.display = screen === 'result' && !pnGameState.passed ? 'inline-flex' : 'none';
    quizResultCloseBtn.style.display = 'inline-flex';
    quizCloseBtn.textContent = 'Close Challenge';
    if (quizQuestionFeedbackEl) {
        quizQuestionFeedbackEl.textContent = '';
        quizQuestionFeedbackEl.style.display = 'none';
    }
}

function openKirchhoffQuizModal(screen = 'start') {
    activeMiniGameType = MINI_GAME_TYPES.KIRCHHOFF;
    activeDialogueId = 'Kirchhoff Quiz';
    quizModal.style.display = 'flex';
    lessonModal.style.display = 'none';
    dialogueBox.style.display = 'none';
    blocker.style.display = 'none';
    uiOverlay.style.display = 'none';
    inDialogue = true;
    currentObjective = 6;
    setWorldStatus('Kirchhoff Challenge');
    applyQuizShellForKirchhoff(screen);
    setQuizScreen(screen);
    updateObjectiveUI();
}

function openOhmGameModal(screen = 'start') {
    activeMiniGameType = MINI_GAME_TYPES.OHM;
    activeDialogueId = 'Ohm Game';
    quizModal.style.display = 'flex';
    lessonModal.style.display = 'none';
    dialogueBox.style.display = 'none';
    blocker.style.display = 'none';
    uiOverlay.style.display = 'none';
    inDialogue = true;
    currentObjective = 7;
    setWorldStatus("Ohm's Law Challenge");
    applyQuizShellForOhm(screen);
    setQuizScreen(screen);
    updateObjectiveUI();
}

function openPnGameModal(screen = 'start') {
    activeMiniGameType = MINI_GAME_TYPES.PN;
    activeDialogueId = 'PN Game';
    quizModal.style.display = 'flex';
    lessonModal.style.display = 'none';
    dialogueBox.style.display = 'none';
    blocker.style.display = 'none';
    uiOverlay.style.display = 'none';
    inDialogue = true;
    currentObjective = 8;
    setWorldStatus('PN Junction Challenge');
    applyQuizShellForPn(screen);
    setQuizScreen(screen);
    updateObjectiveUI();
}

function closeKirchhoffQuizModal() {
    stopKirchhoffQuizTimer();
    quizModal.style.display = 'none';
    inDialogue = false;
    activeDialogueId = null;
    activeMiniGameType = null;
    currentObjective = professorCompletedLessonIndex >= 0 ? 5 : currentObjective;
    setWorldStatus(kirchhoffQuizState.passed ? 'Challenge Passed' : 'Exploration Online');
    updateObjectiveUI();
    controls.lock();
}

function closeOhmGameModal() {
    quizModal.style.display = 'none';
    inDialogue = false;
    activeDialogueId = null;
    activeMiniGameType = null;
    currentObjective = professorCompletedLessonIndex >= 0 ? 5 : currentObjective;
    setWorldStatus(ohmGameState.passed ? 'Challenge Passed' : 'Exploration Online');
    updateObjectiveUI();
    controls.lock();
}

function closePnGameModal() {
    quizModal.style.display = 'none';
    inDialogue = false;
    activeDialogueId = null;
    activeMiniGameType = null;
    currentObjective = pnGameState.passed && computerScienceAccessUnlocked
        ? 9
        : (professorCompletedLessonIndex >= 0 ? 5 : currentObjective);
    setWorldStatus(pnGameState.passed && computerScienceAccessUnlocked ? 'New Access Unlocked' : (pnGameState.passed ? 'Challenge Passed' : 'Exploration Online'));
    updateObjectiveUI();
    controls.lock();
}

function ensureCampusLabelLayer() {
    if (campusLabelLayerEl) return campusLabelLayerEl;
    campusLabelLayerEl = document.createElement('div');
    campusLabelLayerEl.id = 'campus-label-layer';
    document.body.appendChild(campusLabelLayerEl);
    return campusLabelLayerEl;
}

function registerCampusLabel(text, position) {
    const layer = ensureCampusLabelLayer();
    const el = document.createElement('div');
    el.className = 'campus-block-label';
    el.textContent = text;
    el.style.display = 'none';
    layer.appendChild(el);
    campusLabels.push({
        text,
        position: position.clone(),
        element: el,
    });
}

function updateCampusLabels() {
    if (!camera) return;
    const layer = ensureCampusLabelLayer();
    layer.style.display = 'block';

    for (const label of campusLabels) {
        tmpScreenPos.copy(label.position).project(camera);
        if (tmpScreenPos.z < -1 || tmpScreenPos.z > 1) {
            label.element.style.display = 'none';
            continue;
        }

        const x = (tmpScreenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-tmpScreenPos.y * 0.5 + 0.5) * window.innerHeight;
        const padding = 36;
        const clampedX = Math.min(window.innerWidth - padding, Math.max(padding, x));
        const clampedY = Math.min(window.innerHeight - padding, Math.max(padding, y));

        label.element.style.display = 'block';
        label.element.style.left = `${clampedX}px`;
        label.element.style.top = `${clampedY}px`;
    }
}

function renderKirchhoffQuizQuestion() {
    const question = kirchhoffQuizState.questions[kirchhoffQuizState.currentIndex];
    if (!question) return;

    quizQuestionNumberEl.textContent = `${kirchhoffQuizState.currentIndex + 1} / ${kirchhoffQuizState.questions.length}`;
    quizDifficultyEl.textContent = question.difficulty;
    quizPointsEl.textContent = `${question.points}`;
    quizScoreEl.textContent = `${kirchhoffQuizState.score}`;
    quizTimerEl.textContent = formatQuizTime(kirchhoffQuizState.timeRemaining);
    quizQuestionTextEl.textContent = question.prompt;
    quizNextBtn.disabled = kirchhoffQuizState.selectedOptionIndex === null;
    quizNextBtn.textContent = kirchhoffQuizState.currentIndex === kirchhoffQuizState.questions.length - 1 ? 'Submit Quiz' : 'Next Question';
    quizOptionsEl.innerHTML = '';

    question.options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'quiz-option-btn';
        if (kirchhoffQuizState.selectedOptionIndex === index) {
            optionBtn.classList.add('is-selected');
        }
        optionBtn.textContent = option;
        optionBtn.addEventListener('click', () => {
            kirchhoffQuizState.selectedOptionIndex = index;
            renderKirchhoffQuizQuestion();
        });
        quizOptionsEl.appendChild(optionBtn);
    });
}

function recordKirchhoffQuizAnswer() {
    const question = kirchhoffQuizState.questions[kirchhoffQuizState.currentIndex];
    if (!question || kirchhoffQuizState.answersLocked) return;

    if (kirchhoffQuizState.selectedOptionIndex === question.answerIndex) {
        kirchhoffQuizState.score += question.points;
    }
    kirchhoffQuizState.answersLocked = true;
}

function startKirchhoffQuizTimer() {
    stopKirchhoffQuizTimer();
    quizTimerEl.textContent = formatQuizTime(kirchhoffQuizState.timeRemaining);
    kirchhoffQuizState.timerId = setInterval(() => {
        kirchhoffQuizState.timeRemaining = Math.max(0, kirchhoffQuizState.timeRemaining - 1);
        quizTimerEl.textContent = formatQuizTime(kirchhoffQuizState.timeRemaining);

        if (kirchhoffQuizState.timeRemaining === 0) {
            kirchhoffQuizState.autoSubmitted = true;
            submitKirchhoffQuiz();
        }
    }, 1000);
}

function beginKirchhoffQuizAttempt() {
    activeMiniGameType = MINI_GAME_TYPES.KIRCHHOFF;
    activeDialogueId = 'Kirchhoff Quiz';
    kirchhoffQuizState.attempts += 1;
    kirchhoffQuizState.questions = createKirchhoffQuizQuestions(kirchhoffQuizState.previousQuestionIds);
    kirchhoffQuizState.previousQuestionIds = kirchhoffQuizState.questions.map((question) => question.id);
    kirchhoffQuizState.currentIndex = 0;
    kirchhoffQuizState.score = 0;
    kirchhoffQuizState.selectedOptionIndex = null;
    kirchhoffQuizState.answersLocked = false;
    kirchhoffQuizState.timeRemaining = KIRCHHOFF_QUIZ_DURATION;
    kirchhoffQuizState.autoSubmitted = false;

    applyQuizShellForKirchhoff('game');
    setQuizScreen('game');
    renderKirchhoffQuizQuestion();
    startKirchhoffQuizTimer();
}

function startKirchhoffQuizAttempt() {
    beginKirchhoffQuizAttempt();
}

function goToNextKirchhoffQuizQuestion() {
    if (kirchhoffQuizState.selectedOptionIndex === null) return;

    recordKirchhoffQuizAnswer();

    if (kirchhoffQuizState.currentIndex >= kirchhoffQuizState.questions.length - 1) {
        submitKirchhoffQuiz();
        return;
    }

    kirchhoffQuizState.currentIndex += 1;
    kirchhoffQuizState.selectedOptionIndex = null;
    kirchhoffQuizState.answersLocked = false;
    renderKirchhoffQuizQuestion();
}

function submitKirchhoffQuiz() {
    if (quizModal.style.display !== 'flex') return;

    if (!kirchhoffQuizState.answersLocked && kirchhoffQuizState.selectedOptionIndex !== null) {
        recordKirchhoffQuizAnswer();
    }

    stopKirchhoffQuizTimer();
    applyQuizShellForKirchhoff('result');
    setQuizScreen('result');
    currentObjective = 5;

    const passed = kirchhoffQuizState.score >= 50;
    const retryAvailable = !passed && canRetryKirchhoffQuiz();
    kirchhoffQuizState.ready = !passed;
    kirchhoffQuizState.passed = passed;

    if (passed) {
        setWorldStatus('Challenge Passed');
        quizResultTitleEl.textContent = 'Pass';
        quizResultCopyEl.textContent = `You scored ${kirchhoffQuizState.score} out of 100. Ohm's Law is now unlocked. Return to the Electronics Professor to move forward or replay Kirchhoff.`;
    } else if (retryAvailable) {
        setWorldStatus('Retry Available');
        quizResultTitleEl.textContent = 'Retry Available';
        quizResultCopyEl.textContent = `You scored ${kirchhoffQuizState.score} out of 100. You need at least 50 to pass. You may retry once with a new or shuffled question set.`;
    } else {
        setWorldStatus('Challenge Locked');
        quizResultTitleEl.textContent = 'Retry Used';
        quizResultCopyEl.textContent = `You scored ${kirchhoffQuizState.score} out of 100. The retry has been used. Repeat the Kirchhoff visual lesson and then attempt the challenge again.`;
    }

    if (kirchhoffQuizState.autoSubmitted) {
        quizResultCopyEl.textContent += ' Time ended, so the quiz was auto-submitted.';
    }

    quizResultScoreEl.textContent = `Score: ${kirchhoffQuizState.score} / 100`;
    quizRetryBtn.style.display = retryAvailable ? 'inline-flex' : 'none';
    quizResultCloseBtn.textContent = passed ? 'Continue' : 'Return';
    updateObjectiveUI();
}

function renderOhmGameQuestion() {
    const question = ohmGameState.questions[ohmGameState.currentIndex];
    if (!question) return;

    quizQuestionNumberEl.textContent = `${ohmGameState.currentIndex + 1} / ${ohmGameState.questions.length}`;
    quizDifficultyEl.textContent = question.difficulty;
    quizLivesEl.textContent = `${ohmGameState.livesRemaining}`;
    quizQuestionTextEl.textContent = question.prompt;
    quizNextBtn.disabled = ohmGameState.selectedOptionIndex === null;
    quizNextBtn.textContent = ohmGameState.currentIndex === ohmGameState.questions.length - 1 ? 'Submit Run' : 'Next Question';
    quizOptionsEl.innerHTML = '';

    question.options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'quiz-option-btn';
        if (ohmGameState.selectedOptionIndex === index) {
            optionBtn.classList.add('is-selected');
        }
        optionBtn.textContent = option;
        optionBtn.addEventListener('click', () => {
            ohmGameState.selectedOptionIndex = index;
            renderOhmGameQuestion();
        });
        quizOptionsEl.appendChild(optionBtn);
    });
}

function recordOhmGameAnswer() {
    const question = ohmGameState.questions[ohmGameState.currentIndex];
    if (!question || ohmGameState.answersLocked) return;

    if (ohmGameState.selectedOptionIndex !== question.answerIndex) {
        ohmGameState.livesRemaining = Math.max(0, ohmGameState.livesRemaining - 1);
    }

    ohmGameState.answersLocked = true;
}

function startOhmGameAttempt() {
    ohmGameState.attempts += 1;
    ohmGameState.questions = createOhmGameQuestions(ohmGameState.previousQuestionIds, ohmGameState.attempts > 1);
    ohmGameState.previousQuestionIds = ohmGameState.questions.map((question) => question.id);
    ohmGameState.currentIndex = 0;
    ohmGameState.selectedOptionIndex = null;
    ohmGameState.livesRemaining = ohmGameState.maxLives;
    ohmGameState.answersLocked = false;

    applyQuizShellForOhm('game');
    setQuizScreen('game');
    renderOhmGameQuestion();
}

function submitOhmGame(passed) {
    setQuizScreen('result');
    currentObjective = 5;
    ohmGameState.ready = !passed;
    ohmGameState.passed = passed;

    if (passed) {
        setWorldStatus('Challenge Passed');
        quizResultTitleEl.textContent = 'Pass';
        quizResultCopyEl.textContent = `You completed the Ohm's Law mini-game with ${ohmGameState.livesRemaining} lives remaining. PN Junction is now unlocked. Return to the Electronics Professor to continue or replay Ohm's Law.`;
        quizRetryBtn.style.display = 'none';
        quizResultCloseBtn.style.display = 'inline-flex';
        quizResultCloseBtn.textContent = 'Continue';
    } else if (canRetryOhmGame()) {
        setWorldStatus('Retry Available');
        quizResultTitleEl.textContent = 'Retry Available';
        quizResultCopyEl.textContent = 'All 3 lives are lost. A new Ohm set is ready with 2 intermediate and 1 easy question. Start the retry to continue.';
        quizRetryBtn.style.display = 'inline-flex';
        quizResultCloseBtn.style.display = 'none';
    } else {
        setWorldStatus('Rewatch Required');
        quizResultTitleEl.textContent = 'Watch Video';
        quizResultCopyEl.textContent = "All 3 lives are lost again. Rewatch the Ohm's Law lesson video before the mini-game resets.";
        quizRetryBtn.style.display = 'none';
        quizResultCloseBtn.style.display = 'inline-flex';
        quizResultCloseBtn.textContent = 'Watch Video';
    }

    quizResultScoreEl.textContent = `Lives Left: ${ohmGameState.livesRemaining} / ${ohmGameState.maxLives}`;
    updateObjectiveUI();
}

function goToNextOhmGameQuestion() {
    if (ohmGameState.selectedOptionIndex === null) return;

    recordOhmGameAnswer();

    if (ohmGameState.livesRemaining === 0) {
        submitOhmGame(false);
        return;
    }

    if (ohmGameState.currentIndex >= ohmGameState.questions.length - 1) {
        submitOhmGame(true);
        return;
    }

    ohmGameState.currentIndex += 1;
    ohmGameState.selectedOptionIndex = null;
    ohmGameState.answersLocked = false;
    renderOhmGameQuestion();
}

function renderPnGameQuestion() {
    const question = pnGameState.questions[pnGameState.currentIndex];
    if (!question) return;

    quizQuestionNumberEl.textContent = `${pnGameState.currentIndex + 1} / ${pnGameState.questions.length}`;
    quizDifficultyEl.textContent = question.difficulty;
    quizQuestionTextEl.textContent = question.prompt;
    quizNextBtn.disabled = pnGameState.selectedOptionIndex === null;
    quizNextBtn.textContent = pnGameState.currentIndex === pnGameState.questions.length - 1 ? 'Unlock Final Component' : 'Unlock Component';
    if (quizQuestionFeedbackEl) {
        quizQuestionFeedbackEl.textContent = pnGameState.questionFeedback;
        quizQuestionFeedbackEl.style.display = pnGameState.questionFeedback ? 'block' : 'none';
    }
    quizOptionsEl.innerHTML = '';

    question.options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'quiz-option-btn';
        if (pnGameState.selectedOptionIndex === index) {
            optionBtn.classList.add('is-selected');
        }
        optionBtn.textContent = option;
        optionBtn.addEventListener('click', () => {
            pnGameState.selectedOptionIndex = index;
            renderPnGameQuestion();
        });
        quizOptionsEl.appendChild(optionBtn);
    });
}

function resetPnBuildState() {
    pnGameState.selectedComponentId = null;
    pnGameState.placedComponentIds = createPnAssemblySlots();
    pnGameState.buildHint = 'Assembly reset. Follow the guided steps to rebuild the PN junction circuit.';
}

function openPnBuildStage() {
    currentObjective = 8;
    pnGameState.selectedComponentId = null;
    pnGameState.placedComponentIds = createPnAssemblySlots();
    pnGameState.buildHint = 'All components are unlocked. Select a component, then place it into the matching circuit slot.';
    pnGameState.questionFeedback = '';
    applyQuizShellForPn('build');
    setQuizScreen('build');
    renderPnBuildScreen();
}

function getPnNextOpenSlotIndex() {
    return pnGameState.placedComponentIds.findIndex((componentId) => componentId === null);
}

function renderPnBuildScreen() {
    const nextOpenSlotIndex = getPnNextOpenSlotIndex();
    const unlockedCount = pnGameState.unlockedComponentIds.length;
    const placedCount = pnGameState.placedComponentIds.filter(Boolean).length;
    const activeStepIndex = nextOpenSlotIndex === -1 ? PN_BUILD_STEPS.length - 1 : nextOpenSlotIndex;
    const activeStep = PN_BUILD_STEPS[activeStepIndex];

    quizBuildStageEl.textContent = nextOpenSlotIndex === -1 ? 'Validate Circuit' : activeStep.title;
    quizUnlockedCountEl.textContent = `${unlockedCount} / ${PN_COMPONENT_SEQUENCE.length}`;
    quizBuildStepCountEl.textContent = `${Math.min(placedCount + 1, PN_COMPONENT_SEQUENCE.length)} / ${PN_COMPONENT_SEQUENCE.length}`;
    quizBuildInstructionsEl.textContent = nextOpenSlotIndex === -1
        ? 'All four components are in place. Validate the PN junction circuit to finish the lesson.'
        : activeStep.instruction;
    quizBuildHintEl.textContent = pnGameState.buildHint || 'Select an unlocked component, then click the current slot.';
    quizBuildHintEl.style.display = 'block';

    quizComponentBankEl.innerHTML = '';
    PN_COMPONENT_SEQUENCE.forEach((componentId) => {
        const component = PN_COMPONENT_LIBRARY[componentId];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'quiz-component-btn';
        if (pnGameState.selectedComponentId === componentId) {
            button.classList.add('is-selected');
        }
        if (pnGameState.placedComponentIds.includes(componentId)) {
            button.classList.add('is-placed');
        }
        button.innerHTML = `<span class="quiz-component-title">${component.label}</span><span class="quiz-component-copy">${component.description}</span>`;
        button.addEventListener('click', () => {
            pnGameState.selectedComponentId = componentId;
            pnGameState.buildHint = `${component.label} selected. Place it into the highlighted assembly step.`;
            renderPnBuildScreen();
        });
        quizComponentBankEl.appendChild(button);
    });

    quizCircuitSlotsEl.innerHTML = '';
    PN_BUILD_STEPS.forEach((step, index) => {
        const placedComponentId = pnGameState.placedComponentIds[index];
        const component = placedComponentId ? PN_COMPONENT_LIBRARY[placedComponentId] : null;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'quiz-slot-btn';
        if (placedComponentId) {
            button.classList.add('is-filled');
        }
        if (index === nextOpenSlotIndex) {
            button.classList.add('is-active');
        }
        button.innerHTML = `
            <span class="quiz-slot-step">${step.title}</span>
            <span class="quiz-slot-title">${component ? component.label : 'Empty Slot'}</span>
            <span class="quiz-slot-copy">${component ? component.description : step.instruction}</span>
        `;
        button.addEventListener('click', () => {
            if (!pnGameState.selectedComponentId) {
                pnGameState.buildHint = 'Select a component from the unlocked bank before placing it into the circuit.';
                renderPnBuildScreen();
                return;
            }

            if (nextOpenSlotIndex !== -1 && index !== nextOpenSlotIndex) {
                pnGameState.buildHint = `Follow the guided sequence. ${PN_BUILD_STEPS[nextOpenSlotIndex].hint}`;
                renderPnBuildScreen();
                return;
            }

            if (pnGameState.placedComponentIds.includes(pnGameState.selectedComponentId)) {
                pnGameState.buildHint = `${PN_COMPONENT_LIBRARY[pnGameState.selectedComponentId].label} is already placed. Select a different component or reset the build.`;
                renderPnBuildScreen();
                return;
            }

            pnGameState.placedComponentIds[index] = pnGameState.selectedComponentId;
            pnGameState.buildHint = `${PN_COMPONENT_LIBRARY[pnGameState.selectedComponentId].label} placed in ${step.title}.`;
            pnGameState.selectedComponentId = null;
            renderPnBuildScreen();
        });
        quizCircuitSlotsEl.appendChild(button);
    });
}

function startPnGameAttempt() {
    pnGameState.ready = true;
    pnGameState.passed = false;
    pnGameState.attempts += 1;
    pnGameState.questions = createPnGameQuestions(pnGameState.previousQuestionIds);
    pnGameState.previousQuestionIds = pnGameState.questions.map((question) => question.id);
    pnGameState.currentIndex = 0;
    pnGameState.selectedOptionIndex = null;
    pnGameState.answersLocked = false;
    pnGameState.questionFeedback = '';
    pnGameState.unlockedComponentIds = [];
    pnGameState.selectedComponentId = null;
    pnGameState.placedComponentIds = createPnAssemblySlots();
    pnGameState.buildHint = '';

    applyQuizShellForPn('game');
    setQuizScreen('game');
    renderPnGameQuestion();
}

function goToNextPnGameQuestion() {
    const question = pnGameState.questions[pnGameState.currentIndex];
    if (!question || pnGameState.selectedOptionIndex === null) return;

    if (pnGameState.selectedOptionIndex !== question.answerIndex) {
        pnGameState.questionFeedback = `Hint: ${question.hint}`;
        pnGameState.selectedOptionIndex = null;
        renderPnGameQuestion();
        return;
    }

    if (!pnGameState.unlockedComponentIds.includes(question.unlocksComponentId)) {
        pnGameState.unlockedComponentIds.push(question.unlocksComponentId);
    }

    if (pnGameState.currentIndex >= pnGameState.questions.length - 1) {
        openPnBuildStage();
        return;
    }

    pnGameState.currentIndex += 1;
    pnGameState.selectedOptionIndex = null;
    pnGameState.questionFeedback = '';
    renderPnGameQuestion();
}

function validatePnCircuitBuild() {
    const firstEmptyIndex = getPnNextOpenSlotIndex();
    if (firstEmptyIndex !== -1) {
        pnGameState.buildHint = `Finish the assembly first. ${PN_BUILD_STEPS[firstEmptyIndex].hint}`;
        renderPnBuildScreen();
        return;
    }

    const mismatchIndex = PN_COMPONENT_SEQUENCE.findIndex((componentId, index) => pnGameState.placedComponentIds[index] !== componentId);
    if (mismatchIndex !== -1) {
        pnGameState.buildHint = `Not quite. ${PN_BUILD_STEPS[mismatchIndex].hint} Use Reset Build to retry the circuit.`;
        setWorldStatus('Hint Ready');
        renderPnBuildScreen();
        return;
    }

    pnGameState.ready = false;
    pnGameState.passed = true;
    unlockComputerScienceAccess();
    currentObjective = 9;
    setWorldStatus('New Access Unlocked');
    applyQuizShellForPn('result');
    setQuizScreen('result');
    quizResultTitleEl.textContent = 'Success';
    quizResultCopyEl.textContent = 'You unlocked all four components and assembled the PN junction circuit correctly. The PN Junction lesson is now complete. New access unlocked: proceed to the Computer Science block.';
    quizResultScoreEl.textContent = 'Circuit Status: Validated';
    quizRetryBtn.style.display = 'none';
    quizResultCloseBtn.textContent = 'Continue';
    updateObjectiveUI();
}

function isElectronicsTrackComplete() {
    return professorCompletedLessonIndex === PROFESSOR_LESSONS.length - 1 && pnGameState.passed;
}

function unlockComputerScienceAccess() {
    if (!isElectronicsTrackComplete()) return false;
    if (computerScienceAccessUnlocked) return false;
    computerScienceAccessUnlocked = true;
    return true;
}

function getProfessorLesson(index) {
    if (index < 0 || index >= PROFESSOR_LESSONS.length) return null;
    return PROFESSOR_LESSONS[index];
}

function getLatestProfessorLesson() {
    return getProfessorLesson(professorCompletedLessonIndex);
}

function getUpcomingProfessorLesson() {
    return getProfessorLesson(professorCompletedLessonIndex + 1);
}

function getCsProfessorLesson(index) {
    if (index < 0 || index >= CS_PROFESSOR_LESSONS.length) return null;
    return CS_PROFESSOR_LESSONS[index];
}

function getLatestCsProfessorLesson() {
    return getCsProfessorLesson(csProfessorCompletedLessonIndex);
}

function getUpcomingCsProfessorLesson() {
    return getCsProfessorLesson(csProfessorCompletedLessonIndex + 1);
}

function getActiveLessonMeta() {
    if (activeLessonTrack === 'cs') {
        return getCsProfessorLesson(activeCsProfessorLessonIndex) || CS_PROFESSOR_LESSONS[0];
    }
    return getProfessorLesson(activeProfessorLessonIndex) || PROFESSOR_LESSONS[0];
}

function startProfessorLesson(lessonIndex) {
    const lesson = getProfessorLesson(lessonIndex);
    if (!lesson) return;

    activeLessonTrack = 'electronics';
    activeProfessorLessonIndex = lessonIndex;
    activeDialogueId = null;
    lessonModal.style.display = 'flex';
    lessonTitleEl.textContent = lesson.title;
    lessonCopyEl.textContent = lesson.lessonCopy;
    if (lessonVideoSource) {
        lessonVideoSource.src = lesson.videoSrc;
    } else {
        lessonVideo.src = lesson.videoSrc;
    }
    lessonVideo.load();
    dialogueBox.style.display = 'none';
    blocker.style.display = 'none';
    uiOverlay.style.display = 'none';
    inDialogue = true;
    currentObjective = 4;
    setWorldStatus('Lesson Playback');
    updateObjectiveUI();
    lessonVideo.currentTime = 0;
    lessonVideo.play().catch(() => {});
}

function launchProfessorLessonAfterDelay(lessonIndex) {
    hideChatInput();
    setTimeout(() => {
        startProfessorLesson(lessonIndex);
    }, 700);
}

function startCsProfessorLesson(lessonIndex) {
    const lesson = getCsProfessorLesson(lessonIndex);
    if (!lesson) return;

    activeLessonTrack = 'cs';
    activeCsProfessorLessonIndex = lessonIndex;
    activeDialogueId = null;
    lessonModal.style.display = 'flex';
    lessonTitleEl.textContent = lesson.title;
    lessonCopyEl.textContent = lesson.lessonCopy;
    if (lessonVideoSource) {
        lessonVideoSource.src = lesson.videoSrc;
    } else {
        lessonVideo.src = lesson.videoSrc;
    }
    lessonVideo.load();
    dialogueBox.style.display = 'none';
    blocker.style.display = 'none';
    uiOverlay.style.display = 'none';
    inDialogue = true;
    currentObjective = 11;
    setWorldStatus('CS Lesson Playback');
    updateObjectiveUI();
    lessonVideo.currentTime = 0;
    lessonVideo.play().catch(() => {});
}

function launchCsProfessorLessonAfterDelay(lessonIndex) {
    hideChatInput();
    setTimeout(() => {
        startCsProfessorLesson(lessonIndex);
    }, 700);
}

function openProfessorDialogue() {
    const completedLesson = getLatestProfessorLesson();
    const nextLesson = getUpcomingProfessorLesson();
    const showIntroChecks = professorCompletedLessonIndex < 0;

    setDialogueMode({
        speaker: 'Electronics Professor',
        context: showIntroChecks ? 'Department Briefing' : 'Lesson Guidance',
        status: showIntroChecks ? 'BEE Introduction' : 'Lesson Routing',
        showInput: true,
    });

    activeDialogueId = 'Electronics Professor';
    actionBtn.style.display = 'none';
    professorLessonStep = 0;

    if (showIntroChecks) {
        currentObjective = 3;
        showChatInput('Type your answer and press Enter...');
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>Electronics Professor:</strong> ${PROFESSOR_LESSONS[0].introQuestion}</div>`;
    } else if (isKirchhoffQuizRequired()) {
        const retryAvailable = canRetryKirchhoffQuiz();
        currentObjective = 5;
        showChatInput(retryAvailable ? 'Type start to begin the challenge or repeat to replay Kirchhoff...' : 'Type repeat to replay Kirchhoff...');
        chatLog.innerHTML = retryAvailable
            ? `<div class="chat-msg npc-msg"><strong>Electronics Professor:</strong> The Kirchhoff visual is complete, but Ohm's Law stays locked until you pass the timed Kirchhoff challenge with 50 or more. Type start to begin the mini-game or repeat to replay the visual.</div>`
            : `<div class="chat-msg npc-msg"><strong>Electronics Professor:</strong> You have used the Kirchhoff challenge retry. Repeat the Kirchhoff visual, then I will reset the mini-game for another full attempt.</div>`;
        appendDialogueChoiceButtons(
            retryAvailable
                ? [
                    {
                        label: 'Start Challenge',
                        onClick: () => openKirchhoffQuizModal('start'),
                    },
                    {
                        label: 'Repeat: Kirchhoff',
                        onClick: () => {
                            chatInput.value = 'repeat';
                            submitChatInput();
                        },
                    },
                ]
                : [
                    {
                        label: 'Repeat: Kirchhoff',
                        onClick: () => {
                            chatInput.value = 'repeat';
                            submitChatInput();
                        },
                    },
                ]
        );
    } else if (isOhmGameRequired()) {
        currentObjective = 5;
        if (canRetryOhmGame()) {
            showChatInput("Type start to begin the Ohm mini-game or repeat to replay Ohm's Law...");
            chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>Electronics Professor:</strong> The Ohm's Law visual is complete, but PN Junction stays locked until you clear the Ohm mini-game. Type start to begin the run or repeat to replay the lesson.</div>`;
            appendDialogueChoiceButtons([
                {
                    label: 'Start Challenge',
                    onClick: () => openOhmGameModal('start'),
                },
                {
                    label: 'Repeat: Ohm',
                    onClick: () => {
                        chatInput.value = 'repeat';
                        submitChatInput();
                    },
                },
            ]);
        } else {
            showChatInput("Type repeat to replay Ohm's Law...");
            chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>Electronics Professor:</strong> You lost all 3 lives twice in the Ohm mini-game. Replay the Ohm's Law visual lesson, then the mini-game will reset.</div>`;
            appendDialogueChoiceButtons([
                {
                    label: 'Repeat: Ohm',
                    onClick: () => {
                        chatInput.value = 'repeat';
                        submitChatInput();
                    },
                },
            ]);
        }
    } else if (isPnGameRequired()) {
        currentObjective = 5;
        showChatInput('Type start to begin the PN Junction mini-game or repeat to replay PN Junction...');
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>Electronics Professor:</strong> The PN Junction visual is complete, but the lesson is only finished after you unlock the components and build the PN junction circuit correctly. Type start to begin the mini-game or repeat to replay the lesson.</div>`;
        appendDialogueChoiceButtons([
            {
                label: 'Start Challenge',
                onClick: () => openPnGameModal('start'),
            },
            {
                label: 'Repeat: PN Junction',
                onClick: () => {
                    chatInput.value = 'repeat';
                    submitChatInput();
                },
            },
        ]);
    } else if (nextLesson) {
        showChatInput(`Type next for ${nextLesson.shortTitle} or repeat for ${completedLesson.shortTitle}...`);
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>Electronics Professor:</strong> We have finished the ${completedLesson.shortTitle} visual. Shall we move to the next topic, ${nextLesson.title}, or repeat the previous visual?</div>`;
        appendProfessorChoiceButtons();
    } else {
        showChatInput(`Type repeat to replay ${completedLesson.shortTitle}...`);
        chatLog.innerHTML = computerScienceAccessUnlocked
            ? `<div class="chat-msg npc-msg"><strong>Electronics Professor:</strong> We have reached the final visual, ${completedLesson.title}. New access unlocked. Proceed to the Computer Science block and meet the CS Professor, or type repeat if you want to watch this visual again.</div>`
            : `<div class="chat-msg npc-msg"><strong>Electronics Professor:</strong> We have reached the final visual, ${completedLesson.title}. Type repeat if you want to watch it again.</div>`;
        appendProfessorChoiceButtons();
    }

    updateObjectiveUI();
}

function appendCsProfessorChoiceButtons() {
    if (csProfessorCompletedLessonIndex < 0) return;

    const repeatLesson = getLatestCsProfessorLesson();
    const nextLesson = getUpcomingCsProfessorLesson();
    const choices = [];

    if (nextLesson) {
        choices.push({
            label: `Next: ${nextLesson.shortTitle}`,
            onClick: () => {
                chatInput.value = 'next';
                submitChatInput();
            },
        });
    }

    choices.push({
        label: `Repeat: ${repeatLesson.shortTitle}`,
        onClick: () => {
            chatInput.value = 'repeat';
            submitChatInput();
        },
    });

    appendDialogueChoiceButtons(choices);
}

function openCsProfessorDialogue() {
    const completedLesson = getLatestCsProfessorLesson();
    const nextLesson = getUpcomingCsProfessorLesson();
    const showIntroChecks = csProfessorCompletedLessonIndex < 0;

    setDialogueMode({
        speaker: 'CS Professor',
        context: showIntroChecks ? 'Department Briefing' : 'Lesson Guidance',
        status: showIntroChecks ? 'CS Introduction' : 'CS Lesson Routing',
        showInput: true,
    });

    activeDialogueId = 'CS Professor';
    actionBtn.style.display = 'none';
    csProfessorLessonStep = 0;

    if (showIntroChecks) {
        currentObjective = 10;
        showChatInput('Type your answer and press Enter...');
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>CS Professor:</strong> ${CS_PROFESSOR_LESSONS[0].introQuestion}</div>`;
    } else if (nextLesson) {
        currentObjective = 12;
        showChatInput(`Type next for ${nextLesson.shortTitle} or repeat for ${completedLesson.shortTitle}...`);
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>CS Professor:</strong> We have finished the ${completedLesson.shortTitle} visual. Shall we move to the next topic, ${nextLesson.title}, or repeat the previous visual?</div>`;
        appendCsProfessorChoiceButtons();
    } else {
        currentObjective = 12;
        showChatInput(`Type repeat to replay ${completedLesson.shortTitle}...`);
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>CS Professor:</strong> We have reached the final visual, ${completedLesson.title}. Type repeat if you want to watch it again.</div>`;
        appendCsProfessorChoiceButtons();
    }

    updateObjectiveUI();
}

function getWorldTargetPosition(object, target = new THREE.Vector3()) {
    if (!object) return null;
    return object.getWorldPosition(target);
}

function setDialogueMode({ speaker, context, status, showInput = false, showAction = false, actionLabel = '' }) {
    setDialogueSpeaker(speaker);
    setDialogueContext(context);
    setWorldStatus(status);
    inDialogue = true;
    controls.unlock();
    instructions.style.display = 'none';
    blocker.style.display = 'block';
    blocker.style.backgroundColor = 'rgba(0,0,0,0.1)';
    uiOverlay.style.display = 'none';
    dialogueBox.style.display = 'block';
    if (showInput) {
        showChatInput();
    } else {
        hideChatInput();
    }
    actionBtn.style.display = showAction ? 'block' : 'none';
    if (showAction) actionBtn.innerText = actionLabel;
}

function resetDialogueState() {
    activeDialogueId = null;
    beeMentorStep = 0;
    professorLessonStep = 0;
    csProfessorLessonStep = 0;
}

function closeDialogueAndResume() {
    dialogueBox.style.display = 'none';
    inDialogue = false;
    removeTempDismiss();
    resetDialogueState();
    controls.lock();
}

function closeLessonModal(markComplete = false) {
    const completedLessonIndex = activeLessonTrack === 'cs' ? activeCsProfessorLessonIndex : activeProfessorLessonIndex;
    lessonVideo.pause();
    lessonModal.style.display = 'none';
    inDialogue = false;
    activeDialogueId = null;
    if (activeLessonTrack === 'cs') {
        if (markComplete && completedLessonIndex !== null) {
            csProfessorCompletedLessonIndex = Math.max(csProfessorCompletedLessonIndex, completedLessonIndex);
            currentObjective = 12;
            setWorldStatus('CS Lesson Completed');
        } else {
            currentObjective = csProfessorCompletedLessonIndex >= 0 ? 12 : 9;
            setWorldStatus('Exploration Online');
        }
    } else {
        if (markComplete && completedLessonIndex !== null) {
            professorCompletedLessonIndex = Math.max(professorCompletedLessonIndex, completedLessonIndex);
            if (completedLessonIndex === 0 && !kirchhoffQuizState.passed) {
                prepareKirchhoffQuizGate({ resetAttempts: true, autoOpen: true });
                activeProfessorLessonIndex = null;
                activeLessonTrack = null;
                hideChatInput();
                return;
            }
            if (completedLessonIndex === 1 && !ohmGameState.passed) {
                prepareOhmGameGate({ resetAttempts: true, autoOpen: true });
                activeProfessorLessonIndex = null;
                activeLessonTrack = null;
                hideChatInput();
                return;
            }
            if (completedLessonIndex === 2 && !pnGameState.passed) {
                preparePnGameGate({ resetAttempts: true, autoOpen: true });
                activeProfessorLessonIndex = null;
                activeLessonTrack = null;
                hideChatInput();
                return;
            }
            currentObjective = computerScienceAccessUnlocked ? 9 : 5;
            setWorldStatus(computerScienceAccessUnlocked ? 'New Access Unlocked' : 'Lesson Completed');
        } else {
            currentObjective = professorCompletedLessonIndex >= 0 ? (computerScienceAccessUnlocked ? 9 : 5) : 3;
            setWorldStatus('Exploration Online');
        }
    }
    activeProfessorLessonIndex = null;
    activeCsProfessorLessonIndex = null;
    activeLessonTrack = null;
    hideChatInput();
    updateObjectiveUI();
    controls.lock();
}

function handleBeeMentorCommand(msg) {
    const text = msg.toLowerCase();

    if (beeMentorStep === 0) {
        const currentSense = text.includes('charge') || text.includes('electron') || text.includes('flow') || text.includes('current');
        addChatMessage(
            currentSense
                ? 'Correct direction. In BEE, current is treated as charge flow through a branch over time.'
                : 'Keep it simple: current is the rate of charge flow through a branch.',
            'npc'
        );
        addChatMessage('Second check: why does a closed loop matter in a circuit?', 'npc');
        beeMentorStep = 1;
        return;
    }

    if (beeMentorStep === 1) {
        const loopSense = text.includes('complete') || text.includes('closed') || text.includes('path') || text.includes('return') || text.includes('loop');
        addChatMessage(
            loopSense
                ? 'Good. A closed loop gives current a complete path and makes branch relations measurable.'
                : 'The key idea is continuity: without a closed path, sustained current cannot circulate through the circuit.',
            'npc'
        );
        addChatMessage("Short briefing complete. Launching the first visual lesson: Kirchhoff's Law.", 'npc');
        beeMentorStep = 2;
        launchProfessorLessonAfterDelay(0);
        return;
    }

    addChatMessage('The first lesson is already prepared. Watch the Kirchhoff video and return for the next module.', 'npc');
}

function handleProfessorLessonCommand(msg) {
    const text = msg.toLowerCase();
    const firstLesson = PROFESSOR_LESSONS[0];

    if (professorCompletedLessonIndex >= 0) {
        const repeatLesson = getLatestProfessorLesson();
        const nextLesson = getUpcomingProfessorLesson();

        if (isKirchhoffQuizRequired()) {
            if (text.includes('repeat')) {
                addChatMessage(`Repeating ${repeatLesson.title}. Watch it again carefully, then take the mini-game.`, 'npc');
                launchProfessorLessonAfterDelay(0);
                return;
            }

            if (text.includes('start') || text.includes('quiz') || text.includes('challenge') || text.includes('game')) {
                if (canRetryKirchhoffQuiz()) {
                    addChatMessage('Opening the Kirchhoff challenge now. Clear 50 or more to unlock Ohm\'s Law.', 'npc');
                    openKirchhoffQuizModal('start');
                } else {
                    addChatMessage('The retry is already used. Repeat the Kirchhoff visual and the mini-game will reset.', 'npc');
                }
                return;
            }

            if (text.includes('next')) {
                addChatMessage('Pass the timed Kirchhoff challenge with 50 or more before moving to Ohm\'s Law.', 'npc');
                return;
            }

            addChatMessage(
                canRetryKirchhoffQuiz()
                    ? 'Type start to begin the Kirchhoff mini-game, or repeat to replay the visual lesson.'
                    : 'Type repeat to replay Kirchhoff. The challenge will reset after the video ends.',
                'npc'
            );
            return;
        }

        if (isOhmGameRequired()) {
            if (text.includes('repeat')) {
                addChatMessage(`Repeating ${repeatLesson.title}. Watch it again carefully, then take the Ohm mini-game.`, 'npc');
                launchProfessorLessonAfterDelay(1);
                return;
            }

            if (text.includes('start') || text.includes('quiz') || text.includes('challenge') || text.includes('game')) {
                if (canRetryOhmGame()) {
                    addChatMessage("Opening the Ohm's Law mini-game now. Keep your lives above zero to unlock PN Junction.", 'npc');
                    openOhmGameModal('start');
                } else {
                    addChatMessage("The Ohm mini-game must be reset by replaying the Ohm's Law lesson video.", 'npc');
                }
                return;
            }

            if (text.includes('next')) {
                addChatMessage("Clear the Ohm's Law mini-game before moving to PN Junction.", 'npc');
                return;
            }

            addChatMessage(
                canRetryOhmGame()
                    ? "Type start to begin the Ohm mini-game, or repeat to replay the Ohm's Law visual lesson."
                    : "Type repeat to replay Ohm's Law. The mini-game will reset after the lesson video ends.",
                'npc'
            );
            return;
        }

        if (isPnGameRequired()) {
            if (text.includes('repeat')) {
                addChatMessage(`Repeating ${repeatLesson.title}. Watch it again carefully, then rebuild the PN junction circuit in the mini-game.`, 'npc');
                launchProfessorLessonAfterDelay(2);
                return;
            }

            if (text.includes('start') || text.includes('quiz') || text.includes('challenge') || text.includes('game')) {
                addChatMessage('Opening the PN Junction challenge now. Unlock the components and assemble the circuit step by step.', 'npc');
                openPnGameModal('start');
                return;
            }

            if (text.includes('next')) {
                addChatMessage('The PN Junction visual is the final topic. Complete the PN circuit mini-game to finish the lesson.', 'npc');
                return;
            }

            addChatMessage('Type start to begin the PN Junction mini-game, or repeat to replay the PN Junction visual lesson.', 'npc');
            return;
        }

        if (text.includes('repeat')) {
            addChatMessage(`Repeating ${repeatLesson.title}. Watch the visual carefully and then come back to me.`, 'npc');
            launchProfessorLessonAfterDelay(professorCompletedLessonIndex);
            return;
        }

        if (text.includes('next')) {
            if (nextLesson) {
                addChatMessage(`Good. We will move to ${nextLesson.title} now.`, 'npc');
                launchProfessorLessonAfterDelay(professorCompletedLessonIndex + 1);
            } else {
                addChatMessage(
                    computerScienceAccessUnlocked
                        ? `The final topic is already complete. New access is unlocked, so proceed to the Computer Science block. Type repeat if you want to watch ${repeatLesson.title} again.`
                        : `The final topic is already complete. Type repeat if you want to watch ${repeatLesson.title} again.`,
                    'npc'
                );
            }
            return;
        }

        addChatMessage(
            nextLesson
                ? `Type next to move to ${nextLesson.title}, or repeat to replay ${repeatLesson.title}.`
                : computerScienceAccessUnlocked
                    ? `Computer Science access is unlocked. Proceed to the CS block, or type repeat to replay ${repeatLesson.title}.`
                    : `Type repeat to replay ${repeatLesson.title}.`,
            'npc'
        );
        return;
    }

    if (professorLessonStep === 0) {
        const nodeSense = text.includes('current') || text.includes('node') || text.includes('sum') || text.includes('junction');
        if (nodeSense) {
            addChatMessage("Good. Kirchhoff's Current Law checks current balance at a junction.", 'npc');
            addChatMessage(firstLesson.followupQuestion, 'npc');
            professorLessonStep = 1;
        } else {
            addChatMessage('So you are not sure with these concepts. Try to understand it with these visuals.', 'npc');
            professorLessonStep = 2;
            launchProfessorLessonAfterDelay(0);
        }
        return;
    }

    if (professorLessonStep === 1) {
        const signSense = text.includes('direction') || text.includes('consistent') || text.includes('polarity') || text.includes('sign');
        if (signSense) {
            addChatMessage('Exactly. A consistent sign convention keeps the voltage and current equations interpretable.', 'npc');
            addChatMessage('Briefing complete. Launching the first visual lesson: Kirchhoff\'s Law.', 'npc');
        } else {
            addChatMessage('So you are not sure with these concepts. Try to understand it with these visuals.', 'npc');
        }
        professorLessonStep = 2;
        launchProfessorLessonAfterDelay(0);
        return;
    }

    addChatMessage('We are already routing the lesson. Watch the active visual and then come back to me.', 'npc');
}

function handleCsProfessorLessonCommand(msg) {
    const text = msg.toLowerCase();
    const firstLesson = CS_PROFESSOR_LESSONS[0];

    if (csProfessorCompletedLessonIndex >= 0) {
        const repeatLesson = getLatestCsProfessorLesson();
        const nextLesson = getUpcomingCsProfessorLesson();

        if (text.includes('repeat')) {
            addChatMessage(`Repeating ${repeatLesson.title}. Watch the visual carefully and then come back to me.`, 'npc');
            launchCsProfessorLessonAfterDelay(csProfessorCompletedLessonIndex);
            return;
        }

        if (text.includes('next')) {
            if (nextLesson) {
                addChatMessage(`Good. We will move to ${nextLesson.title} now.`, 'npc');
                launchCsProfessorLessonAfterDelay(csProfessorCompletedLessonIndex + 1);
            } else {
                addChatMessage(`The final topic is already complete. Type repeat if you want to watch ${repeatLesson.title} again.`, 'npc');
            }
            return;
        }

        addChatMessage(
            nextLesson
                ? `Type next to move to ${nextLesson.title}, or repeat to replay ${repeatLesson.title}.`
                : `Type repeat to replay ${repeatLesson.title}.`,
            'npc'
        );
        return;
    }

    if (csProfessorLessonStep === 0) {
        const variableSense = text.includes('value') || text.includes('data') || text.includes('memory') || text.includes('store');
        if (variableSense) {
            addChatMessage('Good. A variable stores a value in memory so the program can read and update it.', 'npc');
            addChatMessage(firstLesson.followupQuestion, 'npc');
            csProfessorLessonStep = 1;
        } else {
            addChatMessage('So you are not sure with these concepts. Try to understand it with these visuals.', 'npc');
            csProfessorLessonStep = 2;
            launchCsProfessorLessonAfterDelay(0);
        }
        return;
    }

    if (csProfessorLessonStep === 1) {
        const loopSense = text.includes('repeat') || text.includes('iteration') || text.includes('again') || text.includes('loop');
        if (loopSense) {
            addChatMessage('Exactly. Loops let the program repeat a block of instructions without rewriting the same code.', 'npc');
            addChatMessage('Briefing complete. Launching the first visual lesson: C Programming Concepts 1.', 'npc');
        } else {
            addChatMessage('So you are not sure with these concepts. Try to understand it with these visuals.', 'npc');
        }
        csProfessorLessonStep = 2;
        launchCsProfessorLessonAfterDelay(0);
        return;
    }

    addChatMessage('We are already routing the CS lesson. Watch the active visual and then come back to me.', 'npc');
}

function ensureHoverTag() {
    if (hoverTagEl) return hoverTagEl;
    hoverTagEl = document.createElement('div');
    hoverTagEl.id = 'npc-hover-tag';
    hoverTagEl.style.display = 'none';
    document.body.appendChild(hoverTagEl);
    return hoverTagEl;
}

function registerInteractive(mesh) {
    if (!mesh) return;
    interactiveMeshes.push(mesh);
}

function removeTempDismiss() {
    const existing = document.getElementById('temp-dismiss');
    if (existing) existing.remove();
}

function updateHoverTag() {
    const tag = ensureHoverTag();
    if (!controls?.isLocked) {
        tag.style.display = 'none';
        return;
    }

    hoverRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hit = hoverRay.intersectObjects(interactiveMeshes, false).find((candidate) => candidate.object?.userData?.hoverLabel);
    if (!hit || hit.distance > 80) {
        tag.style.display = 'none';
        return;
    }

    const sourceObject = hit.object.parent || hit.object;
    sourceObject.getWorldPosition(tmpHoverWorldPos);
    tmpHoverWorldPos.y += hit.object.userData.labelOffsetY || 16;
    tmpScreenPos.copy(tmpHoverWorldPos).project(camera);

    if (tmpScreenPos.z > 1) {
        tag.style.display = 'none';
        return;
    }

    const x = (tmpScreenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-tmpScreenPos.y * 0.5 + 0.5) * window.innerHeight;
    tag.textContent = hit.object.userData.hoverLabel;
    tag.style.display = 'block';
    tag.style.left = `${x}px`;
    tag.style.top = `${y}px`;
}

function appendDismissButton(label, onClick) {
    removeTempDismiss();
    const dismissBtn = document.createElement('button');
    dismissBtn.id = 'temp-dismiss';
    dismissBtn.textContent = label;
    dismissBtn.addEventListener('click', onClick);
    chatLog.appendChild(dismissBtn);
    return dismissBtn;
}

function getFirstSolidHit(hits) {
    return hits.find((hit) => !hit.object?.userData?.walkableOnly) || null;
}

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 400, 4500); // Expanded render distance
    setDialogueContext('Campus Access Check');
    setWorldStatus('Standby');
    setObjectiveState('Checkpoint');

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

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 6000);
    camera.position.set(0, 16, 170); // Looking at the gate from the street

    controls = new PointerLockControls(camera, document.body);

    instructions.addEventListener('click', function () {
        if(!inDialogue) controls.lock();
    });

    controls.addEventListener('lock', function () {
        inDialogue = false;
        activeDialogueId = null;
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        dialogueBox.style.display = 'none';
        uiOverlay.style.display = 'flex';
        setWorldStatus('Exploration Online');
        updateObjectiveUI();
    });

    controls.addEventListener('unlock', function () {
        if (!inDialogue) {
            blocker.style.display = 'flex';
            instructions.style.display = 'block';
            uiOverlay.style.display = 'none';
            setWorldStatus('Paused');
        }
    });

    scene.add(camera);

    // Keyboard & Raycaster
    document.addEventListener('keydown', (e) => {
        if (inDialogue) {
            if (activeDialogueId === 'Electronics Professor' || activeDialogueId === 'CS Professor') {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitChatInput();
                    return;
                }

                if (document.activeElement !== chatInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    if (e.key === 'Backspace') {
                        e.preventDefault();
                        showChatInput(chatInput.placeholder);
                        chatInput.value = chatInput.value.slice(0, -1);
                        moveChatCursorToEnd();
                        return;
                    }

                    if (e.key.length === 1) {
                        e.preventDefault();
                        showChatInput(chatInput.placeholder);
                        chatInput.value += e.key;
                        moveChatCursorToEnd();
                        return;
                    }
                }
            }
            return;
        }
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
        e.preventDefault();
        submitChatInput();
    });

    actionBtn.addEventListener('click', () => {
        if (activeDialogueId === 'BackGuard') {
            addChatMessage('Scanning pass...', 'npc');
            actionBtn.style.display = 'none';
            chatInput.style.display = 'none';

            setTimeout(() => {
                addChatMessage('Pass verified. Opening rear gate. Safe travels.', 'npc');
                backGateOpening = true;
                appendDismissButton('Exit', () => {
                    dialogueBox.style.display = 'none';
                    inDialogue = false;
                    controls.lock();
                    removeTempDismiss();
                });
            }, 1200);
        }
        else if (currentObjective === 0) {
            addChatMessage('Let me check that...', 'npc');
            dialogueBox.style.display = 'none';
            guardWalkingActive = true;
            
            setTimeout(() => {
                dialogueBox.style.display = 'block';
                actionBtn.style.display = 'none';
                chatInput.style.display = 'none';
                addChatMessage('I have verified your ID. You may enter. Your classes are strictly held in the massive Block 6 deep inside the campus center.', 'npc');

                appendDismissButton('Enter Campus', () => {
                     dialogueBox.style.display = 'none';
                     inDialogue = false;
                     controls.lock();
                     removeTempDismiss();
                });

                guardWalkingActive = false;
                gateOpening = true;
                currentObjective = 1;
                document.getElementById('minimap-container').style.display = 'block';
                updateObjectiveUI('Follow your Minimap to Block 6 in the Freshman Engineering Department and use the Attendance Register.');
            }, 3000);
        } else if (currentObjective === 1 && window.interactiveObjects.terminal) {
            // Check if player clicked attendance terminal!
            // Wait, this applies if the player interacts with the terminal specifically
        }
    });

    lessonCloseBtn.addEventListener('click', () => {
        closeLessonModal(false);
    });
    lessonVideo.addEventListener('ended', () => {
        closeLessonModal(true);
    });
    quizCloseBtn.addEventListener('click', () => {
        if (activeMiniGameType === MINI_GAME_TYPES.OHM) {
            closeOhmGameModal();
        } else if (activeMiniGameType === MINI_GAME_TYPES.PN) {
            closePnGameModal();
        } else {
            closeKirchhoffQuizModal();
        }
    });
    const handleQuizStartTrigger = (event) => {
        event.preventDefault();
        event.stopPropagation();
        startActiveMiniGameAttempt();
    };
    quizStartBtn.addEventListener('click', handleQuizStartTrigger);
    quizStartBtn.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            handleQuizStartTrigger(event);
        }
    });
    quizNextBtn.addEventListener('click', () => {
        if (activeMiniGameType === MINI_GAME_TYPES.OHM) {
            goToNextOhmGameQuestion();
        } else if (activeMiniGameType === MINI_GAME_TYPES.PN) {
            goToNextPnGameQuestion();
        } else {
            goToNextKirchhoffQuizQuestion();
        }
    });
    quizValidateBtn.addEventListener('click', () => {
        if (activeMiniGameType === MINI_GAME_TYPES.PN) {
            validatePnCircuitBuild();
        }
    });
    quizResetBuildBtn.addEventListener('click', () => {
        if (activeMiniGameType === MINI_GAME_TYPES.PN) {
            resetPnBuildState();
            renderPnBuildScreen();
        }
    });
    quizRetryBtn.addEventListener('click', handleQuizStartTrigger);
    quizResultCloseBtn.addEventListener('click', () => {
        if (activeMiniGameType === MINI_GAME_TYPES.OHM && !ohmGameState.passed && !canRetryOhmGame()) {
            closeOhmGameModal();
            prepareOhmGameGate({ resetAttempts: true, autoOpen: false });
            launchProfessorLessonAfterDelay(1);
            return;
        }

        if (activeMiniGameType === MINI_GAME_TYPES.OHM) {
            closeOhmGameModal();
        } else if (activeMiniGameType === MINI_GAME_TYPES.PN) {
            closePnGameModal();
        } else {
            closeKirchhoffQuizModal();
        }
    });

    buildHyperRealisticWorld();

    // Secondary UI Renderer for Top-Down GTA Minimap
    minimapCanvas = document.getElementById('minimap');
    mapTargetUI = document.getElementById('minimap-target');
    mapRenderer = new THREE.WebGLRenderer({ canvas: minimapCanvas, antialias: true, alpha: true });
    mapCamera = new THREE.OrthographicCamera(-MAP_EXTENT, MAP_EXTENT, MAP_EXTENT, -MAP_EXTENT, 1, 6000);
    mapCamera.rotation.x = -Math.PI / 2; // Flat top-down
    mapMarkerUI = document.getElementById('minimap-marker');
    resizeMinimap();

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
    const boundsSize = CAMPUS_BOUNDS_SIZE; // Giant Radius
    
    // Back Wall (Leaves a massive 300-unit wide gap for the Back Gate)
    const bWallL = new THREE.Mesh(new THREE.BoxGeometry(boundsSize - 150, 60, 18), wallMat);
    bWallL.position.set(-150 - (boundsSize-150)/2, 30, gateZ - boundsSize); bWallL.castShadow = true; scene.add(bWallL); objects.push(bWallL);
    
    const bWallR = new THREE.Mesh(new THREE.BoxGeometry(boundsSize - 150, 60, 18), wallMat);
    bWallR.position.set(150 + (boundsSize-150)/2, 30, gateZ - boundsSize); bWallR.castShadow = true; scene.add(bWallR); objects.push(bWallR);

    // 3.5 BACK GATE & DOORS (Triple width = 300 gaps, 120 Height)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.7 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
    const bPillarL = new THREE.Mesh(new THREE.BoxGeometry(24, 120, 24), stoneMat); bPillarL.position.set(-160, 60, gateZ - boundsSize); bPillarL.castShadow = true; scene.add(bPillarL); objects.push(bPillarL);
    const bPillarR = new THREE.Mesh(new THREE.BoxGeometry(24, 120, 24), stoneMat); bPillarR.position.set(160, 60, gateZ - boundsSize); bPillarR.castShadow = true; scene.add(bPillarR); objects.push(bPillarR);
    const bArch = new THREE.Mesh(new THREE.BoxGeometry(340, 15, 30), stoneMat); bArch.position.set(0, 126, gateZ - boundsSize); bArch.castShadow = true; scene.add(bArch);
    
    // BACK DOORS (Currently closed. Need ID scan to open).
    backDoorLeftMesh = new THREE.Mesh(new THREE.BoxGeometry(150, 115, 8), ironMat);
    backDoorLeftMesh.position.set(-75, 57.5, gateZ - boundsSize);
    backDoorLeftMesh.castShadow = true;
    scene.add(backDoorLeftMesh);
    objects.push(backDoorLeftMesh);

    backDoorRightMesh = new THREE.Mesh(new THREE.BoxGeometry(150, 115, 8), ironMat);
    backDoorRightMesh.position.set(75, 57.5, gateZ - boundsSize);
    backDoorRightMesh.castShadow = true;
    scene.add(backDoorRightMesh);
    objects.push(backDoorRightMesh);
    // Left Wall
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(18, 60, boundsSize), wallMat);
    wallL.position.set(-boundsSize, 30, gateZ - (boundsSize/2)); wallL.castShadow = true; scene.add(wallL); objects.push(wallL);
    // Right Wall
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(18, 60, boundsSize), wallMat);
    wallR.position.set(boundsSize, 30, gateZ - (boundsSize/2)); wallR.castShadow = true; scene.add(wallR); objects.push(wallR);
    
    // Front Walls (Leaving 50 unit wide gap for main entrance to perfectly seal with pillars)
    const frontWallL = new THREE.Mesh(new THREE.BoxGeometry(boundsSize - 25, 60, 18), wallMat);
    frontWallL.position.set(-25 - (boundsSize-25)/2, 30, gateZ); frontWallL.castShadow = true; scene.add(frontWallL); objects.push(frontWallL);
    
    const frontWallR = new THREE.Mesh(new THREE.BoxGeometry(boundsSize - 25, 60, 18), wallMat);
    frontWallR.position.set(25 + (boundsSize-25)/2, 30, gateZ); frontWallR.castShadow = true; scene.add(frontWallR); objects.push(frontWallR);

    // 4. MAIN FRONT GATE & DOORS

    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(14, 80, 14), stoneMat); pillarL.position.set(-20, 40, gateZ); pillarL.castShadow = true; scene.add(pillarL); objects.push(pillarL);
    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(14, 80, 14), stoneMat); pillarR.position.set(20, 40, gateZ); pillarR.castShadow = true; scene.add(pillarR); objects.push(pillarR);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(50, 8, 18), stoneMat); arch.position.set(0, 84, gateZ); arch.castShadow = true; scene.add(arch);
    
    leftDoor = new THREE.Group(); leftDoor.position.set(-15, 0, gateZ);
    const lDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(14.5, 75, 6), ironMat); lDoorMesh.position.set(7.25, 37.5, 0); lDoorMesh.castShadow = true;
    leftDoor.add(lDoorMesh); scene.add(leftDoor); objects.push(lDoorMesh);
    
    rightDoor = new THREE.Group(); rightDoor.position.set(15, 0, gateZ);
    const rDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(14.5, 75, 6), ironMat); rDoorMesh.position.set(-7.25, 37.5, 0); rDoorMesh.castShadow = true;
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
    guardMesh.userData = { interactive: true, id: 'Guard', hoverLabel: 'Security', labelOffsetY: 12 };
    cabinGrp.add(guardMesh); objects.push(guardMesh);
    globalGuardMesh = guardMesh;
    registerInteractive(guardMesh);
    
    objects.push(backWall, rightWall, frontWall);
    scene.add(cabinGrp);

    // 5.5 BACK GATE SECURITY BOOTH
    const bCabinGrp = new THREE.Group(); bCabinGrp.position.set(180, 0, gateZ - boundsSize + 24);
    const bFloor = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 20), cabinMat); bFloor.position.set(0, 0.5, 0); bCabinGrp.add(bFloor);
    const bRoof = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 20), cabinMat); bRoof.position.set(0, 30, 0); bRoof.castShadow = true; bCabinGrp.add(bRoof);
    const bBackWall = new THREE.Mesh(new THREE.BoxGeometry(20, 29, 2), cabinMat); bBackWall.position.set(0, 14.5, 9); bBackWall.castShadow = true; bCabinGrp.add(bBackWall);
    const bLeftWall = new THREE.Mesh(new THREE.BoxGeometry(2, 29, 20), cabinMat); bLeftWall.position.set(-9, 14.5, 0); bLeftWall.castShadow = true; bCabinGrp.add(bLeftWall);
    const bRightWall = new THREE.Mesh(new THREE.BoxGeometry(2, 29, 20), cabinMat); bRightWall.position.set(9, 14.5, 0); bRightWall.castShadow = true; bCabinGrp.add(bRightWall);
    const bFrontSplitL = new THREE.Mesh(new THREE.BoxGeometry(6, 29, 2), cabinMat); bFrontSplitL.position.set(-7, 14.5, -9); bFrontSplitL.castShadow = true; bCabinGrp.add(bFrontSplitL);
    const bFrontSplitR = new THREE.Mesh(new THREE.BoxGeometry(6, 29, 2), cabinMat); bFrontSplitR.position.set(7, 14.5, -9); bFrontSplitR.castShadow = true; bCabinGrp.add(bFrontSplitR);
    
    const bGuard = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 16), new THREE.MeshStandardMaterial({color: 0x000080})); 
    bGuard.position.set(0, 4, 0); bGuard.castShadow = true;
    bGuard.userData = { interactive: true, id: 'BackGuard', hoverLabel: 'Back Gate Security', labelOffsetY: 12 };
    bCabinGrp.add(bGuard); objects.push(bGuard, bBackWall, bLeftWall, bRightWall, bFrontSplitL, bFrontSplitR);
    registerInteractive(bGuard);
    scene.add(bCabinGrp);

    const serviceRoad = new THREE.Mesh(new THREE.PlaneGeometry(340, 900), pathMat);
    serviceRoad.rotation.x = -Math.PI / 2;
    serviceRoad.position.set(0, 0.12, gateZ - boundsSize - 450);
    serviceRoad.receiveShadow = true;
    scene.add(serviceRoad);

    const context = { objects, walkableFloors, interactiveMeshes };

    // 6. REPLACEMENT ACADEMIC BLOCKS
    const academicBlocks = [
        { position: new THREE.Vector3(-1550, 0, -380), name: 'Civil Wing', accent: 0x4a7c4e },
        { position: new THREE.Vector3(1550, 0, -380), name: 'Mechanical Wing', accent: 0x537a48 },
        { position: new THREE.Vector3(-1550, 0, -1160), name: 'Applied Science Wing', accent: 0x3f7d5a },
        { position: new THREE.Vector3(1550, 0, -1160), name: 'Elective Wing', accent: 0x5d8b52 },
        { position: new THREE.Vector3(-1550, 0, -1840), name: 'Survey Lab Wing', accent: 0x467b5d },
        { position: new THREE.Vector3(1550, 0, -1840), name: 'Design Studio Wing', accent: 0x62864a },
    ];

    for (const config of academicBlocks) {
        scene.add(buildAcademicBlock(context, createNPC, config));
    }
    
    // Main Registration Desk
    const register = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 8), new THREE.MeshStandardMaterial({color:0x00ff00, emissive:0x006600}));
    register.position.set(0, 10, -100);
    register.castShadow = true;
    register.userData = { interactive: true, id: 'Register' };
    scene.add(register);
    objects.push(register);
    window.interactiveObjects.register = register;
    registerInteractive(register);

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
        const farmZ = -2550;
        
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
    scene.add(buildAdminBlock(context, createNPC));
    scene.add(buildComputerCore(context, createNPC));
    scene.add(buildElectronicsCore(context, createNPC));
    scene.add(buildLibrary(context, createNPC));
    scene.add(buildCanteen(context, createNPC));

    registerCampusLabel('Admin Block', new THREE.Vector3(700, 240, -160));
    registerCampusLabel('Computer Science Block', new THREE.Vector3(-700, 220, -160));
    registerCampusLabel('Electronics Block', new THREE.Vector3(-700, 210, -1000));
    registerCampusLabel('Civil Block', new THREE.Vector3(-1550, 130, -380));

    // Ensure Block 6 exists so the minimap/objective flow is achievable.
    buildFirstYearBlock();

    // Sync all geometric physical floors universally into the lateral rigid body crash pool
    walkableFloors.forEach(floor => {
        if (!objects.includes(floor)) objects.push(floor);
    });
} // Closes buildHyperRealisticWorld()

function buildFirstYearBlock() {
    const fGrp = new THREE.Group();
    const context = { objects, walkableFloors, interactiveMeshes };
    fGrp.position.set(0, 0, -1400);
    scene.add(fGrp);
    registerCampusLabel('Freshers Block', new THREE.Vector3(0, 210, -1400));

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd5d7d4, roughness: 0.9 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xaaaead, roughness: 0.78 });
    const corridorMat = new THREE.MeshStandardMaterial({ color: 0x8e9698, roughness: 0.72 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xc5d9e7, transparent: true, opacity: 0.3 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x6a4933, roughness: 0.82 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x6f767d, roughness: 0.76 });

    const levels = [0, 60, 120];
    const shellHeight = 58;
    const width = 620;
    const depth = 420;
    const frontZ = 209;
    const backZ = -209;

    for (const level of levels) {
        addWalkableBox(fGrp, context, new THREE.Vector3(width, 2, depth), new THREE.Vector3(0, level, 0), floorMat);
        addWalkableBox(fGrp, context, new THREE.Vector3(500, 2, 100), new THREE.Vector3(0, level + 0.2, 0), corridorMat);

        addCollisionBox(fGrp, context, new THREE.Vector3(width, shellHeight, 2), new THREE.Vector3(0, level + 29, backZ), wallMat);
        addCollisionBox(fGrp, context, new THREE.Vector3(2, shellHeight, depth), new THREE.Vector3(-309, level + 29, 0), wallMat);
        addCollisionBox(fGrp, context, new THREE.Vector3(2, shellHeight, depth), new THREE.Vector3(309, level + 29, 0), wallMat);

        if (level === 0) {
            addCollisionBox(fGrp, context, new THREE.Vector3(250, shellHeight, 2), new THREE.Vector3(-185, level + 29, frontZ), wallMat);
            addCollisionBox(fGrp, context, new THREE.Vector3(250, shellHeight, 2), new THREE.Vector3(185, level + 29, frontZ), wallMat);
            addCollisionBox(fGrp, context, new THREE.Vector3(88, 18, 2), new THREE.Vector3(0, level + 56, frontZ), wallMat);
            addCollisionBox(fGrp, context, new THREE.Vector3(33, 40, 2), new THREE.Vector3(-43.5, level + 20, frontZ), glassMat);
            addCollisionBox(fGrp, context, new THREE.Vector3(33, 40, 2), new THREE.Vector3(43.5, level + 20, frontZ), glassMat);
            addDoorSet(fGrp, context, {
                position: new THREE.Vector3(0, level, frontZ),
                axis: 'z',
                width: 52,
                height: 40,
                material: doorMat,
                frameMaterial: trimMat,
                openAngle: Math.PI / 4.6,
            });
        } else {
            addCollisionBox(fGrp, context, new THREE.Vector3(width, 24, 2), new THREE.Vector3(0, level + 48, frontZ), wallMat);
            addCollisionBox(fGrp, context, new THREE.Vector3(190, 30, 2), new THREE.Vector3(-190, level + 16, frontZ), glassMat);
            addCollisionBox(fGrp, context, new THREE.Vector3(190, 30, 2), new THREE.Vector3(190, level + 16, frontZ), glassMat);
            addCollisionBox(fGrp, context, new THREE.Vector3(110, 30, 2), new THREE.Vector3(0, level + 16, frontZ), glassMat);
        }

        // Corridor walls with classroom door openings and wide clear stair bays at the ends.
        for (const z of [-50, 50]) {
            addCollisionBox(fGrp, context, new THREE.Vector3(40, 46, 2), new THREE.Vector3(-195, level + 23, z), trimMat);
            addCollisionBox(fGrp, context, new THREE.Vector3(250, 46, 2), new THREE.Vector3(0, level + 23, z), trimMat);
            addCollisionBox(fGrp, context, new THREE.Vector3(40, 46, 2), new THREE.Vector3(195, level + 23, z), trimMat);
            addDoorSet(fGrp, context, {
                position: new THREE.Vector3(-155, level, z),
                axis: 'z',
                width: 34,
                height: 38,
                material: doorMat,
                frameMaterial: trimMat,
                openAngle: Math.PI / 4.2,
            });
            addDoorSet(fGrp, context, {
                position: new THREE.Vector3(155, level, z),
                axis: 'z',
                width: 34,
                height: 38,
                material: doorMat,
                frameMaterial: trimMat,
                openAngle: Math.PI / 4.2,
            });
        }
    }

    addWalkableBox(fGrp, context, new THREE.Vector3(width, 2, depth), new THREE.Vector3(0, 180, 0), floorMat, { walkableOnly: true });
    addCollisionBox(fGrp, context, new THREE.Vector3(width, 16, 2), new THREE.Vector3(0, 188, backZ), trimMat);
    addCollisionBox(fGrp, context, new THREE.Vector3(width, 16, 2), new THREE.Vector3(0, 188, frontZ), trimMat);
    addCollisionBox(fGrp, context, new THREE.Vector3(2, 16, depth), new THREE.Vector3(-309, 188, 0), trimMat);
    addCollisionBox(fGrp, context, new THREE.Vector3(2, 16, depth), new THREE.Vector3(309, 188, 0), trimMat);

    for (const stairX of [-270, 270]) {
        createStaircase(fGrp, context, {
            position: new THREE.Vector3(stairX, 0, -65),
            axis: 'z',
            direction: 1,
            width: 70,
            steps: 15,
            stepRise: 4,
            stepRun: 9,
            material: corridorMat,
            landingSize: new THREE.Vector3(78, 2, 30),
            addRailings: false,
        });
        createStaircase(fGrp, context, {
            position: new THREE.Vector3(stairX, 60, -65),
            axis: 'z',
            direction: 1,
            width: 70,
            steps: 15,
            stepRise: 4,
            stepRun: 9,
            material: corridorMat,
            landingSize: new THREE.Vector3(78, 2, 30),
            addRailings: false,
        });
    }

    for (const level of levels) {
        furnishClassroom(fGrp, context, { center: new THREE.Vector3(-155, 0, -105), width: 170, depth: 90, floorY: level, facing: 'north', accent: 0x2a5d25 });
        furnishClassroom(fGrp, context, { center: new THREE.Vector3(155, 0, -105), width: 170, depth: 90, floorY: level, facing: 'north', accent: 0x2a5d25 });
        furnishClassroom(fGrp, context, { center: new THREE.Vector3(-155, 0, 105), width: 170, depth: 90, floorY: level, facing: 'south', accent: 0x2b6328 });
        furnishClassroom(fGrp, context, { center: new THREE.Vector3(155, 0, 105), width: 170, depth: 90, floorY: level, facing: 'south', accent: 0x2b6328 });
    }

    const freshmanBoard = new THREE.Mesh(
        new THREE.BoxGeometry(78, 20, 2),
        new THREE.MeshStandardMaterial({ color: 0x1f5a23, roughness: 0.88 })
    );
    freshmanBoard.position.set(-150, 22, -143);
    fGrp.add(freshmanBoard);

    // Freshman Attendance Register near the classroom board and Head of Academics
    const terminalGeo = new THREE.BoxGeometry(8, 25, 8);
    const terminalMat = new THREE.MeshStandardMaterial({color: 0x0055ff, emissive: 0x001155});
    const terminal = new THREE.Mesh(terminalGeo, terminalMat);
    terminal.position.set(-118, 12.5, -122);
    terminal.userData = { interactive: true, id: 'Attendance Register', hoverLabel: 'Attendance Register', labelOffsetY: 18 };
    fGrp.add(terminal); objects.push(terminal);
    window.interactiveObjects.terminal = terminal;
    registerInteractive(terminal);

    createNPC(-135, 0, -1508, "Head of Academics", "The attendance register is beside the freshman board. Mark attendance there before moving to Electronics Engineering.", 0xffffff);
    createNPC(-120, 60, -1505, "Year Coordinator", "The side stairs serve all floors. Keep moving through the corridor spine and use the classroom doors.", 0xf0d6a6);

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
    hitbox.userData = { interactive: true, id: role, dialog: dialog, hoverLabel: role, labelOffsetY: 16 };
    npcGrp.add(hitbox);
    registerInteractive(hitbox);
    if (window.interactiveObjects && !window.interactiveObjects[role]) {
        window.interactiveObjects[role] = hitbox;
    }

    scene.add(npcGrp);
}

// Modular architecture block.

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeMinimap();
}

function resizeMinimap() {
    if (!mapRenderer || !minimapCanvas) return;
    const size = Math.max(140, Math.min(260, minimapCanvas.clientWidth || 250));
    mapRenderer.setSize(size, size, false);
}

function onMouseClick(event) {
    if (!controls.isLocked) return;
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(interactiveMeshes, false);

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
        setDialogueContext('Campus Access Check');
        setWorldStatus('Checkpoint Dialogue');
        inDialogue = true;
        activeDialogueId = 'Guard';
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
        setDialogueContext('Exit Authorization');
        setWorldStatus('Rear Gate Scan');
        inDialogue = true;
        activeDialogueId = 'BackGuard';
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
        setDialogueMode({
            speaker: 'Campus System',
            context: 'Entry Confirmation',
            status: 'Route Updating',
        });
        // Keep the storyline consistent: attendance is marked at Block 6 terminal, not at the gate.
        if (window.interactiveObjects.register) {
            window.interactiveObjects.register.material.color.setHex(0x0000ff);
            window.interactiveObjects.register.material.emissive.setHex(0x000088);
        }
        activeDialogueId = 'Register';
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>Campus System:</strong> Gate entry verified. Proceed to Block 6 and use the Attendance Register to mark attendance.</div>`;
        chatInput.style.display = 'none';
        actionBtn.style.display = 'none';

        appendDismissButton('Continue', () => {
            closeDialogueAndResume();
        });

        updateObjectiveUI('Follow your Minimap to Block 6 in the Freshman Engineering Department and use the Attendance Register.');
    }
    else if (id === 'Attendance Register' && currentObjective === 1) {
        setDialogueMode({
            speaker: 'Freshman Engineering Desk',
            context: 'Attendance Registered',
            status: 'Syllabus Route Loaded',
        });
        activeDialogueId = 'Attendance Register';
        currentObjective = 2;
        if(window.interactiveObjects.terminal) {
            window.interactiveObjects.terminal.material.color.setHex(0x00ff00);
            window.interactiveObjects.terminal.material.emissive.setHex(0x008800);
        }
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>Freshman Engineering Desk:</strong> Attendance marked. Your first academic route is now active. Proceed to the Electronics Engineering block and meet the staff for the Basic Electrical Engineering introduction.</div>`;
        actionBtn.style.display = 'none';
        chatInput.style.display = 'none';

        appendDismissButton('Go To Electronics', () => {
            closeDialogueAndResume();
        });

        updateObjectiveUI();
    }
    else if (id === 'PC Terminal') {
        setDialogueMode({
            speaker: 'Campus Network',
            context: 'Information Console',
            status: 'Optional System',
        });
        activeDialogueId = 'PC Terminal';
        chatLog.innerHTML = computerScienceAccessUnlocked
            ? `<div class="chat-msg npc-msg"><strong>Campus Network:</strong> New access unlocked. The Computer Science block is now active, and the CS Professor is ready to continue the next visual chain.</div>`
            : currentObjective >= 2
                ? `<div class="chat-msg npc-msg"><strong>Campus Network:</strong> Electronics is your active syllabus route. The staff briefing and BEE Mentor AI are inside the Electronics block.</div>`
                : `<div class="chat-msg npc-msg"><strong>Campus Network:</strong> Complete attendance in Block 6 before using department learning systems.</div>`;
        chatInput.style.display = 'none';
        actionBtn.style.display = 'none';

        appendDismissButton('Close', () => {
            closeDialogueAndResume();
        });
    }
    else if (id === 'Electronics Professor' && currentObjective >= 2) {
        openProfessorDialogue();
    }
    else if (id === 'CS Professor' && computerScienceAccessUnlocked) {
        openCsProfessorDialogue();
    }
    else if (id === 'BEE Mentor Console' && currentObjective >= 3) {
        setDialogueMode({
            speaker: 'BEE Mentor AI',
            context: 'Structured Tutor',
            status: 'Tutor Session',
        });
        activeDialogueId = 'BEE Mentor Console';
        if (isKirchhoffQuizRequired()) {
            chatLog.innerHTML = canRetryKirchhoffQuiz()
                ? `<div class="chat-msg npc-msg"><strong>BEE Mentor AI:</strong> Kirchhoff visual complete. The timed Kirchhoff mini-game is now the gate to Ohm's Law. Return to the professor or start the challenge from the quiz overlay.</div>`
                : `<div class="chat-msg npc-msg"><strong>BEE Mentor AI:</strong> The Kirchhoff mini-game retry is used. Replay the Kirchhoff visual with the professor to reset the challenge.</div>`;
        } else if (isOhmGameRequired()) {
            chatLog.innerHTML = canRetryOhmGame()
                ? `<div class="chat-msg npc-msg"><strong>BEE Mentor AI:</strong> Ohm's Law visual complete. The Ohm mini-game is now the gate to PN Junction. Return to the professor to start it or replay the lesson.</div>`
                : `<div class="chat-msg npc-msg"><strong>BEE Mentor AI:</strong> All lives were lost twice in the Ohm mini-game. Replay the Ohm's Law lesson with the professor to reset it.</div>`;
        } else if (isPnGameRequired()) {
            chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>BEE Mentor AI:</strong> PN Junction visual complete. Unlock the voltage source, wire, P-type semiconductor, and N-type semiconductor, then assemble the PN junction circuit to finish the final lesson.</div>`;
        } else if (professorCompletedLessonIndex >= 0) {
            const completedLesson = getLatestProfessorLesson();
            const nextLesson = getUpcomingProfessorLesson();
            chatLog.innerHTML = nextLesson
                ? `<div class="chat-msg npc-msg"><strong>BEE Mentor AI:</strong> ${completedLesson.title} is complete. Return to the professor to choose whether to repeat it or move to ${nextLesson.title}.</div>`
                : computerScienceAccessUnlocked
                    ? `<div class="chat-msg npc-msg"><strong>BEE Mentor AI:</strong> ${completedLesson.title} is complete. New access unlocked. Continue to the Computer Science block for the next department sequence.</div>`
                    : `<div class="chat-msg npc-msg"><strong>BEE Mentor AI:</strong> ${completedLesson.title} is complete. The professor can replay the final visual whenever you need revision.</div>`;
        } else {
            chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>BEE Mentor AI:</strong> The professor is handling the guided BEE lesson sequence. Complete the professor briefing to start the visual.</div>`;
        }
        chatInput.style.display = 'none';
        actionBtn.style.display = 'none';

        appendDismissButton('Close', () => {
            closeDialogueAndResume();
        });
    }
    else if (object && object.userData && object.userData.dialog) {
        setDialogueMode({
            speaker: id,
            context: 'Campus Dialogue',
            status: 'Conversation Active',
        });
        activeDialogueId = id;
        chatLog.innerHTML = `<div class="chat-msg npc-msg"><strong>${id}:</strong> ${object.userData.dialog}</div>`;
        
        chatInput.style.display = 'none';
        actionBtn.style.display = 'none';

        appendDismissButton('Continue', () => {
             closeDialogueAndResume();
        });
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

function updateObjectiveDistance() {
    if (!objectiveDistanceEl) return;
    let targetPos = null;
    if (currentObjective === 1 && window.interactiveObjects.terminal) {
        targetPos = getWorldTargetPosition(window.interactiveObjects.terminal, tmpObjectiveWorldPos);
    } else if ((currentObjective === 2 || currentObjective === 3 || currentObjective === 5) && window.interactiveObjects['Electronics Professor']) {
        targetPos = getWorldTargetPosition(window.interactiveObjects['Electronics Professor'], tmpObjectiveWorldPos);
    } else if ((currentObjective === 9 || currentObjective === 10 || currentObjective === 12) && window.interactiveObjects['CS Professor']) {
        targetPos = getWorldTargetPosition(window.interactiveObjects['CS Professor'], tmpObjectiveWorldPos);
    }

    if (targetPos) {
        const t = targetPos;
        const dx = t.x - camera.position.x;
        const dz = t.z - camera.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        objectiveDistanceEl.textContent = `Remaining: ${Math.max(0, Math.round(dist))}m`;
    } else {
        objectiveDistanceEl.textContent = '';
    }
}

function processChatCommand(msg) {
    if (activeDialogueId === 'Electronics Professor' && currentObjective >= 2) {
        handleProfessorLessonCommand(msg);
        return;
    }
    if (activeDialogueId === 'CS Professor' && computerScienceAccessUnlocked) {
        handleCsProfessorLessonCommand(msg);
        return;
    }
    if (activeDialogueId === 'BEE Mentor Console') {
        handleBeeMentorCommand(msg);
        return;
    }

    const text = msg.toLowerCase();
    
    setTimeout(() => {
        if (text.includes("name") || text.includes("who are you")) {
            addChatMessage("I am Officer Miller, head of security at this College.", 'npc');
        } 
        else if (text.includes("where") || text.includes("class") || text.includes("building") || text.includes("register") || text.includes("block")) {
            addChatMessage("Block 6 is deep inside the campus center. Your radar will guide you to the attendance register once you are cleared to enter.", 'npc');
        } 
        else if (text.includes("rule") || text.includes("policy") || text.includes("weapon") || text.includes("gta")) {
            addChatMessage("This isn't an action movie. The rules here are strict: go to class, learn, and respect the campus grounds.", 'npc');
        } 
        else if (text.includes("open") || text.includes("gate") || text.includes("id")) {
            addChatMessage("Use the 'Show ID & Enter' control in this panel. Once verified, the front gate opens and your campus radar locks onto Block 6.", 'npc');
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
        setObjectiveState('Priority');
        if (minimapSubtitle) minimapSubtitle.textContent = 'Primary route updating';
        objText.innerHTML = "<strong>OBJECTIVE:</strong> " + customText;
    } else if (currentObjective === 0) {
        setObjectiveState('Checkpoint');
        if (minimapSubtitle) minimapSubtitle.textContent = 'Security gate locked';
        objText.innerHTML = "<strong>OBJECTIVE:</strong> Walk to the Security Booth and present your ID.";
    } else if (currentObjective === 1) {
        setObjectiveState('Navigation');
        if (minimapSubtitle) minimapSubtitle.textContent = 'Block 6 route active';
        objText.innerHTML = "<strong>OBJECTIVE:</strong> Follow your Minimap to Block 6 and use the Attendance Register in the Freshman Engineering Department.";
    } else if (currentObjective === 2) {
        setObjectiveState('Syllabus');
        if (minimapSubtitle) minimapSubtitle.textContent = 'Electronics staff route';
        objText.innerHTML = "<strong>OBJECTIVE:</strong> Go to the Electronics Engineering block and meet the professor for the BEE introduction.";
    } else if (currentObjective === 3) {
        setObjectiveState('Briefing');
        if (minimapSubtitle) minimapSubtitle.textContent = 'Professor briefing active';
        objText.innerHTML = "<strong>OBJECTIVE:</strong> Complete the short BEE briefing with the Electronics Professor to begin the first visual lesson.";
    } else if (currentObjective === 4) {
        const activeLesson = getActiveLessonMeta();
        setObjectiveState('Lesson');
        if (minimapSubtitle) minimapSubtitle.textContent = `${activeLesson.shortTitle} lesson active`;
        objText.innerHTML = `<strong>OBJECTIVE:</strong> Watch the ${activeLesson.title} visual lesson and wait for it to finish.`;
    } else if (currentObjective === 5) {
        if (isKirchhoffQuizRequired()) {
            setObjectiveState('Challenge');
            if (minimapSubtitle) minimapSubtitle.textContent = 'Kirchhoff challenge pending';
            objText.innerHTML = canRetryKirchhoffQuiz()
                ? "<strong>OBJECTIVE:</strong> Pass the timed Kirchhoff mini-game with 50 or more to unlock Ohm's Law. Return to the Electronics Professor to start the challenge or repeat the visual."
                : "<strong>OBJECTIVE:</strong> The Kirchhoff mini-game retry is used. Replay the Kirchhoff visual lesson to reset the challenge.";
        } else if (isOhmGameRequired()) {
            setObjectiveState('Challenge');
            if (minimapSubtitle) minimapSubtitle.textContent = "Ohm mini-game pending";
            objText.innerHTML = canRetryOhmGame()
                ? "<strong>OBJECTIVE:</strong> Clear the Ohm's Law mini-game with at least 1 life remaining to unlock PN Junction. Return to the Electronics Professor to start the challenge or repeat the lesson."
                : "<strong>OBJECTIVE:</strong> All 3 lives were lost twice in the Ohm mini-game. Replay the Ohm's Law lesson to reset the challenge.";
        } else if (isPnGameRequired()) {
            setObjectiveState('Challenge');
            if (minimapSubtitle) minimapSubtitle.textContent = 'PN challenge pending';
            objText.innerHTML = "<strong>OBJECTIVE:</strong> Complete the PN Junction mini-game by unlocking all four components and assembling the PN junction circuit correctly.";
        } else {
            const completedLesson = getLatestProfessorLesson() || PROFESSOR_LESSONS[0];
            const nextLesson = getUpcomingProfessorLesson();
            setObjectiveState('Completed');
            if (minimapSubtitle) minimapSubtitle.textContent = `${completedLesson.shortTitle} lesson complete`;
            objText.innerHTML = nextLesson
                ? `<strong>LESSON COMPLETE!</strong> ${completedLesson.title} is finished. Go back to the Electronics Professor and choose whether to move to ${nextLesson.title} or repeat the previous visual.`
                : computerScienceAccessUnlocked
                    ? '<strong>NEW ACCESS UNLOCKED!</strong> Electronics is complete. Proceed to the Computer Science block and meet the CS Professor.'
                    : `<strong>LESSON COMPLETE!</strong> ${completedLesson.title} is finished. Return to the Electronics Professor if you want to replay the final visual.`;
        }
    } else if (currentObjective === 6) {
        setObjectiveState('Mini-Game');
        if (minimapSubtitle) minimapSubtitle.textContent = 'Kirchhoff challenge running';
        objText.innerHTML = "<strong>OBJECTIVE:</strong> Complete the timed Kirchhoff mini-game. Score 50 or more before the timer ends to unlock the next lesson.";
    } else if (currentObjective === 7) {
        setObjectiveState('Mini-Game');
        if (minimapSubtitle) minimapSubtitle.textContent = "Ohm mini-game running";
        objText.innerHTML = "<strong>OBJECTIVE:</strong> Complete the Ohm's Law mini-game before all 3 lives are lost to unlock PN Junction.";
    } else if (currentObjective === 8) {
        setObjectiveState('Mini-Game');
        if (minimapSubtitle) minimapSubtitle.textContent = 'PN challenge running';
        objText.innerHTML = "<strong>OBJECTIVE:</strong> Answer the PN Junction questions to unlock the circuit components, then build the PN junction circuit in the guided order.";
    } else if (currentObjective === 9) {
        setObjectiveState('Unlocked');
        if (minimapSubtitle) minimapSubtitle.textContent = 'Computer Science route active';
        objText.innerHTML = '<strong>NEW ACCESS UNLOCKED!</strong> Electronics is complete. Go to the Computer Science block, use the new entry door, and meet the CS Professor.';
    } else if (currentObjective === 10) {
        setObjectiveState('Briefing');
        if (minimapSubtitle) minimapSubtitle.textContent = 'CS professor briefing active';
        objText.innerHTML = '<strong>OBJECTIVE:</strong> Complete the short CS briefing with the CS Professor to begin the first visual lesson.';
    } else if (currentObjective === 11) {
        const activeLesson = getActiveLessonMeta();
        setObjectiveState('Lesson');
        if (minimapSubtitle) minimapSubtitle.textContent = `${activeLesson.shortTitle} lesson active`;
        objText.innerHTML = `<strong>OBJECTIVE:</strong> Watch the ${activeLesson.title} visual lesson and wait for it to finish.`;
    } else if (currentObjective === 12) {
        const completedLesson = getLatestCsProfessorLesson() || CS_PROFESSOR_LESSONS[0];
        const nextLesson = getUpcomingCsProfessorLesson();
        setObjectiveState(nextLesson ? 'Routing' : 'Completed');
        if (minimapSubtitle) minimapSubtitle.textContent = nextLesson ? 'CS lesson routing active' : `${completedLesson.shortTitle} lesson complete`;
        objText.innerHTML = nextLesson
            ? `<strong>LESSON COMPLETE!</strong> ${completedLesson.title} is finished. Return to the CS Professor and choose whether to move to ${nextLesson.title} or repeat the previous visual.`
            : `<strong>LESSON COMPLETE!</strong> ${completedLesson.title} is finished. Return to the CS Professor if you want to replay the final visual.`;
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

    // Back gate animation (slide doors open)
    if (backGateOpening && backDoorLeftMesh && backDoorRightMesh) {
        if (backGateOpenAmount < 170) {
            backGateOpenAmount += 80 * delta;
            backDoorLeftMesh.position.x = -75 - backGateOpenAmount;
            backDoorRightMesh.position.x = 75 + backGateOpenAmount;
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
        const hit = getFirstSolidHit(vehicleRaycaster.intersectObjects(objects, false));
        if (hit && hit.distance < hitDist) {
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
        updateObjectiveDistance();
        updateHoverTag();
        updateCampusLabels();
        
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
        let floorY = PLAYER_HEIGHT; 
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
                    floorY = hits[0].point.y + PLAYER_HEIGHT;
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
                tmpSideDir.set(-tmpWorldDir.z, 0, tmpWorldDir.x).normalize();

                let hit = null;
                const collisionThreshold = PLAYER_RADIUS + Math.max(tmpWorldVel.length(), COLLISION_CHECK_DISTANCE);
                for (const lateralOffset of [0, PLAYER_RADIUS * 0.7, -PLAYER_RADIUS * 0.7]) {
                    tmpProbeOrigin.copy(playerPos).addScaledVector(tmpSideDir, lateralOffset);
                    wallRay.set(tmpProbeOrigin, tmpWorldDir);
                    wallRay.near = 0;
                    wallRay.far = collisionThreshold;
                    const candidate = getFirstSolidHit(wallRay.intersectObjects(objects, false));
                    if (candidate && (!hit || candidate.distance < hit.distance)) {
                        hit = candidate;
                    }
                }

                if (hit) {
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
            mapCamera.position.set(camera.position.x, 1100, camera.position.z);
            mapRenderer.render(scene, mapCamera);

            // Compute compass heading relative to player camera view direction
            camera.getWorldDirection(tmpCameraDir);
            const angle = Math.atan2(tmpCameraDir.x, tmpCameraDir.z);
            const rotDeg = angle * (180 / Math.PI) + 180;
            mapMarkerUI.style.transform = `translate(-50%, -50%) rotate(${rotDeg}deg)`;

            // Objective target marker
            let targetPos = null;
            if (currentObjective === 1 && window.interactiveObjects.terminal) {
                targetPos = getWorldTargetPosition(window.interactiveObjects.terminal, tmpObjectiveWorldPos);
            } else if ((currentObjective === 2 || currentObjective === 3 || currentObjective === 5) && window.interactiveObjects['Electronics Professor']) {
                targetPos = getWorldTargetPosition(window.interactiveObjects['Electronics Professor'], tmpObjectiveWorldPos);
            } else if ((currentObjective === 9 || currentObjective === 10 || currentObjective === 12) && window.interactiveObjects['CS Professor']) {
                targetPos = getWorldTargetPosition(window.interactiveObjects['CS Professor'], tmpObjectiveWorldPos);
            }

            if (mapTargetUI && targetPos) {
                const target = targetPos;
                const size = mapRenderer.getSize(tmpSizeVec2).x || (minimapCanvas?.clientWidth || 250);
                const half = size / 2;
                const scale = size / (MAP_EXTENT * 2);

                const dx = target.x - camera.position.x;
                const dz = target.z - camera.position.z;

                let x = half + (dx * scale);
                let y = half - (dz * scale);

                const margin = 10;
                const clampedX = Math.min(size - margin, Math.max(margin, x));
                const clampedY = Math.min(size - margin, Math.max(margin, y));
                const clamped = (clampedX !== x) || (clampedY !== y);

                mapTargetUI.style.display = 'block';
                mapTargetUI.style.left = `${clampedX}px`;
                mapTargetUI.style.top = `${clampedY}px`;
                mapTargetUI.classList.toggle('minimap-target--clamped', clamped);
            } else if (mapTargetUI) {
                mapTargetUI.style.display = 'none';
            }
        }
    } else {
        updateCampusLabels();
    }

    if (!controls.isLocked && hoverTagEl) {
        hoverTagEl.style.display = 'none';
    }

    prevTime = time;
    renderer.render(scene, camera);
}
