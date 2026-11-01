extends SceneTree

func _init() -> void:
	print("Window mode before:", root.mode)
	print("Window size before:", root.size)
	print("DisplayServer mode before:", DisplayServer.window_get_mode())
	print("DisplayServer size before:", DisplayServer.window_get_size())

	# Window.size 변경 테스트
	root.mode = Window.MODE_WINDOWED
	root.size = Vector2i(960, 540)
	DisplayServer.window_set_size(Vector2i(960, 540))
	var screen_size = DisplayServer.screen_get_size()
	DisplayServer.window_set_position((screen_size - Vector2i(960, 540)) / 2)

	print("Window size after:", root.size)
	print("DisplayServer size after:", DisplayServer.window_get_size())
	quit(0)
