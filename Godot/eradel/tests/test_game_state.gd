extends SceneTree

func _init() -> void:
	print("--- Running Test: test_game_state.gd ---")
	print("※ 참고: 실행 중 'Identifier not found: GameState' 등의 에러가 발생해도 무시해도 됩니다. (Headless 환경에서 ui_kit.gd 등이 Autoload 싱글톤을 참조하면서 발생하는 노이즈)")

	# Node 생성 및 추가하여 GameState 싱글톤처럼 동작하도록 함
	var game_state = preload("res://scripts/autoload/game_state.gd").new()
	root.add_child(game_state)

	game_state.new_game()

	# 테스트 1: Clear 케이스 검증
	var merc1 = game_state.roster[0]
	var merc2 = game_state.roster[1]

	game_state.party.append(merc1)
	game_state.party.append(merc2)
	merc1.hp = merc1.max_hp
	merc2.hp = merc2.max_hp

	# Clear
	game_state.finalize_expedition("clear", 100)
	assert(game_state.last_result["outcome"] == "clear")
	assert(game_state.last_result["survivors"].size() == 2)
	assert(game_state.last_result["gold_gain"] == 100)

	# 테스트 2: Retreat 케이스 검증 (일부 HP 0 포함)
	game_state.new_game()
	merc1 = game_state.roster[0]
	merc2 = game_state.roster[1]
	game_state.party.append(merc1)
	game_state.party.append(merc2)
	merc1.hp = 0 # 쓰러진 동료 (철수 시 20% 확률 귀환)
	merc2.hp = merc2.max_hp

	game_state.finalize_expedition("retreat", 100)
	assert(game_state.last_result["outcome"] == "retreat")
	assert(game_state.last_result["gold_gain"] == 30) # base_gold * 0.3
	assert(game_state.last_result["resolvable_delta"] == 5)

	# 테스트 3: Wipe 케이스 검증
	game_state.new_game()
	merc1 = game_state.roster[0]
	merc2 = game_state.roster[1]
	game_state.party.append(merc1)
	game_state.party.append(merc2)
	merc1.hp = 0
	merc2.hp = merc2.max_hp # 전멸 시에도 HP가 남은 생존자가 있는 케이스

	game_state.finalize_expedition("wipe", 100)
	assert(game_state.last_result["outcome"] == "wipe")
	assert(game_state.last_result["survivors"].size() == 0, "Survivors should be empty on wipe")
	assert(game_state.last_result["dead"].size() == 2)
	assert(game_state.last_result["gold_gain"] == 0)

	print("--- All tests passed! ---")
	quit()
