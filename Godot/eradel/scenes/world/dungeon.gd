extends Control

var _root: MarginContainer
var _monsters: Array[Dictionary] = []
var _base_gold: int = 0
var _round: int = 0
var _log: Array[String] = []
var _finished := false


func _ready() -> void:
	UiKit.background(self, UiKit.BG)
	_root = MarginContainer.new()
	_root.set_anchors_preset(PRESET_FULL_RECT)
	add_child(_root)

	# 원정 시작: 몬스터 생성
	_monsters = GameState.generate_monsters()
	_base_gold = 120 + GameState.dungeon_activity + GameState.rng().randi_range(0, 60)
	_log.append("어둠의 균열에 들어섰다. 몬스터 %d마리가 모습을 드러낸다." % _monsters.size())
	_rebuild()


func _rebuild() -> void:
	for c in _root.get_children():
		c.queue_free()

	var vbox := VBoxContainer.new()
	_root.add_child(vbox)
	vbox.add_child(UiKit.top_bar("던전 탐사 — 어둠의 균열   (%d턴)" % _round))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_bottom", 16)
	margin.size_flags_vertical = SIZE_EXPAND_FILL
	vbox.add_child(margin)

	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 10)
	margin.add_child(content)

	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 12)
	body.size_flags_vertical = SIZE_EXPAND_FILL
	content.add_child(body)
	body.add_child(_build_party_col())
	body.add_child(_build_monster_col())

	content.add_child(_build_log())

	var buttons := HBoxContainer.new()
	buttons.add_theme_constant_override("separation", 10)
	var spacer := Control.new()
	spacer.size_flags_horizontal = SIZE_EXPAND_FILL
	buttons.add_child(spacer)
	var retreat := UiKit.button("철수", UiKit.GOLD)
	retreat.custom_minimum_size = Vector2(120, 40)
	retreat.disabled = _round < 1
	retreat.pressed.connect(func(): _end("retreat"))
	buttons.add_child(retreat)
	var next := UiKit.primary_button("다음 턴 ▶", UiKit.GREEN)
	next.custom_minimum_size = Vector2(160, 40)
	next.pressed.connect(_next_turn)
	buttons.add_child(next)
	content.add_child(buttons)


func _build_party_col() -> Control:
	var panel := UiKit.panel(UiKit.BG2, UiKit.GREEN)
	panel.size_flags_horizontal = SIZE_EXPAND_FILL
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	panel.add_child(v)
	v.add_child(UiKit.label("우리 파티", 13, Color("7fd4a0")))
	for m in GameState.party:
		var row := UiKit.panel(UiKit.BG3, UiKit.BORDER, 6)
		var rv := VBoxContainer.new()
		rv.add_theme_constant_override("separation", 2)
		row.add_child(rv)
		var line := HBoxContainer.new()
		var nm := UiKit.label(m.merc_name, 12, UiKit.TEXT if m.hp > 0 else UiKit.TEXT3)
		nm.size_flags_horizontal = SIZE_EXPAND_FILL
		line.add_child(nm)
		if m.hp > 0:
			line.add_child(UiKit.label("%d/%d" % [m.hp, m.max_hp], 11, UiKit.GREEN))
		else:
			line.add_child(UiKit.label("전투불능", 11, UiKit.RED))
		rv.add_child(line)
		rv.add_child(UiKit.progress(m.hp, m.max_hp, UiKit.GREEN if m.hp > 0 else UiKit.RED, 6))
		v.add_child(row)
	return panel


func _build_monster_col() -> Control:
	var panel := UiKit.panel(UiKit.BG2, UiKit.RED)
	panel.size_flags_horizontal = SIZE_EXPAND_FILL
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	panel.add_child(v)
	v.add_child(UiKit.label("균열의 몬스터", 13, Color("f08080")))
	for mon in _monsters:
		var row := UiKit.panel(UiKit.BG3, UiKit.BORDER, 6)
		var rv := VBoxContainer.new()
		rv.add_theme_constant_override("separation", 2)
		row.add_child(rv)
		var line := HBoxContainer.new()
		var nm := UiKit.label(mon.name, 12, UiKit.TEXT if mon.hp > 0 else UiKit.TEXT3)
		nm.size_flags_horizontal = SIZE_EXPAND_FILL
		line.add_child(nm)
		if mon.hp > 0:
			line.add_child(UiKit.label("%d/%d" % [mon.hp, mon.max_hp], 11, UiKit.RED))
		else:
			line.add_child(UiKit.label("처치", 11, UiKit.GREEN))
		rv.add_child(line)
		rv.add_child(UiKit.progress(mon.hp, mon.max_hp, UiKit.RED if mon.hp > 0 else UiKit.TEXT3, 6))
		v.add_child(row)
	return panel


func _build_log() -> Control:
	var panel := UiKit.panel(UiKit.BG3)
	panel.custom_minimum_size = Vector2(0, 130)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	panel.add_child(scroll)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 2)
	scroll.add_child(v)
	var recent := _log.slice(maxi(0, _log.size() - 12))
	for line in recent:
		v.add_child(UiKit.label(line, 11, UiKit.TEXT2))
	return panel


func _alive_party() -> Array[Mercenary]:
	var out: Array[Mercenary] = []
	for m in GameState.party:
		if m.hp > 0:
			out.append(m)
	return out


func _alive_monsters() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for mon in _monsters:
		if mon.hp > 0:
			out.append(mon)
	return out


func _next_turn() -> void:
	if _finished:
		return
	_round += 1
	var rng := GameState.rng()
	var bonus := GameState.party_attack_bonus()

	# 파티 공격
	for m in _alive_party():
		var targets := _alive_monsters()
		if targets.is_empty():
			break
		var t: Dictionary = targets[rng.randi_range(0, targets.size() - 1)]
		var dmg: int = m.attack + bonus + rng.randi_range(0, 6)
		t.hp = max(0, t.hp - dmg)
		_log.append("%s 의 공격! %s 에게 %d 피해" % [m.merc_name, t.name, dmg])
		if t.hp == 0:
			_log.append("→ %s 처치!" % t.name)

	if _alive_monsters().is_empty():
		_log.append("모든 몬스터를 처치했다! 던전 클리어.")
		_end("clear")
		return

	# 몬스터 공격
	for mon in _alive_monsters():
		var targets := _alive_party()
		if targets.is_empty():
			break
		var t: Mercenary = targets[rng.randi_range(0, targets.size() - 1)]
		var dmg: int = int(mon.attack) + rng.randi_range(0, 5)
		t.hp = max(0, t.hp - dmg)
		_log.append("%s 의 반격! %s 가 %d 피해" % [mon.name, t.merc_name, dmg])
		if t.hp == 0:
			_log.append("→ %s 전투불능!" % t.merc_name)

	if _alive_party().is_empty():
		_log.append("파티가 전멸했다...")
		_end("wipe")
		return

	_rebuild()


func _end(outcome: String) -> void:
	if _finished:
		return
	_finished = true
	GameState.finalize_expedition(outcome, _base_gold)
	get_tree().change_scene_to_file(GameState.SCENE_RESULT)
