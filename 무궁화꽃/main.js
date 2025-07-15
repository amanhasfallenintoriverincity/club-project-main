/**
 * @fileoverview 애플리케이션의 메인 진입점.
 * 각 모듈을 초기화하고 게임을 시작합니다.
 */

import { video, startButton, restartButton } from './config.js';
import { updateMessageBox, updateSidebar } from './ui.js';
import { loadPoseNet, detectPose } from './pose.js';
import { startGame, setupSpacebarWinner } from './game.js';

/**
 * 웹캠을 설정하고 비디오 스트림을 HTML video 요소에 연결합니다.
 * @returns {Promise<HTMLVideoElement>} 비디오 요소가 로드되면 resolve되는 Promise
 */
async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            width: 1280,
            height: 720,
        },
    });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

/**
 * 메인 함수. 애플리케이션을 초기화하고 실행합니다.
 */
async function main() {
    // 1. 웹캠 설정
    await setupCamera();
    video.play();

    // 2. 모델 로딩 UI 표시
    updateMessageBox('모델 로딩 중...', true);
    await loadPoseNet();
    updateMessageBox('', false);

    // 3. 포즈 감지 시작
    detectPose();

    // 4. 초기 UI 렌더링
    updateSidebar();

    // 5. 이벤트 리스너 설정
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame); // 모달의 다시 시작 버튼
    setupSpacebarWinner();
}

// 애플리케이션 시작
main();
