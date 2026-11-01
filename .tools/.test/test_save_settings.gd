extends SceneTree

## SaveManager 및 SettingsManager 자가 검증 스크립트.
## headless 모드로 실행되어 assert 검증을 수행한다.

var _sm: Node
var _gs: Node
var _save_mgr: Node


func _init() -> void:
	print("[TEST] SaveManager 및 SettingsManager 검증 시작...")
	_setup_nodes()
	_test_settings()
	_test_mercenary_serialization()
	_test_save_load()
	_test_ui_scenes()
	print("[TEST] 모든 검증 통과 (SUCCESS)")
	quit(0)


func _setup_nodes() -> void:
	_sm = root.get_node_or_null("SettingsManager")
	if _sm == null:
		var sm_script = load("res://scripts/autoload/settings_manager.gd")
		_sm = sm_script.new()
		_sm.name = "SettingsManager"
		root.add_child(_sm)

	_gs = root.get_node_or_null("GameState")
	if _gs == null:
		var gs_script = load("res://scripts/autoload/game_state.gd")
		_gs = gs_script.new()
		_gs.name = "GameState"
		root.add_child(_gs)

	_save_mgr = root.get_node_or_null("SaveManager")
	if _save_mgr == null:
		var save_script = load("res://scripts/autoload/save_manager.gd")
		_save_mgr = save_script.new()
		_save_mgr.name = "SaveManager"
		root.add_child(_save_mgr)
	_save_mgr.game_state_override = _gs


func _test_settings() -> void:
	print("  - SettingsManager 검증...")
	assert(_sm != null, "SettingsManager 인스턴스 실패")
	assert(_sm.gameplay.has("battle_speed"), "gameplay.battle_speed 누락")
	assert(_sm.video.has("window_mode"), "video.window_mode 누락")
	assert(_sm.audio.has("master_volume"), "audio.master_volume 누락")
	assert(_sm.controls.has("inventory"), "controls.inventory 누락")

	# 광과민성 보호 로직 검증: ON 시 화면 흔들림 OFF 처리
	_sm.gameplay["photosensitivity"] = true
	_sm.apply_gameplay()
	assert(_sm.gameplay["screen_shake"] == false, "광과민성 보호 시 screen_shake는 false여야 함")
	print("  ✓ SettingsManager 정상")


func _test_mercenary_serialization() -> void:
	print("  - Mercenary 직렬화/역직렬화 검증...")
	var rng := RandomNumberGenerator.new()
	rng.seed = 12345
	var m: Mercenary = Mercenary.create_random("일반", rng)
	m.merc_name = "테스트용병"
	m.hp = 42

	var dict := m.to_dict()
	var restored := Mercenary.from_dict(dict)
	assert(restored.merc_name == "테스트용병", "용병 이름 불일치")
	assert(restored.hp == 42, "용병 HP 불일치")
	assert(restored.job == m.job, "용병 직업 불일치")
	print("  ✓ Mercenary 직렬화/역직렬화 정상")


func _test_save_load() -> void:
	print("  - SaveManager 저장/로드/삭제 검증...")
	assert(_save_mgr != null, "SaveManager 인스턴스 실패")

	# 테스트 슬롯 번호
	var test_slot := 1
	_save_mgr.delete_slot(test_slot) # 기존 데이터 정리

	# 빈 슬롯 확인
	var first_empty: int = _save_mgr.get_first_empty_slot()
	assert(first_empty == test_slot, "1번 슬롯이 비어있어야 함")

	# 가상 상태 생성 후 저장
	_gs.gold = 777
	_gs.day = 5
	var save_ok: bool = _save_mgr.save_slot(test_slot, "테스트영지")
	assert(save_ok, "슬롯 저장 실패")
	assert(_save_mgr.has_slot(test_slot), "슬롯 파일 존재 확인 실패")

	var meta: Dictionary = _save_mgr.get_slot_meta(test_slot)
	assert(meta.is_empty == false, "슬롯 메타 is_empty 플래그 오류")
	assert(meta.name == "테스트영지", "슬롯 이름 불일치")
	assert(meta.gold == 777, "슬롯 골드 불일치")
	assert(meta.day == 5, "슬롯 일차 불일치")

	# 이름 수정 검증
	_save_mgr.update_slot_name(test_slot, "새영지이름")
	meta = _save_mgr.get_slot_meta(test_slot)
	assert(meta.name == "새영지이름", "슬롯 이름 수정 실패")

	# GameState 초기화 후 로드 검증
	_gs.gold = 0
	_gs.day = 1
	var load_ok: bool = _save_mgr.load_slot(test_slot)
	assert(load_ok, "슬롯 로드 실패")
	assert(_gs.gold == 777, "로드된 골드 값 불일치")
	assert(_gs.day == 5, "로드된 일차 불일치")

	# 슬롯 삭제 검증
	var del_ok: bool = _save_mgr.delete_slot(test_slot)
	assert(del_ok, "슬롯 삭제 실패")
	assert(not _save_mgr.has_slot(test_slot), "삭제 후 슬롯 존재함")
	print("  ✓ SaveManager 정상")


func _test_ui_scenes() -> void:
	print("  - UI Scenes 로드 및 인스턴스화 검증...")

	# 1. Title 씬
	var title_scene = load("res://scenes/ui/title.tscn")
	assert(title_scene != null, "title.tscn 로드 실패")
	var title_inst = title_scene.instantiate()
	assert(title_inst != null, "title.tscn 인스턴스 실패")
	root.add_child(title_inst)
	assert(title_inst.has_method("_on_new_game"), "title _on_new_game 누락")
	title_inst.queue_free()

	# 2. SaveLoadPopup 씬
	var save_scene = load("res://scenes/ui/save_load_popup.tscn")
	assert(save_scene != null, "save_load_popup.tscn 로드 실패")
	var save_inst = save_scene.instantiate()
	assert(save_inst != null, "save_load_popup.tscn 인스턴스 실패")
	root.add_child(save_inst)
	assert(save_inst.has_method("refresh_slots"), "refresh_slots 누락")
	save_inst.queue_free()

	# 3. SettingsPopup 씬
	var settings_scene = load("res://scenes/ui/settings_popup.tscn")
	assert(settings_scene != null, "settings_popup.tscn 로드 실패")
	var settings_inst = settings_scene.instantiate()
	assert(settings_inst != null, "settings_popup.tscn 인스턴스 실패")
	root.add_child(settings_inst)
	assert(settings_inst.has_method("_switch_tab"), "_switch_tab 누락")
	settings_inst.queue_free()

	print("  ✓ UI Scenes 정상 인스턴스화 완료")
