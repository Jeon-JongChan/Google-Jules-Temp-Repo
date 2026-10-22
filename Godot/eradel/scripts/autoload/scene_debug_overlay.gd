extends CanvasLayer

## 디버그 빌드에서만 현재 씬 경로를 좌측 상단에 표시한다.
## 릴리스(export)에서는 _ready에서 자기 자신을 제거한다.

var _label: Label
var _last_path: String = ""


func _ready() -> void:
	if not OS.is_debug_build():
		queue_free()
		return

	layer = 128
	process_mode = Node.PROCESS_MODE_ALWAYS

	_label = Label.new()
	_label.name = "ScenePathLabel"
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_label.set_anchors_preset(Control.PRESET_TOP_LEFT)
	_label.position = Vector2(8, 8)
	_label.add_theme_font_size_override("font_size", 13)
	_label.add_theme_color_override("font_color", Color(0.85, 0.95, 0.7, 0.9))
	_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.7))
	_label.add_theme_constant_override("shadow_offset_x", 1)
	_label.add_theme_constant_override("shadow_offset_y", 1)
	add_child(_label)

	_refresh_path()


func _process(_delta: float) -> void:
	_refresh_path()


func _refresh_path() -> void:
	var scene := get_tree().current_scene
	var path := "(no current_scene)"
	if scene != null:
		path = scene.scene_file_path
		if path.is_empty():
			path = "%s (unsaved)" % scene.name
	if path == _last_path:
		return
	_last_path = path
	_label.text = path
