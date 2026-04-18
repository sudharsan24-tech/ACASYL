import * as THREE from 'three';

const invisibleWalkableMaterial = new THREE.MeshBasicMaterial({ visible: false });
const invisibleColliderMaterial = new THREE.MeshBasicMaterial({ visible: false });

export function registerWalkable(mesh, context, options = {}) {
    const { walkableOnly = false } = options;
    mesh.userData = {
        ...mesh.userData,
        walkableOnly,
    };
    context.walkableFloors.push(mesh);
    return mesh;
}

export function addCollisionBox(parent, context, size, position, material, options = {}) {
    const {
        rotation = null,
        visible = true,
        castShadow = true,
        receiveShadow = true,
    } = options;

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        visible ? material : invisibleColliderMaterial
    );
    mesh.position.copy(position);
    if (rotation) {
        mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    parent.add(mesh);
    context.objects.push(mesh);
    return mesh;
}

export function addWalkableBox(parent, context, size, position, material, options = {}) {
    const {
        walkableOnly = false,
        visible = true,
        rotation = null,
        castShadow = true,
        receiveShadow = true,
    } = options;

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        visible ? material : invisibleWalkableMaterial
    );
    mesh.position.copy(position);
    if (rotation) {
        mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    parent.add(mesh);
    return registerWalkable(mesh, context, { walkableOnly });
}

export function createStaircase(parent, context, options) {
    const {
        position,
        axis = 'z',
        direction = 1,
        width,
        steps,
        stepRise,
        stepRun,
        material,
        addRailings = true,
        landingSize = null,
        autoLandings = true,
    } = options;

    const stairGroup = new THREE.Group();
    stairGroup.position.copy(position);
    parent.add(stairGroup);

    const totalRise = steps * stepRise;
    const totalRun = steps * stepRun;

    for (let i = 0; i < steps; i++) {
        const stepSize = axis === 'z'
            ? new THREE.Vector3(width, stepRise, stepRun)
            : new THREE.Vector3(stepRun, stepRise, width);

        const stepPosition = new THREE.Vector3();
        if (axis === 'z') {
            stepPosition.set(
                0,
                (i * stepRise) + (stepRise / 2),
                direction * ((i * stepRun) + (stepRun / 2))
            );
        } else {
            stepPosition.set(
                direction * ((i * stepRun) + (stepRun / 2)),
                (i * stepRise) + (stepRise / 2),
                0
            );
        }

        addWalkableBox(stairGroup, context, stepSize, stepPosition, material, {
            walkableOnly: true,
            visible: true,
        });
    }

    const landingRun = Math.max(stepRun * 1.5, 18);
    const rampRun = totalRun + (autoLandings ? landingRun * 2 : 0);
    const rampLength = Math.sqrt((rampRun * rampRun) + (totalRise * totalRise));
    const rampRotation = { x: 0, y: 0, z: 0 };
    if (axis === 'z') {
        rampRotation.x = direction === 1
            ? -Math.atan2(totalRise, totalRun)
            : Math.atan2(totalRise, totalRun);
    } else {
        rampRotation.z = direction === 1
            ? Math.atan2(totalRise, totalRun)
            : -Math.atan2(totalRise, totalRun);
    }

    const rampPosition = axis === 'z'
        ? new THREE.Vector3(0, totalRise / 2, direction * (totalRun / 2))
        : new THREE.Vector3(direction * (totalRun / 2), totalRise / 2, 0);

    addWalkableBox(
        stairGroup,
        context,
        axis === 'z'
            ? new THREE.Vector3(width - 10, 2, rampLength)
            : new THREE.Vector3(rampLength, 2, width - 10),
        rampPosition,
        material,
        {
            walkableOnly: true,
            visible: false,
            rotation: rampRotation,
            castShadow: false,
            receiveShadow: false,
        }
    );

    if (autoLandings) {
        const startLandingSize = axis === 'z'
            ? new THREE.Vector3(width - 8, 2, landingRun)
            : new THREE.Vector3(landingRun, 2, width - 8);
        const endLandingSize = startLandingSize.clone();
        const startLandingPosition = axis === 'z'
            ? new THREE.Vector3(0, 1, -direction * (landingRun / 2))
            : new THREE.Vector3(-direction * (landingRun / 2), 1, 0);
        const endLandingPosition = axis === 'z'
            ? new THREE.Vector3(0, totalRise + 1, direction * (totalRun + (landingRun / 2)))
            : new THREE.Vector3(direction * (totalRun + (landingRun / 2)), totalRise + 1, 0);

        addWalkableBox(stairGroup, context, startLandingSize, startLandingPosition, material, {
            walkableOnly: true,
            visible: false,
            castShadow: false,
            receiveShadow: false,
        });
        addWalkableBox(stairGroup, context, endLandingSize, endLandingPosition, material, {
            walkableOnly: true,
            visible: false,
            castShadow: false,
            receiveShadow: false,
        });
    }

    if (landingSize) {
        addWalkableBox(
            stairGroup,
            context,
            landingSize,
            new THREE.Vector3(
                axis === 'x' ? direction * totalRun : 0,
                totalRise + (landingSize.y / 2),
                axis === 'z' ? direction * totalRun : 0
            ),
            material,
            { walkableOnly: true, visible: true }
        );
    }

    if (addRailings) {
        const railMaterial = new THREE.MeshStandardMaterial({ color: 0x6e7378, roughness: 0.7, metalness: 0.3 });
        const railHeight = totalRise + 14;
        const railThickness = 3;
        const railSpan = axis === 'z'
            ? new THREE.Vector3(railThickness, railHeight, totalRun + 14)
            : new THREE.Vector3(totalRun + 14, railHeight, railThickness);

        if (axis === 'z') {
            addCollisionBox(stairGroup, context, railSpan, new THREE.Vector3((width / 2) - 2, railHeight / 2, direction * ((totalRun / 2) - 2)), railMaterial);
            addCollisionBox(stairGroup, context, railSpan, new THREE.Vector3((-width / 2) + 2, railHeight / 2, direction * ((totalRun / 2) - 2)), railMaterial);
        } else {
            addCollisionBox(stairGroup, context, railSpan, new THREE.Vector3(direction * ((totalRun / 2) - 2), railHeight / 2, (width / 2) - 2), railMaterial);
            addCollisionBox(stairGroup, context, railSpan, new THREE.Vector3(direction * ((totalRun / 2) - 2), railHeight / 2, (-width / 2) + 2), railMaterial);
        }
    }

    return stairGroup;
}

export function addDoorSet(parent, context, options) {
    const {
        position,
        axis = 'z',
        width = 28,
        height = 42,
        depth = 2.4,
        material = new THREE.MeshStandardMaterial({ color: 0x6c4c34, roughness: 0.8 }),
        frameMaterial = new THREE.MeshStandardMaterial({ color: 0xb8b2ab, roughness: 0.84 }),
        openAngle = Math.PI / 4,
        frameDepth = 4,
    } = options;

    const doorGroup = new THREE.Group();
    doorGroup.position.copy(position);
    parent.add(doorGroup);

    const leafWidth = (width / 2) - 0.6;
    const frameThickness = 2;

    const lintelSize = axis === 'z'
        ? new THREE.Vector3(width + 4, frameThickness, frameDepth)
        : new THREE.Vector3(frameDepth, frameThickness, width + 4);
    const jambSize = axis === 'z'
        ? new THREE.Vector3(frameThickness, height, frameDepth)
        : new THREE.Vector3(frameDepth, height, frameThickness);

    addCollisionBox(doorGroup, context, lintelSize, new THREE.Vector3(0, height + 1, 0), frameMaterial);
    if (axis === 'z') {
        addCollisionBox(doorGroup, context, jambSize, new THREE.Vector3(-(width / 2) - 1, height / 2, 0), frameMaterial);
        addCollisionBox(doorGroup, context, jambSize, new THREE.Vector3((width / 2) + 1, height / 2, 0), frameMaterial);
    } else {
        addCollisionBox(doorGroup, context, jambSize, new THREE.Vector3(0, height / 2, -(width / 2) - 1), frameMaterial);
        addCollisionBox(doorGroup, context, jambSize, new THREE.Vector3(0, height / 2, (width / 2) + 1), frameMaterial);
    }

    const leftLeafPivot = new THREE.Group();
    const rightLeafPivot = new THREE.Group();
    doorGroup.add(leftLeafPivot);
    doorGroup.add(rightLeafPivot);

    const leafGeometry = axis === 'z'
        ? new THREE.BoxGeometry(leafWidth, height, depth)
        : new THREE.BoxGeometry(depth, height, leafWidth);
    const leftLeaf = new THREE.Mesh(leafGeometry, material);
    const rightLeaf = new THREE.Mesh(leafGeometry, material);
    leftLeaf.castShadow = true;
    leftLeaf.receiveShadow = true;
    rightLeaf.castShadow = true;
    rightLeaf.receiveShadow = true;

    if (axis === 'z') {
        leftLeafPivot.position.set(-(width / 2) + 0.4, height / 2, 0);
        rightLeafPivot.position.set((width / 2) - 0.4, height / 2, 0);
        leftLeaf.position.set(leafWidth / 2, 0, 0);
        rightLeaf.position.set(-(leafWidth / 2), 0, 0);
        leftLeafPivot.rotation.y = -openAngle;
        rightLeafPivot.rotation.y = openAngle;
    } else {
        leftLeafPivot.position.set(0, height / 2, -(width / 2) + 0.4);
        rightLeafPivot.position.set(0, height / 2, (width / 2) - 0.4);
        leftLeaf.position.set(0, 0, leafWidth / 2);
        rightLeaf.position.set(0, 0, -(leafWidth / 2));
        leftLeafPivot.rotation.y = openAngle;
        rightLeafPivot.rotation.y = -openAngle;
    }

    leftLeafPivot.add(leftLeaf);
    rightLeafPivot.add(rightLeaf);

    return doorGroup;
}

export function furnishClassroom(parent, context, options) {
    const {
        center,
        width,
        depth,
        floorY,
        facing = 'north',
        accent = 0x6db45a,
    } = options;

    const room = new THREE.Group();
    room.position.set(center.x, floorY, center.z);
    parent.add(room);

    const boardMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.85 });
    const smartBoardMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.08 });
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x785334, roughness: 0.82 });
    const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x5b6166, roughness: 0.6, metalness: 0.2 });
    const roomHalfWidth = width / 2;
    const roomHalfDepth = depth / 2;

    const boardZ = facing === 'north' ? -roomHalfDepth + 6 : roomHalfDepth - 6;
    const boardDirection = facing === 'north' ? 1 : -1;

    const greenBoardWidth = Math.min(48, width * 0.32);
    const smartBoardWidth = Math.min(42, width * 0.26);

    const greenBoard = new THREE.Mesh(new THREE.BoxGeometry(greenBoardWidth, 16, 1.5), boardMaterial);
    greenBoard.position.set(-(greenBoardWidth * 0.6), 18, boardZ);
    room.add(greenBoard);

    const smartBoard = new THREE.Mesh(new THREE.BoxGeometry(smartBoardWidth, 18, 1.5), smartBoardMaterial);
    smartBoard.position.set(smartBoardWidth * 0.65, 19, boardZ);
    room.add(smartBoard);

    const teacherDesk = new THREE.Group();
    teacherDesk.position.set(0, 0, boardZ + (boardDirection * Math.max(14, depth * 0.17)));
    room.add(teacherDesk);

    const teacherDeskWidth = Math.min(32, width * 0.24);
    const teacherDeskDepth = Math.min(16, depth * 0.16);
    const teacherTop = new THREE.Mesh(new THREE.BoxGeometry(teacherDeskWidth, 3, teacherDeskDepth), deskMaterial);
    teacherTop.position.y = 8;
    teacherDesk.add(teacherTop);

    const teacherCollision = new THREE.Mesh(new THREE.BoxGeometry(teacherDeskWidth, 12, teacherDeskDepth), invisibleColliderMaterial);
    teacherCollision.position.y = 6;
    teacherDesk.add(teacherCollision);
    context.objects.push(teacherCollision);

    const deskWidth = Math.min(20, width * 0.18);
    const deskDepth = Math.min(10, depth * 0.12);
    const benchDepth = Math.min(6, depth * 0.08);
    const xMargin = 18;
    const frontTeachingZone = Math.max(24, depth * 0.28);
    const rearClearance = 14;
    const usableWidth = Math.max(48, width - (xMargin * 2));
    const columnSpacing = usableWidth / 3;
    const firstRowZ = boardZ + (boardDirection * frontTeachingZone);
    const lastRowZ = (roomHalfDepth - rearClearance) * boardDirection;
    const rowSpacing = Math.abs(lastRowZ - firstRowZ) / 4;

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 4; col++) {
            const unit = new THREE.Group();
            const x = (-usableWidth / 2) + (col * columnSpacing);
            const z = firstRowZ + (boardDirection * (row * rowSpacing));
            unit.position.set(x, 0, z);
            room.add(unit);

            const tableTop = new THREE.Mesh(new THREE.BoxGeometry(deskWidth, 2, deskDepth), deskMaterial);
            tableTop.position.y = 8;
            unit.add(tableTop);

            const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(deskWidth, 2, benchDepth), deskMaterial);
            benchSeat.position.set(0, 6, boardDirection * Math.max(6, depth * 0.085));
            unit.add(benchSeat);

            for (const legPosition of [
                [-(deskWidth * 0.35), 4, -(deskDepth * 0.3)],
                [deskWidth * 0.35, 4, -(deskDepth * 0.3)],
                [-(deskWidth * 0.35), 4, deskDepth * 0.3],
                [deskWidth * 0.35, 4, deskDepth * 0.3],
            ]) {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8, 1.6), steelMaterial);
                leg.position.set(...legPosition);
                unit.add(leg);
            }

            const benchCollision = new THREE.Mesh(
                new THREE.BoxGeometry(deskWidth + 4, 14, deskDepth + benchDepth + 8),
                invisibleColliderMaterial
            );
            benchCollision.position.y = 7;
            unit.add(benchCollision);
            context.objects.push(benchCollision);
        }
    }

    return room;
}

export function furnishSeminarHall(parent, context, options) {
    const {
        center,
        width,
        depth,
        floorY,
        accent = 0x1f5b2d,
    } = options;

    const hall = new THREE.Group();
    hall.position.set(center.x, floorY, center.z);
    parent.add(hall);

    const boardMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.88 });
    const smartBoardMaterial = new THREE.MeshStandardMaterial({ color: 0xf9f9f9, roughness: 0.35, metalness: 0.08 });
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x735135, roughness: 0.82 });
    const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x5f656c, roughness: 0.62, metalness: 0.16 });

    const frontZ = -(depth / 2) + 10;
    const greenBoard = new THREE.Mesh(new THREE.BoxGeometry(width * 0.26, 18, 1.5), boardMaterial);
    greenBoard.position.set(-(width * 0.18), 22, frontZ);
    hall.add(greenBoard);

    const smartBoard = new THREE.Mesh(new THREE.BoxGeometry(width * 0.22, 18, 1.5), smartBoardMaterial);
    smartBoard.position.set(width * 0.18, 22, frontZ);
    hall.add(smartBoard);

    const podium = new THREE.Mesh(new THREE.BoxGeometry(24, 10, 16), deskMaterial);
    podium.position.set(0, 5, frontZ + 18);
    hall.add(podium);
    context.objects.push(podium);

    const columns = 4;
    const rows = 5;
    const usableWidth = width - 36;
    const firstRowZ = frontZ + 42;
    const rowSpacing = (depth - 78) / (rows - 1);
    const colSpacing = usableWidth / (columns - 1);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const desk = new THREE.Group();
            desk.position.set(-(usableWidth / 2) + (col * colSpacing), 0, firstRowZ + (row * rowSpacing));
            hall.add(desk);

            const top = new THREE.Mesh(new THREE.BoxGeometry(24, 3, 12), deskMaterial);
            top.position.y = 8;
            desk.add(top);

            const bench = new THREE.Mesh(new THREE.BoxGeometry(24, 2, 7), deskMaterial);
            bench.position.set(0, 6, 10);
            desk.add(bench);

            for (const leg of [
                [-9, 4, -4],
                [9, 4, -4],
                [-9, 4, 4],
                [9, 4, 4],
            ]) {
                const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 8, 1.5), steelMaterial);
                frame.position.set(...leg);
                desk.add(frame);
            }

            const collider = new THREE.Mesh(new THREE.BoxGeometry(26, 14, 24), invisibleColliderMaterial);
            collider.position.set(0, 7, 6);
            desk.add(collider);
            context.objects.push(collider);
        }
    }

    return hall;
}
