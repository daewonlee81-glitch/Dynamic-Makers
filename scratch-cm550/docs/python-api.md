# cm550 Python API (블록 ↔ Python 대응표)

Python 코드 패널은 블록을 아래 API로 번역합니다. 현재는 **보기 전용**이며, 이 표가 다음 단계
(브라우저 안 Python 실행 / CM-550 다운로드)에서 구현할 `cm550` 모듈의 규격입니다.

```python
from cm550 import *      # cm, dxl, port(), motion, wait, start, ... 를 가져옵니다
```

## 연결 · 컨트롤러 (`cm`)

| 블록 | Python |
|---|---|
| CM-550 [USB] 연결하기 | `cm.connect("usb")` / `cm.connect("ble")` |
| CM-550 연결 끊기 | `cm.disconnect()` |
| CM-550이 연결되었는가? | `cm.is_connected()` |
| 마지막 오류 | `cm.last_error()` |
| CM-550 LED 색 [노랑] (으)로 바꾸기 | `cm.led_color("yellow")` — 빨강·초록·파랑·노랑·하늘·보라·흰색·끄기 (보조 LED의 빨강·초록·파랑을 섞어 7색) |
| CM-550 LED [빨강] [켜기] | `cm.led("red", True)` — 한 가지 색만 켜고 끄기 (이전 프로젝트 호환) |
| 부저로 [24] 음을 [0.5] 초 동안 연주 | `cm.play_note(24, 0.5)` |
| 부저로 멜로디 [0] 번 연주 | `cm.play_melody(0)` |
| [START] 버튼이 눌렸는가? | `cm.button_pressed("start")` |
| 기울기 [롤] | `cm.imu.roll()` · `cm.imu.pitch()` · `cm.imu.yaw()` |
| 자이로 [x] / 가속도 [x] | `cm.imu.gyro("x")` / `cm.imu.accel("x")` |
| 배터리 전압 · 컨트롤러 온도 | `cm.voltage()` · `cm.temperature()` |
| 소리 감지 횟수 / 초기화 | `cm.sound_count()` / `cm.reset_sound_count()` |
| 다이나믹셀 전원 [켜기] | `cm.dxl_power(True)` |
| 장치 [ID] 주소 [A] 에 [n] 바이트 값 [V] 쓰기 | `cm.write(ID, A, V, size=n)` |
| 장치 [ID] 주소 [A] 의 [n] 바이트 값 | `cm.read(ID, A, size=n)` |

## 다이나믹셀 (`dxl`)

| 블록 | Python |
|---|---|
| 다이나믹셀 [1] 토크 [켜기] | `dxl.torque(1, True)` |
| … 을(를) [180]° 로 이동 (속도 [50] %) | `dxl.move_to(1, 180, speed=50)` |
| … 이동하고 기다리기 | `dxl.move_to(1, 180, speed=50, wait=True)` |
| [1] 을 [a]°, [2] 를 [b]° 로 동시에 이동 | `dxl.move_together({1: a, 2: b})` |
| 모두 함께 [초] 초 동안 움직이기 { … } | `with dxl.together(초):` | 안의 목표들이 모두 [초] 뒤에 함께 도착 (SYNC WRITE), 그동안 기다림 |
| 다이나믹셀 [ID] 목표 [a]° | `dxl.goal(ID, a)` | "모두 함께" 안에서 쓰는 목표 각도. 혼자 쓰면 바로 이동 |
| 바퀴 회전 속도 [50] % | `dxl.wheel(1, 50)` |
| 왼쪽 바퀴 [1] [50]%, 오른쪽 바퀴 [2] [-50]% | `dxl.wheels(1, 50, 2, -50)` |
| 정지 | `dxl.stop(1)` |
| 모드를 [위치/바퀴/확장 위치] 로 설정 | `dxl.set_mode(1, "position" / "wheel" / "extended")` |
| LED [켜기] | `dxl.led(1, True)` |
| 모든 다이나믹셀 토크 [켜기] | `dxl.torque_all(True)` |
| [1] 의 [현재 각도/속도/부하/온도/전압/모델/오류] | `dxl.position(1)` · `velocity` · `load` · `temperature` · `voltage` · `model` · `hardware_error` |
| 움직이는 중인가? | `dxl.is_moving(1)` |
| 연결된 다이나믹셀 ID 목록 | `dxl.scan()` |
| 다이나믹셀 [ID] 의 모델 이름 | `dxl.model_name(1)` → `"2XL430-W250"` |

### 연결된 모터 (모델에 따라 나타나는 블록)

| 블록 | Python | 나타나는 조건 |
|---|---|---|
| 다이나믹셀 2축 모듈 [모듈] A축 [a]°, B축 [b]° 로 이동 | `dxl.move_together({1: a, 2: b})` | 2XL430·2XC430 연결 시 |
| 다이나믹셀 2축 모듈 [모듈] 바퀴 A축 [%], B축 [%] | `dxl.wheels(1, a, 2, b)` | 2XL430·2XC430 연결 시 |
| 다이나믹셀 [ID] 을(를) 힘 [%] 로 [deg]° 까지 잡기 | `dxl.grip(1, deg, force=%)` | XL330·XC330·XM430·XH430 (전류 제어) 연결 시 |

모델별로 자동 처리되는 것: 2축 모듈의 A/B축 짝 찾기(설정 변경 시 다른 축 토크 잠시 해제), 이미 맞는 모드면 설정을 다시 쓰지 않음,
지원하지 않는 모델(XL-320 등) 차단, XL330처럼 5 V 모터가 CM-550 배터리 전압에 연결되면 경고.

## 5핀 포트 (`port(n)`)

| 블록 | Python |
|---|---|
| 포트 [1] 의 [IR/거리/터치/밝기/컬러/온도/자석/인체 감지/습도/사용자] 값 | `port(1).ir()` · `dms()` · `touch()` · `brightness()` · `color_code()` · `temperature()` · `magnet()` · `motion()` · `moisture()` · `analog()` |
| 터치 센서가 눌렸는가? | `port(1).touched()` |
| 컬러 센서가 [빨강] 인가? | `port(1).color() == "red"` |
| LED 모듈 [모두 켜기/왼쪽만/오른쪽만/모두 끄기] | `port(1).led("both" / "left" / "right" / "off")` |
| 서보모터를 [150]° 로 이동 | `port(1).servo(150)` |
| 기어모터 속도 [50] % | `port(1).motor(50)` |

## 모션 (`motion`)

| 블록 | Python |
|---|---|
| 모션 [1] 번 재생 / 재생하고 기다리기 | `motion.play(1)` / `motion.play(1, wait=True)` |
| 모션 정지 [현재 동작이 끝나면/키프레임/즉시] | `motion.stop("unit" / "keyframe" / "now")` |
| 모션 속도를 [100] % 로 설정 | `motion.set_speed(100)` |
| 다음 모션 페이지를 [n] 번으로 | `motion.set_next(n)` |
| 모션이 재생 중인가? · 저장된 모션 개수 | `motion.is_playing()` · `motion.count()` |

## 자세 가르치기 (`pose`)

자세는 프로젝트의 리스트 **로봇 자세**에 `1:180 2:175.5 …`(ID:각도) 형식으로 한 줄씩 저장됩니다.

| 블록 | Python |
|---|---|
| 모든 관절 [힘 빼기 / 힘 주기] | `pose.torque(False)` / `pose.torque(True)` — 힘을 줄 때 지금 자세를 그대로 유지 |
| 지금 자세를 [n] 번 자세로 기록하기 | `pose.record(n)` |
| 자세 [n] 번으로 [s] 초 동안 움직이기 | `pose.play(n, s)` — 모든 관절이 s초 뒤 함께 도착 |
| 기록한 자세 모두 차례로 움직이기 (자세마다 [s] 초) | `pose.play_all(s)` |
| 기록한 자세 개수 · 기록한 자세 모두 지우기 | `pose.count()` · `pose.clear()` |

## AI 학습 (`ai`)

AI 학습 패널에서 카메라·소리·로봇 센서 중 하나로 종류별 예시를 모은 뒤 사용합니다(k-최근접 이웃 분류).

| 블록 | Python |
|---|---|
| AI가 [종류] 을(를) 알아봤을 때 | `@ai.when_recognized("종류")` 를 붙인 함수 |
| AI가 알아본 것 | `ai.label()` — 확신이 60% 미만이면 빈 문자열 |
| AI가 알아본 것이 [종류] 인가? | `ai.label() == "종류"` |
| AI가 [종류] (이)라고 생각하는 정도 (%) | `ai.confidence("종류")` |
| AI 인식 [켜기/끄기] | `ai.start()` / `ai.stop()` |

## 몸 동작 — 스켈레톤 (`body`)

PC 카메라로 사람의 관절 17곳을 찾습니다(MoveNet). 왼쪽·오른쪽은 **사람 기준**, 위치는 미리보기(거울) 기준 -100~100.

| 블록 | Python |
|---|---|
| 카메라에 사람이 보이는가? | `body.visible()` |
| 사람의 [왼쪽 어깨 (팔 올림)] 각도 | `body.angle("leftShoulder")` — 어깨: 팔 내림 0° · 옆으로 90° · 위로 180°, 팔꿈치·무릎: 펴면 0° (굽힐수록 커짐), 몸·머리 기울기: 사람의 왼쪽으로 + |
| 사람의 [오른손] [x/y] 위치 | `body.position("rightHand", "x")` |
| 다이나믹셀 [ID] 이(가) 사람의 [관절] 따라 하기 (가운데 [180]°, [같은/반대 방향]) | `dxl.follow(ID, body.angle("rightShoulder"), center=180, direction=1)` — 목표 = 가운데 ± 관절 각도 |
| 몸 동작 추적 [켜기/끄기] | `body.start()` / `body.stop()` |

관절 값: `leftShoulder` `rightShoulder` `leftElbow` `rightElbow` `leftKnee` `rightKnee` `body` `head`,
위치: `nose` `leftHand` `rightHand` `leftFoot` `rightFoot` `leftShoulder` `rightShoulder`.

## 걸음 — 3D 시뮬레이터에서 학습 (`walk`)

| 블록 | Python |
|---|---|
| 학습한 걸음으로 [10] 초 걷기 (느리게 [1] 배) | `walk.gait(10, slow=1)` — 3D 탭 [걸음 학습]으로 찾은 7개 숫자의 리듬 걸음 |
| 강화학습 정책으로 [10] 초 걷기 | `walk.policy(10)` — Python 키트(`sim/train_es.py`)로 학습한 신경망 |
| 걷기 멈추기 · 걷는 중인가? | `walk.stop()` · `walk.is_walking()` |

## Scratch 기본 블록

| 블록 | Python |
|---|---|
| 초록 깃발을 클릭했을 때 (스크립트 1개) | 최상위 코드 |
| 시작 블록이 여러 개 | `@when_flag_clicked` / `@when_key_pressed("space")` / `@when_broadcast("메시지")` / `@when_clicked` 함수 + 마지막 줄 `start()` (동시 실행) |
| [1] 초 기다리기 | `wait(1)` |
| [10] 번 반복하기 / 무한 반복하기 | `for _ in range(10):` / `while True:` |
| 만약 ~ 라면 / 아니면 | `if …:` / `else:` |
| ~ 까지 기다리기 / ~ 까지 반복하기 | `while not …: wait(0.01)` / `while not …:` |
| 멈추기 [모두] / [이 스크립트] | `stop_all()` / `return` |
| 변수 정하기 / 바꾸기 | `점수 = 0` / `점수 += 1` (함수 안에서는 `global 점수`) |
| 리스트 추가 · 삭제 · 넣기 · 바꾸기 · 항목 · 길이 · 포함 | `append` · `del lst[i-1]` · `insert` · `lst[i-1] = v` · `lst[i-1]` · `len()` · `in` (Scratch 1번 → Python 0번) |
| 연산 (+ − × ÷ 나머지 반올림 난수 비교 그리고/또는/아니다) | `+ - * / % round() random.randint() > < == and or not` |
| 결합하기 · 글자 · 길이 · 포함 | `str(a) + str(b)` · `s[n-1]` · `len(s)` · `b in s` |
| [제곱근 ▼] (수학 함수) | `math.sqrt()` 등, 삼각함수는 도(degree) 단위로 변환 |
| 내 블록 (정의 / 실행) | `def 이름(인자):` / `이름(값)` |
| 말하기 / 생각하기 (n초 동안) | `print(…)` (+ `wait(n)`) |
| 묻고 기다리기 · 대답 | `answer = input(…)` · `answer` |
| 타이머 · 타이머 초기화 · 키가 눌렸는가? | `timer()` · `reset_timer()` · `key_pressed("space")` |
| 방송하기 (기다리기) | `broadcast("메시지")` (`wait=True`) |

변환되지 않는 블록(스프라이트 동작·형태·소리·펜 등)은 그 자리에 `# [변환 안 됨] opcode` 주석으로 남고,
코드 맨 위에 목록이 표시됩니다. 시작 블록에 붙지 않은 블록 묶음은 제외됩니다.

변수·내 블록 이름은 한글 그대로 Python 식별자로 사용합니다(Python 3는 한글 변수명을 지원).
공백·기호는 `_` 로 바뀌고, 숫자로 시작하면 앞에 `_` 를 붙이며, 예약어·API 이름과 겹치면 뒤에 `_` 를 붙입니다.
