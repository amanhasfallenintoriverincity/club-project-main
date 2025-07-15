    /**
 * @fileoverview PoseNet과 Face-API.js를 사용하여 포즈와 얼굴을 감지하고,
 * 이를 기반으로 플레이어를 추적하고 상태를 업데이트하는 로직을 관리합니다.
 */

import { gameState, video } from './config.js';
import { drawCanvas, updateSidebar } from './ui.js';


/**
 * PoseNet 모델을 로드하고 gameState.model에 할당합니다.
 */
export async function loadPoseNet() {
    gameState.model = await posenet.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        inputResolution: { width: 1280, height: 720 },
        multiplier: 0.50 // 정확도를 약간 낮추는 대신 처리 속도 향상
    });
}

/**
 * 비디오 스트림에서 지속적으로 포즈를 감지하고 게임 상태를 업데이트합니다.
 */
export async function detectPose() {
    if (!gameState.model || video.paused || video.ended) {
        requestAnimationFrame(detectPose);
        return;
    }

    const poses = await gameState.model.estimateMultiplePoses(video, {
        flipHorizontal: true,
        maxDetections: gameState.maxPlayers,
        scoreThreshold: 0.5,
        nmsRadius: 20
    });

    updatePlayers(poses);
    drawCanvas(poses);

    requestAnimationFrame(detectPose);
}

/**
 * 감지된 포즈를 기반으로 플레이어 상태를 업데이트합니다.
 * 플레이어는 화면상의 위치에 따라 구분됩니다.
 * @param {Array} poses - PoseNet에서 감지된 포즈 배열
 */
function updatePlayers(poses) {
    const newPlayers = {};
    const playerZoneWidth = video.width / gameState.maxPlayers;

    poses.forEach(pose => {
        const nose = pose.keypoints[0];
        if (nose.score < 0.5) return;

        const playerZone = Math.floor(nose.position.x / playerZoneWidth);
        const playerId = playerZone + 1;

        if (playerId > gameState.maxPlayers || newPlayers[playerId]) {
            return;
        }

        const existingPlayer = gameState.players[playerId] || {};

        let isOut = existingPlayer.isOut || false;
        if (gameState.isRedLight && existingPlayer.previousPose && !isOut) {
            const movement = calculateMovement(existingPlayer.previousPose, pose);
            if (movement > gameState.movementThreshold) {
                isOut = true;
            }
        }

        newPlayers[playerId] = {
            id: playerId,
            pose: pose,
            previousPose: !gameState.isRedLight ? pose : existingPlayer.previousPose,
            isOut: isOut,
            lastSeen: Date.now()
        };
    });

    // 기존 플레이어 정보를 업데이트하고, 오랫동안 보이지 않는 플레이어를 정리합니다.
    for (const id in gameState.players) {
        if (!newPlayers[id]) {
            if (Date.now() - gameState.players[id].lastSeen > 5000) { // 5초 이상 안보이면 제거
                delete gameState.players[id];
            }
        }
    }
    
    // 새로운 정보로 gameState.players를 업데이트합니다.
    for (const id in newPlayers) {
        gameState.players[id] = newPlayers[id];
    }

    updateSidebar();
}

/**
 * 이전 포즈와 현재 포즈의 유클리드 거리 평균을 계산하여 움직임을 측정합니다.
 * 최적화를 위해 미리 정의된 핵심 관절(어깨, 팔꿈치, 손목, 무릎)만 사용합니다.
 * @param {object} prevPose - 이전 프레임의 포즈 데이터
 * @param {object} currentPose - 현재 프레임의 포즈 데이터
 * @returns {number} 계산된 움직임 값
 */
function calculateMovement(prevPose, currentPose) {
    if (!prevPose || !currentPose) return 0;

    // 움직임 감지를 위한 핵심 keypoint 인덱스 (어깨, 팔꿈치, 손목, 무릎)
    const coreKeypointIndices = [5, 6, 7, 8, 9, 10, 13, 14];
    let totalDistance = 0;
    let validKeypoints = 0;

    for (const i of coreKeypointIndices) {
        const prevKeypoint = prevPose.keypoints[i];
        const currentKeypoint = currentPose.keypoints[i];

        // 두 프레임 모두에서 keypoint가 유효할 경우에만 계산에 포함
        if (prevKeypoint && currentKeypoint && prevKeypoint.score > 0.2 && currentKeypoint.score > 0.2) {
            const dx = prevKeypoint.position.x - currentKeypoint.position.x;
            const dy = prevKeypoint.position.y - currentKeypoint.position.y;
            // 성능 향상을 위해 유클리드 거리 대신 맨해튼 거리(Math.abs(dx) + Math.abs(dy)) 사용
            totalDistance += Math.abs(dx) + Math.abs(dy);
            validKeypoints++;
        }
    }

    // 유효한 keypoint가 있을 경우에만 평균을 계산하여 반환
    return validKeypoints > 0 ? totalDistance / validKeypoints : 0;
}
