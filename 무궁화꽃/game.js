/**
 * @fileoverview 게임의 핵심 로직(시작, 루프, 종료)을 관리하는 파일
 */

import { gameState, startButton } from './config.js';
import { updateMessageBox, showResultModal, hideResultModal, flashWarning, speak } from './ui.js';

/**
 * 게임을 시작합니다.
 */
export function startGame() {
    hideResultModal(); // 이전 게임 결과 모달 숨기기
    gameState.isGameRunning = true;
    startButton.disabled = true;
    startButton.textContent = '게임 진행 중...';

    // 모든 플레이어의 상태를 초기화합니다.
    Object.values(gameState.players).forEach(p => {
        p.isOut = false;
        p.previousPose = null;
    });

    // 감지된 플레이어가 없으면 플레이어 목록을 비웁니다.
    if (Object.keys(gameState.players).length === 0) {
        gameState.players = {};
    }

    // 게임 루프를 시작합니다.
    gameLoop();
}

/**
 * 게임을 종료하고 결과 모달을 표시합니다.
 * @param {string} message - 종료 메시지
 */
function endGame(message) {
    gameState.isGameRunning = false;
    showResultModal(message);
    startButton.disabled = false;
    startButton.textContent = '다시 시작';
}

/**
 * 게임 패배 조건을 확인합니다. (모든 플레이어 탈락)
 * @returns {boolean} 게임 종료 여부
 */
function checkGameOver() {
    const totalPlayers = Object.keys(gameState.players).length;
    if (totalPlayers === 0) return false;

    const activePlayers = Object.values(gameState.players).filter(p => !p.isOut);

    // 모든 플레이어가 탈락하면 게임오버
    if (activePlayers.length === 0) {
        endGame("패배! 모든 플레이어가 탈락했습니다.");
        return true;
    }

    return false;
}

/**
 * 메인 게임 루프. '초록불'과 '빨간불' 상태를 반복합니다.
 */
async function gameLoop() {
    if (!gameState.isGameRunning) return;

    if (checkGameOver()) return;

    // --- 초록불 상태 ---
    gameState.isRedLight = false;
    updateMessageBox('무궁화 꽃이 피었습니다', true);
    for (const id in gameState.players) {
        gameState.players[id].previousPose = null;
    }
    // "무궁화 꽃이 피었습니다" 음성 출력 (음성이 끝날 때까지 대기)
    await speak('무궁화 꽃이 피었습니다');

    if (!gameState.isGameRunning) return;

    // --- 빨간불 상태 ---
    flashWarning(); // 경고 플래시
    updateMessageBox('정지!', true);
    await speak('정지!'); // "정지" 음성 출력
    
    gameState.isRedLight = true;
    // 빨간불이 시작될 때 현재 포즈를 'previousPose'로 저장
    for (const id in gameState.players) {
        const player = gameState.players[id];
        if (player) {
            player.previousPose = player.pose;
        }
    }

    // 설정된 시간만큼 빨간불 유지
    await new Promise(resolve => setTimeout(resolve, gameState.redLightDuration));

    // 다음 게임 루프를 비동기적으로 호출
    requestAnimationFrame(gameLoop);
}

/**
 * 스페이스바를 눌러 승리하는 이벤트를 처리합니다.
 */
export function setupSpacebarWinner() {
    window.addEventListener('keydown', (e) => {
        // 게임이 실행 중일 때 스페이스바를 누르면
        if (e.code === 'Space' && gameState.isGameRunning) {
            // 탈락하지 않은 플레이어가 한 명이라도 있으면 승리
            const hasActivePlayer = Object.values(gameState.players).some(p => !p.isOut);
            if (hasActivePlayer) {
                endGame("플레이어 승리!");
            }
        }
    });
}
