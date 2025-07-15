/**
 * @fileoverview 게임의 핵심 설정 값을 관리하는 파일
 */

// 게임의 전반적인 상태를 관리하는 객체
export const gameState = {
    players: {},
    maxPlayers: 4,
    isGameRunning: false,
    isRedLight: false, // true: 빨간불(정지), false: 초록불(움직여도 됨)
    movementThreshold: 15, // 움직임 감지를 위한 임계값 (맨해튼 거리 방식에 맞게 조정)
    redLightDuration: 1500, // 빨간불 상태 지속 시간 (ms)
    model: null, // PoseNet 모델 인스턴스
};

// DOM 요소
export const video = document.getElementById('video');
export const canvas = document.getElementById('canvas');
export const ctx = canvas.getContext('2d');
export const messageBox = document.getElementById('message-box');
export const startButton = document.getElementById('startButton');
export const playerList = document.getElementById('player-list');

// 결과 모달 요소
export const resultModal = document.getElementById('result-modal');
export const resultMessage = document.getElementById('result-message');
export const restartButton = document.getElementById('restart-button');
