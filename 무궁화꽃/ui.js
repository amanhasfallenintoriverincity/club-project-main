/**
 * @fileoverview UI 렌더링 및 업데이트 관련 함수들을 관리하는 파일
 */

import { gameState, video, canvas, ctx, playerList, messageBox, resultModal, resultMessage } from './config.js';

/**
 * 캔버스에 비디오 프레임과 포즈를 그립니다.
 * @param {Array} poses - 감지된 포즈 데이터
 */
export function drawCanvas(poses) {
    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 좌우 반전된 비디오를 캔버스에 그립니다.
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 각 플레이어의 포즈와 상태를 그립니다.
    for (const id in gameState.players) {
        const player = gameState.players[id];
        if (player.pose) {
            // 탈락한 플레이어는 반투명 오버레이로 표시
            if (player.isOut) {
                drawPlayerOverlay(player.pose);
            }
            // 포즈의 주요 관절과 뼈대를 그립니다.
            drawKeypoints(player.pose.keypoints);
            drawSkeleton(player.pose.keypoints);
            // 플레이어 번호와 상태 텍스트를 표시합니다.
            drawPlayerNumber(player);
        }
    }
}

/**
 * 플레이어의 주요 관절(Keypoints)을 캔버스에 그립니다.
 * @param {Array} keypoints - PoseNet에서 감지된 keypoints 배열
 */
function drawKeypoints(keypoints) {
    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];
        if (keypoint.score > 0.2) {
            ctx.beginPath();
            ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }
    }
}

/**
 * 플레이어의 뼈대(Skeleton)를 캔버스에 그립니다.
 * @param {Array} keypoints - PoseNet에서 감지된 keypoints 배열
 */
function drawSkeleton(keypoints) {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, 0.2);

    adjacentKeyPoints.forEach((keypoints) => {
        ctx.beginPath();
        ctx.moveTo(keypoints[0].position.x, keypoints[0].position.y);
        ctx.lineTo(keypoints[1].position.x, keypoints[1].position.y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'aqua';
        ctx.stroke();
    });
}

/**
 * 탈락한 플레이어 위에 반투명 오버레이를 그립니다.
 * @param {object} pose - 탈락한 플레이어의 포즈 데이터
 */
function drawPlayerOverlay(pose) {
    // 플레이어의 바운딩 박스를 근사치로 계산합니다.
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    pose.keypoints.forEach(p => {
        if (p.score > 0.2) {
            minX = Math.min(minX, p.position.x);
            minY = Math.min(minY, p.position.y);
            maxX = Math.max(maxX, p.position.x);
            maxY = Math.max(maxY, p.position.y);
        }
    });
    const padding = 20;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(minX - padding, minY - padding, (maxX - minX) + padding * 2, (maxY - minY) + padding * 2);
}


/**
 * 플레이어의 번호와 상태를 캔버스에 표시합니다.
 * @param {object} player - 플레이어 정보 객체
 */
function drawPlayerNumber(player) {
    const nose = player.pose.keypoints[0]; // 코를 기준으로 위치 선정
    ctx.fillStyle = player.isOut ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.font = '30px Arial';
    const text = player.isOut ? `Player ${player.id} (탈락)` : `Player ${player.id}`;
    const textWidth = ctx.measureText(text).width;
    const x = nose.position.x - textWidth / 2;
    const y = nose.position.y - 30; // 코 위에 표시

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
}

/**
 * 사이드바의 플레이어 목록 UI를 업데이트합니다.
 */
export function updateSidebar() {
    playerList.innerHTML = '';
    const playerIds = Object.keys(gameState.players).sort((a, b) => a - b);

    // 최대 플레이어 수만큼 목록 아이템 생성
    for (let i = 1; i <= gameState.maxPlayers; i++) {
        const li = document.createElement('li');
        const player = gameState.players[i];
        
        if (player) {
            li.textContent = `Player ${i}`;
            li.classList.add(player.isOut ? 'out' : 'active');
        } else {
            li.textContent = `Player ${i} (대기중)`;
        }
        playerList.appendChild(li);
    }
}

/**
 * 중앙 메시지 박스의 텍스트와 표시 여부를 업데이트합니다.
 * @param {string} text - 표시할 메시지
 * @param {boolean} show - 표시 여부
 */
export function updateMessageBox(text, show) {
    messageBox.textContent = text;
    messageBox.style.display = show ? 'block' : 'none';
}

/**
 * 게임 결과 모달을 표시합니다.
 * @param {string} message - 모달에 표시할 결과 메시지
 */
export function showResultModal(message) {
    resultMessage.textContent = message;
    resultModal.style.display = 'flex';
}

/**
 * 게임 결과 모달을 숨깁니다.
 */
export function hideResultModal() {
    resultModal.style.display = 'none';
}

/**
 * 화면 전체에 빨간색 경고 플래시 효과를 줍니다.
 */
export function flashWarning() {
    document.body.style.transition = 'background-color 0.1s ease';
    document.body.style.backgroundColor = 'red';
    setTimeout(() => {
        document.body.style.backgroundColor = '#f0f0f0'; // 원래 배경색으로 복원
    }, 500); // 지속 시간을 0.5초로 변경
}

/**
 * 사용 가능한 음성 목록을 가져와 Google 한국어 음성을 찾아 반환합니다.
 * @returns {Promise<SpeechSynthesisVoice|null>} Google 한국어 음성 객체 또는 null
 */
function getGoogleKoreanVoice() {
    return new Promise(resolve => {
        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const googleVoice = voices.find(voice => voice.name.includes('Google') && voice.lang === 'ko-KR');
            resolve(googleVoice || null);
            return;
        }
        // voices가 비어있을 경우, 'voiceschanged' 이벤트를 기다립니다.
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            const googleVoice = voices.find(voice => voice.name.includes('Google') && voice.lang === 'ko-KR');
            resolve(googleVoice || null);
        };
    });
}


/**
 * 주어진 텍스트를 음성으로 변환하여 재생합니다. (Web Speech API)
 * Google 한국어 음성을 우선적으로 사용합니다.
 * @param {string} text - 음성으로 변환할 텍스트
 * @returns {Promise<void>} 음성 출력이 끝나면 resolve되는 Promise
 */
export async function speak(text) {
    if (!window.speechSynthesis) {
        console.warn("Web Speech API is not supported in this browser.");
        return;
    }

    const googleVoice = await getGoogleKoreanVoice();
    
    return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.1;
        utterance.pitch = 1.5;

        if (googleVoice) {
            utterance.voice = googleVoice;
        } else {
            console.warn("Google Korean voice not found. Using default voice.");
        }

        utterance.onend = () => resolve();
        utterance.onerror = (event) => {
            console.error("SpeechSynthesisUtterance.onerror", event);
            reject(event);
        };

        window.speechSynthesis.speak(utterance);
    });
}
