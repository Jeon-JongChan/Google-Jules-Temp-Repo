---
name: godot-dev
description: >-
  Eradel Godot 4.6 게임 개발 워크플로. GDScript 작성, 씬·노드 설계, 시그널·입력·물리·UI 구현,
  project.godot 설정 시 사용. Godot, GDScript, tscn, 노드, 씬, Jolt 물리, 게임 기능 추가·디버깅 요청 시 적용.
---

# Godot 개발 (Eradel)

## 시작 전

1. `docs/design/` — 관련 기획 문서(GDD, 시스템·레벨 기획) 확인
2. `project.godot` — 버전(4.6), autoload, 입력맵, 물리 엔진(Jolt) 확인
3. 관련 `.tscn`·`.gd`·`.tres` 읽기 — 기존 노드명·시그널·그룹 재사용
4. 2D/3D·물리 여부 파악 후 적절한 베이스 노드 선택

## 기능 추가 워크플로

```
- [ ] 요구사항을 씬/스크립트 단위로 분해
- [ ] 씬 구조(노드 트리) 설계 또는 기존 씬 확장
- [ ] 스크립트·리소스·시그널 연결
- [ ] InputMap / 레이어·마스크 / 그룹 설정
- [ ] 에디터에서 실행해 동작 확인 (가능하면)
```

## 설계 원칙

| 주제 | 권장 |
|------|------|
| 상태 공유 | Autoload 싱글톤 또는 Resource — 전역 변수 남발 금지 |
| 엔티티 간 통신 | 시그널, 그룹 + `call_group`, 이벤트 버스 Autoload |
| 데이터 | `@export` + Resource(`.tres`) — 하드코딩 최소화 |
| 충돌 | 레이어/마스크 인스펙터 설정, `collision_layer` 비트 확인 |
| UI | `Control` 앵커·컨테이너 레이아웃, 별도 UI 씬 |

## Godot 4.6 자주 쓰는 패턴

**씬 전환**
```gdscript
get_tree().change_scene_to_file("res://scenes/world/main.tscn")
```

**지연·트윈**
```gdscript
await get_tree().create_timer(1.0).timeout
var tween := create_tween()
tween.tween_property(self, "position", target, 0.3)
```

**입력 액션** — `project.godot` InputMap에 정의 후:
```gdscript
if Input.is_action_just_pressed("jump"):
	pass
```

**3D 이동 (CharacterBody3D + Jolt)**
```gdscript
func _physics_process(delta: float) -> void:
	velocity.y -= 9.8 * delta
	move_and_slide()
```

## 디버깅

- `push_warning` / `push_error` + 맥락 문자열
- 에디터: **원격 씬 트리**, **모니터**(FPS·draw calls)
- 물리: `Visible Collision Shapes`, 레이어/마스크 불일치 우선 의심

## 파일 수정 가이드

| 파일 | 주의 |
|------|------|
| `.gd` | 타입 힌트, `@export`·시그널 위쪽 배치 |
| `.tscn` | 최소 diff, `uid`·`ext_resource` 참조 유지 |
| `project.godot` | autoload·input·layer 변경 시 영향 설명 |
| `.import` | 직접 수정 금지 — 에디터·소스 에셋으로 관리 |

## 추가 참고

- 상세 API·안티패턴: [reference.md](reference.md)
