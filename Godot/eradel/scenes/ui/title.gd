extends Control


func _ready() -> void:
	UiKit.background(self, UiKit.BG)

	var art := TextureRect.new()
	art.texture = load(UiKit.TITLE_ART)
	art.set_anchors_preset(PRESET_FULL_RECT)
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	art.modulate = Color(1, 1, 1, 0.6)
	art.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(art)

	var overlay := ColorRect.new()
	overlay.color = Color(0.055, 0.047, 0.031, 0.45)
	overlay.set_anchors_preset(PRESET_FULL_RECT)
	overlay.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(overlay)

	var center := CenterContainer.new()
	center.set_anchors_preset(PRESET_FULL_RECT)
	add_child(center)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 14)
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_child(box)

	var tag := UiKit.label("로그라이크 턴제 영지 경영 RPG", 13, UiKit.GOLD)
	tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(tag)

	var name_label := UiKit.title("영지의 군주", 64, UiKit.WHITE)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(name_label)

	var lore := UiKit.label("아무도 원하지 않아서, 아무도 빼앗지 않은 그 자리에.", 14, UiKit.TEXT2)
	lore.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(lore)

	box.add_child(UiKit.hsep(24))

	var new_btn := UiKit.primary_button("새 게임", UiKit.GOLD)
	new_btn.custom_minimum_size = Vector2(220, 44)
	new_btn.pressed.connect(_on_new_game)
	box.add_child(new_btn)

	var load_btn := UiKit.button("불러오기")
	load_btn.custom_minimum_size = Vector2(220, 40)
	load_btn.disabled = true
	box.add_child(load_btn)

	var quit_btn := UiKit.button("종료")
	quit_btn.custom_minimum_size = Vector2(220, 40)
	quit_btn.pressed.connect(func(): get_tree().quit())
	box.add_child(quit_btn)

	box.add_child(UiKit.hsep(16))
	var ver := UiKit.label("프로토타입 1차 · 기획서 v0.4 기반", 11, UiKit.TEXT3)
	ver.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(ver)


func _on_new_game() -> void:
	GameState.new_game()
	get_tree().change_scene_to_file(GameState.SCENE_ESTATE)
