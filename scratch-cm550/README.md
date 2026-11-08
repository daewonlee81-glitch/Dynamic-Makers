# scratch-cm550 — ROBOTIS CM-550 · 다이나믹셀 Scratch 3.0 확장 블록

Scratch 3.0에서 **ROBOTIS CM-550 컨트롤러**와 **다이나믹셀 X 시리즈(XL-330 / XL-430 / 2XL-430)**를
USB 또는 블루투스(BLE)로 직접 제어하는 확장 블록입니다. 별도의 드라이버·Scratch Link 없이
브라우저의 **Web Serial / Web Bluetooth** API로 통신합니다 (Chrome · Edge).

```
PC(Scratch) ── USB 또는 BLE ──▶ CM-550 (ID 200, Protocol 2.0)
                                   └─ ID ≠ 200 패킷은 다이나믹셀 버스로 중계
```

## Python 코드 패널 (Pybricks 방식)

코드 탭 오른쪽에 현재 스프라이트의 블록을 **실시간으로 Python으로 번역한 코드**가 표시됩니다(읽기 전용).
블록을 끌어다 놓거나 값을 바꾸면 0.15초 안에 갱신되고, 문법 색상·줄 번호·복사 버튼이 있습니다.
왼쪽 가장자리를 끌어 폭을 조절하고, **닫기**로 접으면 오른쪽에 세로 **Python** 탭이 남습니다
(열림 상태·폭은 브라우저에 기억됨). 화면이 좁으면 우측 상단의 **작은 무대** 버튼을 눌러 블록 영역을 넓히세요.

* 정식 포크: 블록 영역과 나란히 배치됩니다.
* TurboWarp: 블록 영역 오른쪽 위에 겹쳐 표시됩니다(GUI 소스를 바꿀 수 없기 때문).
* 블록 ↔ Python 대응표와 `cm550` 모듈 규격: [`docs/python-api.md`](docs/python-api.md)
* 현재는 **보기 전용**입니다. 생성된 Python을 실제로 실행하는 기능(브라우저 내 Pyodide 실행)은 다음 단계입니다.

```python
# 블록에서 자동으로 만들어진 Python 코드 (로봇)
from cm550 import *

점수 = 0

def 인사하기(횟수):
    for _ in range(int(횟수)):
        cm.play_note(24, 0.2)

# 초록 깃발을 클릭했을 때
cm.connect("usb")
인사하기(3)
dxl.torque(1, True)
while True:
    if port(1).dms() > 300:
        dxl.wheels(1, 50, 2, -50)
    else:
        dxl.wheels(1, 0, 2, 0)
        점수 += 1
    wait(0.1)
```

## 블록 목록 (44개 + 연결 버튼 2개)

| 그룹 | 블록 |
|---|---|
| 연결 | USB로 연결하기(버튼) · 블루투스로 연결하기(버튼) · CM-550 [USB/블루투스] 연결하기 · 연결 끊기 · 연결되었는가? · 마지막 오류 |
| 다이나믹셀 | 토크 켜기/끄기 · N° 로 이동(속도 %) · 이동하고 기다리기 · 두 모터 동시에 이동 · 바퀴 회전 속도 % · 왼쪽/오른쪽 바퀴 속도 · 정지 · 모드 설정(위치/바퀴/확장위치) · LED · 모든 토크 켜기/끄기 · 현재 각도/속도/부하/온도/전압/모델/오류 읽기 · 움직이는 중인가? · 연결된 ID 목록 |
| CM-550 내장 | LED 빨강/초록/파랑 · 부저 음계 연주 · 멜로디 연주 · START/MODE 버튼 · 기울기(롤/피치/요) · 자이로 · 가속도 · 배터리 전압 · 온도 · 소리 감지 횟수/초기화 · 다이나믹셀 전원 |
| 5핀 포트 | 센서 값(IR·DMS·터치·밝기·컬러·온도·자석·인체감지·습도·사용자) · 터치 눌렸는가? · 컬러가 ~인가? · LED 모듈 · 서보모터 각도 · 기어모터 속도 |
| 모션 | 모션 N 재생 · 재생하고 기다리기 · 정지(즉시/키프레임/유닛) · 속도 % · 다음 페이지 · 재생 중인가? · 저장된 모션 개수 |
| 고급 | 장치 ID·주소·크기 지정 쓰기/읽기 (컨트롤 테이블 직접 접근) |

* 각도: 0 ~ 360°, 180°가 중앙(2048). 속도 %는 모터의 Velocity Limit 대비 비율입니다.
* 모드는 자동 전환됩니다 — "이동" 블록은 위치 모드로, "바퀴" 블록은 속도 모드로 토크를 껐다 켜며 바꿉니다.
* 포트 센서 블록은 해당 포트의 Module Category(주소 390~398)를 자동 설정한 뒤 읽습니다.
* 모션은 R+ Task 3.0으로 CM-550에 저장해 둔 모션 페이지를 재생합니다.
* 프로젝트 정지(빨간 버튼)를 누르면 재생 중인 모션과 바퀴 모드 모터를 멈춥니다.

## 1. 가장 빠른 사용법 — TurboWarp (빌드 불필요)

1. `dist/cm550-turbowarp.js` 를 웹에 올리거나(GitHub Pages 등) 로컬 파일로 준비합니다.
2. https://turbowarp.org/editor 접속 → 왼쪽 아래 **확장 기능 추가** → **사용자 정의 확장 기능**
   → URL 또는 파일 선택 → **"샌드박스 없이 실행"(Run without sandbox)** 을 켭니다.
   (URL로 열 때: `https://turbowarp.org/editor?extension=<파일 URL>`)
3. 카테고리 **CM-550** 의 **USB로 연결하기** 버튼을 누르고 포트를 고릅니다.

> 샌드박스 해제가 필요한 이유: Web Serial / Web Bluetooth 는 페이지 메인 스레드에서만 쓸 수 있습니다.

## 2. 정식 Scratch 3.0(scratch-gui) 포크에 내장하기

```bash
git clone https://github.com/scratchfoundation/scratch-editor
git clone <이 저장소> scratch-cm550
bash scratch-cm550/scripts/install-into-scratch-editor.sh ./scratch-editor
cd scratch-editor && npm ci
npm run build                                   # 하위 패키지(storage/render/vm …) 빌드
npm --workspace @scratch/scratch-gui start      # http://localhost:8601
npm --workspace @scratch/scratch-gui run build  # 정적 배포본: packages/scratch-gui/build
```

설치 스크립트가 하는 일(재실행해도 안전):

| 대상 | 변경 |
|---|---|
| `packages/scratch-vm/src/extensions/scratch3_cm550/` | 확장 본체 복사 (`index.js` + `lib/`) |
| `packages/scratch-vm/src/extension-support/extension-manager.js` | `cm550` 내장 확장 등록 |
| `packages/scratch-gui/src/lib/libraries/extensions/index.jsx` | 확장 라이브러리 카드 추가 (`cm550/` 아이콘) |
| `packages/scratch-gui/src/reducers/locales.js` | 영어/한국어 블록 텍스트 병합 |
| `packages/scratch-gui/src/containers/blocks.jsx` | 툴박스 "연결하기" 버튼 콜백 등록 |
| `packages/scratch-gui/src/components/python-panel/` | Python 코드 패널 (변환기·문법 강조 포함) |
| `packages/scratch-gui/src/components/gui/gui.jsx` | 코드 탭에 패널 배치 (스프라이트 워터마크는 블록 영역 안으로 이동) |
| `packages/scratch-vm/src/engine/runtime.js` | 툴박스 버튼 콜백 키 허용 |

## 3. 하드웨어 준비

* **USB**: CM-550 을 micro-USB 로 PC에 연결하고 전원을 켭니다. 연결 시 확장이 자동으로
  CM-550 을 Manage 모드(주소 21 = 2)로 전환하므로 실행 중인 Task 코드는 멈춥니다.
* **블루투스**: CM-550 의 MODE 버튼을 눌러 BLE 모드(초록 LED 점멸)로 둡니다.
  Web Bluetooth 는 Windows 10+ / macOS / Android / ChromeOS 에서 동작하며 iOS Safari 는 지원하지 않습니다.
  BLE 는 1패킷 20바이트 분할 전송이므로 USB 보다 느립니다(응답 대기 600 ms).
* 다이나믹셀 전원(주소 22)이 꺼져 있으면 **다이나믹셀 전원 켜기** 블록을 먼저 실행하세요.
* 브라우저 보안 정책상 USB/BLE 선택 창은 **사용자 클릭 직후**에만 열립니다 → 연결 블록은 버튼이나
  "클릭했을 때" 스크립트에서 쓰세요.

## 4. 개발

```bash
npm test          # Protocol 2.0 패킷 · 장치 계층 · Python 변환기(CPython 문법 검사 포함) · 브라우저 번들 테스트
npm run build     # dist/cm550-turbowarp.js 번들 생성 (esbuild)
```

```
src/protocol2.js   Protocol 2.0 패킷 생성/파싱, CRC-16, 바이트 스터핑
src/transport.js   WebSerialTransport · WebBluetoothTransport
src/cm550.js       CM-550/다이나믹셀 컨트롤 테이블 상수, 요청 큐, 고수준 동작
src/extension.js   Scratch 블록 정의 + 구현 (환경 독립)
src/python-generator.js  블록 → Python 변환기 (순수 JS)
src/python-highlight.js  Python 문법 강조
src/python-panel-dom.js  TurboWarp용 패널 (프레임워크 없음)
src/translations.js 영어 블록 텍스트
src/turbowarp-entry.js  TurboWarp 등록 진입점
scratch-vm/index.js     scratch-vm 내장 확장 진입점
scratch-gui/            라이브러리 카드 + 아이콘 + python-panel (React 컴포넌트)
```

### BLE UUID 참고
CM-550 내장 BLE(BT-410 호환)의 서비스 UUID 는 공개 문서에 없어 연결 시 `FFF0` → `FFE0` → Nordic UART
순으로 탐색하고, 특성의 write / notify 속성으로 송·수신 채널을 자동 판별합니다. 다른 UUID 를 쓰는 펌웨어라면
`src/transport.js` 의 `BLE_PROFILES` 에 추가하면 됩니다.

## 참고 자료
* CM-550 e-Manual (컨트롤 테이블): https://emanual.robotis.com/docs/en/parts/controller/cm-550/
* DYNAMIXEL Protocol 2.0: https://emanual.robotis.com/docs/en/dxl/protocol2/
* XL-430 / XL-330 컨트롤 테이블: https://emanual.robotis.com/docs/en/dxl/x/

라이선스: MIT (scratch-editor 자체는 AGPL-3.0 / BSD — 포크 배포 시 해당 라이선스를 따릅니다)
