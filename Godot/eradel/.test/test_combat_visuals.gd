extends SceneTree

## 배틀 유닛 및 던전 씬 시각화/전투 로직 무결성 검증 테스트.

const BattleUnitScene = preload("res://scenes/entities/battle_unit.gd")
const FloatingTextScene = preload("res://scenes/entities/floating_text.gd")

func _init() -> void:
	print("--- Running Combat Visuals & Logic Check ---")
	test_battle_unit_mercenary()
	test_battle_unit_monster()
	test_battle_unit_damage_and_death()
	test_critical_floating_text_and_audio()
	test_volume_controller()
	test_dungeon_scene_compile()
	print("--- Combat Tests PASSED Successfully! ---")
	quit(0)


## 아군 용병 셋업 검증
func test_battle_unit_mercenary() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	var m := Mercenary.create_random("정예", rng)
	m.hp = 70
	m.max_hp = 70

	var unit = BattleUnitScene.new()
	unit.setup_as_mercenary(m)

	assert(unit.is_ally == true, "Unit should be ally")
	assert(unit.unit_name == m.merc_name, "Unit name should match mercenary name")
	assert(unit.current_hp == 70, "Current hp should match")
	assert(unit.max_hp == 70, "Max hp should match")
	assert(unit.is_dead == false, "Unit should be alive")
	unit.free()
	print("✓ test_battle_unit_mercenary passed")


## 적군 몬스터 셋업 검증
func test_battle_unit_monster() -> void:
	var mon_data := {
		"name": "심연의 늑대",
		"hp": 55,
		"max_hp": 55,
		"attack": 12,
	}
	var unit = BattleUnitScene.new()
	unit.setup_as_monster(mon_data)

	assert(unit.is_ally == false, "Unit should be enemy")
	assert(unit.unit_name == "심연의 늑대", "Unit name should match monster name")
	assert(unit.current_hp == 55, "Current hp should match")
	assert(unit.attack_power == 12, "Attack power should match")
	unit.free()
	print("✓ test_battle_unit_monster passed")


## 피격 및 사망 플래그 검증
func test_battle_unit_damage_and_death() -> void:
	var mon_data := {"name": "테스트 적", "hp": 30, "max_hp": 30, "attack": 8}
	var unit = BattleUnitScene.new()
	unit.setup_as_monster(mon_data)

	# 10 데미지
	unit.current_hp = max(0, unit.current_hp - 10)
	unit._update_view()
	assert(unit.current_hp == 20, "HP should be 20 after damage")
	assert(unit.is_dead == false, "Unit should still be alive")

	# 25 데미지 (초과)
	unit.current_hp = max(0, unit.current_hp - 25)
	unit._update_view()
	assert(unit.current_hp == 0, "HP should be 0")
	assert(unit.is_dead == true, "Unit should be dead")
	unit.free()
	print("✓ test_battle_unit_damage_and_death passed")


## 크리티컬 플로팅 텍스트 및 사운드 에셋 검증
func test_critical_floating_text_and_audio() -> void:
	# 오디오 리소스 검증
	assert(FileAccess.file_exists("res://assets/audio/hit_normal.wav"), "hit_normal.wav must exist")
	assert(FileAccess.file_exists("res://assets/audio/hit_crit.wav"), "hit_crit.wav must exist")

	# 크리티컬 플로팅 텍스트 인스턴스화 검증
	var ft = FloatingTextScene.new()
	ft.popup("-88", Color("ff3300"), Vector2(100, 100), true)
	assert(ft.get_child_count() > 0, "Floating text must create child container")
	ft.free()
	print("✓ test_critical_floating_text_and_audio passed")


## 볼륨 컨트롤러 위젯 동작 검증
func test_volume_controller() -> void:
	var ctrl = UiKit.volume_controller()
	assert(ctrl != null, "Volume controller should not be null")
	var hbox = ctrl.get_child(0)
	assert(hbox != null and hbox is HBoxContainer, "Should contain HBoxContainer")
	var slider: HSlider = null
	for c in hbox.get_children():
		if c is HSlider:
			slider = c
			break
	assert(slider != null, "Should contain HSlider")
	# 슬라이더 값 변경 테스트
	slider.value = 0.5
	ctrl.free()
	print("✓ test_volume_controller passed")


## 던전 씬 스크립트 컴파일 및 로드 검증
func test_dungeon_scene_compile() -> void:
	var d_script = load("res://scenes/world/dungeon.gd")
	assert(d_script != null, "Dungeon script must load cleanly")
	var t_script = load("res://scenes/entities/floating_text.gd")
	assert(t_script != null, "FloatingText script must load cleanly")
	print("✓ test_dungeon_scene_compile passed")
