# Godot 4.6 참고

## 노드 선택 (3D 게임)

| 목적 | 노드 |
|------|------|
| 중력·벽 슬라이드 캐릭터 | `CharacterBody3D` |
| Rigid 시뮬 | `RigidBody3D` |
| 정적 지형·벽 | `StaticBody3D` |
| 트리거·히트박스 | `Area3D` |
| 레이캐스트 | `RayCast3D` / `PhysicsRayQueryParameters3D` |

## 시그널 연결

```gdscript
# 코드에서 (타깃 메서드 존재 확인)
health_changed.connect(_on_health_changed)

func _on_health_changed(current: int, maximum: int) -> void:
	pass
```

에디터 연결 가능하면 인스펙터 **노드** 탭 우선.

## Resource 데이터 클래스

```gdscript
# item_data.gd
class_name ItemData
extends Resource

@export var id: StringName
@export var display_name: String
@export var icon: Texture2D
```

`.tres`로 인스턴스화해 `@export var items: Array[ItemData]`에 할당.

## Autoload 등록

`project.godot`:
```ini
[autoload]
GameState="*res://scripts/autoload/game_state.gd"
```

`*` 접두사 = 씬 트리 루트에 인스턴스.

## 물리 레이어

`project.godot`의 `layer_names`에 이름 부여 후 비트마스크 설정.
코드에서 매직 넘버 대신 상수:
```gdscript
const LAYER_PLAYER := 1  # bit 0
const LAYER_ENEMY := 2   # bit 1
```

## 흔한 실수

- `await` 없이 `SceneTreeTimer`·애니메이션 완료 처리
- `queue_free()` 직후 해당 노드 참조 사용
- UI `mouse_filter` 미설정으로 클릭 통과/차단 오류
- 3D에서 스케일이 콜리전에 영향 — 물리 바디는 uniform scale 권장

## 성능 (기본)

- 오프스크린·화면 밖 오브젝트: `VisibleOnScreenNotifier3D` 또는 거리 컬링
- 다수 동일 메시: `MultiMeshInstance3D`
- 매 프레임 `find_child` / 그룹 전체 순회 지양 — 캐시 또는 시그널
