import { Camera, Vector3, Euler, MathUtils, BufferGeometry, LineBasicMaterial, Line, Scene, Raycaster, Color, Vector2, Layers } from "three";

import Keyboard, { MouseInterface } from "./inputHelper";

const canvasElement = document.querySelector("#three-canvas");

const SPEED = 0.4;
const MAX_POLAR_ANGLE = MathUtils.degToRad(40);
const MIN_POLAR_ANGLE = -MAX_POLAR_ANGLE;
const SOLID_LAYER = 7;

const CAN_SPRINT_IN_AIR = true;

const _euler = new Euler(0, 0, 0, 'YXZ');
const _vector = new Vector3(0, 0, 0);

if (canvasElement === null) {
    throw new Error("Document needs #three-canvas.");
}
canvasElement?.addEventListener("click", () => {
    canvasElement.requestPointerLock();
});

const setupFPSCharacter = (camera: Camera, scene: Scene) => {

    camera.position.y = 20;

    const getSceneSolidObjects = (() => {
        const testLayers = new Layers();
        testLayers.disableAll();
        testLayers.enable(SOLID_LAYER);
        return () => {
            return scene.children.filter(o => o.layers.test(testLayers));
        };
    })();

    const raycastCheckForSolidObjects = (origin: Vector3, dir: Vector3) => {
        const solidObjects = getSceneSolidObjects();
        const raycaster = new Raycaster(origin, dir);
        raycaster.layers.disableAll();
        raycaster.layers.enable(SOLID_LAYER);
        const rayResults = raycaster.intersectObjects(solidObjects);
        return rayResults;
    };

    const touchesASolid = (moveDirection: Vector3, distance: number) => {

        // Distance 
        if (Math.abs(distance) !== distance) {
            moveDirection = moveDirection.clone(); // To leave original vector untouched.
            moveDirection.multiplyScalar(-1);
            distance = Math.abs(distance);
        }

        const rayResults = raycastCheckForSolidObjects(camera.position, moveDirection);
        const collision = rayResults.some(result => result.distance < Math.abs(distance + 2));

        return collision;

    };

    const moveForward = (distance: number, copyToVector: Vector3) => {
        _vector.setFromMatrixColumn(camera.matrix, 0);
        _vector.crossVectors(camera.up, _vector);
        copyToVector.addScaledVector(_vector, distance);
    };

    const moveRight = (distance: number, copyToVector: Vector3) => {
        _vector.setFromMatrixColumn(camera.matrix, 0);
        _vector.y = 0;
        copyToVector.addScaledVector(_vector, distance);
    };

    const keyboard = new Keyboard();
    const mouse = new MouseInterface();

    const pointer = { velX: 0.0, velY: 0.0 };

    document.addEventListener("mousemove", (e) => {
        pointer.velX += e.movementX;
        pointer.velY += e.movementY;
    });

    let sprinting = false;
    let headBobDelta = 0;

    const material = new LineBasicMaterial({
        color: 0xaaffff
    });
    let lines: Line[] = [];

    // To be called in loop:
    const assignSprinting = (isGrounded: boolean) => {
        if (sprinting === true) return sprinting;

        if (keyboard.ctrlDown === true) {
            if (CAN_SPRINT_IN_AIR || isGrounded) {
                sprinting = true;
                return sprinting;
            }
        }

        if (sprinting === false && keyboard.ctrlDown === true) { // Toggle sprint on with ctrl.
            sprinting = true;
        }
    };

    const checkCancelSprinting = (frameMovement: Vector3) => {
        if (frameMovement.equals(ZERO_VEC3)) {
            sprinting = false;
        }
    };

    const applyCameraRotation = (mouse: MouseInterface, copyToEuler: Euler) => {
        if (mouse.movement.x !== 0 || mouse.movement.y !== 0) {

            copyToEuler.setFromQuaternion(camera.quaternion);

            copyToEuler.y -= mouse.movement.x * 0.002 * 0.8;
            copyToEuler.x -= mouse.movement.y * 0.002 * 0.8;
            copyToEuler.x = MathUtils.clamp(copyToEuler.x, MIN_POLAR_ANGLE, MAX_POLAR_ANGLE);
            camera.quaternion.setFromEuler(copyToEuler);

            mouse.zeroMovement();
        }
    };

    const getPointAheadOfCamera = () => {
        const forward = new Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.multiplyScalar(60);
        forward.add(camera.position);
        return forward;
    };

    const applyHeadBob = (movementVector: Vector3) => {
        const aheadOfCameraBeforeReposition = getPointAheadOfCamera();
        const vel = movementVector.length();

        const getWavePoint = () => Math.abs(Math.sin(headBobDelta * 1)) * 0.2;
        const currentWavePoint = getWavePoint();

        if (vel > 0) {
            headBobDelta += .1 + (sprinting ? .05 : 0);
            camera.position.y += getWavePoint() - currentWavePoint;
        } else if (currentWavePoint > .1) {
            headBobDelta += .1 + (sprinting ? .05 : 0);
            const newWavePoint = getWavePoint();
            if (newWavePoint > currentWavePoint) {
                headBobDelta -= .2 + (sprinting ? .05 : 0);
            }
            camera.position.y += getWavePoint() - currentWavePoint;
        }

        camera.lookAt(aheadOfCameraBeforeReposition);
    };

    const drawCrosshair = (dt: number) => {
        const forward = getPointAheadOfCamera();

        const points = [];
        points.push(camera.position);
        points.push(forward);
        points.push(forward.clone().add(camera.up));

        const geometry = new BufferGeometry().setFromPoints(points);
        const newLine = new Line(geometry, material);
        if (sprinting) {
            newLine.material.color = RED;
        } else {
            newLine.material.color = HYPER_BLUE;
        }
        scene.add(newLine);
        lines.push(newLine);

        if (lines.length > 5) {
            scene.remove(lines[0]);
            lines = lines.slice(1);
        }
    };

    const checkIsGrounded = () => {

        if (aerialVector.y > 0) {
            // Moving upwards
            // so you're not grounded at this distance right now.
            return false;
        }

        const solidSurfacesBelow = raycastCheckForSolidObjects(camera.position, new Vector3(0, -1, 0));

        if (solidSurfacesBelow.length === 0) return false;

        if (solidSurfacesBelow[0].distance <= 4) {
            return true; // You should NOT be falling.
        } else {
            return false;
        }

    };

    let thisFallTotalTime = 0;
    let lastFallingFrameTime = 0;
    let aerialVector = new Vector3(0, 0, 0);

    const fall = (deltaTimeSinceSceneStart: number) => {

        if (lastFallingFrameTime === 0) {
            lastFallingFrameTime = deltaTimeSinceSceneStart;
            thisFallTotalTime = 0;
        } else {
            const additionalFallTime = deltaTimeSinceSceneStart - lastFallingFrameTime;
            thisFallTotalTime += additionalFallTime;
            lastFallingFrameTime = deltaTimeSinceSceneStart;
        }

        aerialVector.add(new Vector3(0, -((thisFallTotalTime / 1000) * 9.8) * 0.003, 0));

        camera.position.add(aerialVector);

    };

    let spacePressed = false;
    const getSpacePress = () => {
        if (spacePressed === false && keyboard.spaceDown) {
            spacePressed = true;
            return true;
        } else if (spacePressed === true && !keyboard.spaceDown) {
            spacePressed = false;
            return false;
        } else {
            return false;
        }
    };

    const applyJumpAndGravity = (isGrounded: boolean, deltaTimeSinceSceneStart: number) => {
        if (isGrounded) {

            lastFallingFrameTime = 0;
            if (!aerialVector.equals(ZERO_VEC3)) {
                aerialVector.set(0, 0, 0);
            }

            let spaceDown = getSpacePress();
            if (spaceDown) {
                aerialVector.add(new Vector3(0, 0.4 * (sprinting ? 2 : 1), 0));
                fall(deltaTimeSinceSceneStart);
            }
        } else {
            fall(deltaTimeSinceSceneStart);
        }
    };

    return (dt: number) => {

        const movementVector = new Vector3(0, 0, 0);

        const isGrounded = checkIsGrounded();
        applyJumpAndGravity(isGrounded, dt);
        assignSprinting(isGrounded);

        let speed = SPEED * (sprinting ? 3 : 1);

        if (keyboard.wDown) {
            moveForward(speed, movementVector);
        }
        if (keyboard.sDown) {
            moveForward(-speed, movementVector);
        }
        if (keyboard.aDown) {
            moveRight(-speed, movementVector);
        }
        if (keyboard.dDown) {
            moveRight(speed, movementVector);
        }

        if (!touchesASolid(movementVector, movementVector.length())) {
            camera.position.add(movementVector);
        } else {
            movementVector.multiply(ZERO_VEC3); // This is where the movement vector can be zero'd out.
        }

        applyCameraRotation(mouse, _euler);

        applyHeadBob(movementVector);

        checkCancelSprinting(movementVector);
        drawCrosshair(dt);

    };

};

export default setupFPSCharacter;