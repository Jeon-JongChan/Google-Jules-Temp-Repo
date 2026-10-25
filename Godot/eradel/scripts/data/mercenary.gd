class_name Mercenary
extends Resource

## 용병 한 명. 런타임 엔티티지만 추후 저장 대비 Resource 로 둔다.

enum Status { READY, ON_EXPEDITION, MISSING, DEAD }

@export var merc_name: String = "이름 없음"
@export var category: String = "전사"
@export var job: String = "검사"
@export var grade: String = "일반"
@export var level: int = 1
@export var max_hp: int = 80
@export var attack: int = 10

@export var hp: int = 80
@export var penalties: Array[String] = []
@export var status: int = Status.READY


static func create_random(grade: String, rng: RandomNumberGenerator) -> Mercenary:
	var m := Mercenary.new()
	m.grade = grade
	m.category = JobDb.random_category(rng)
	m.job = JobDb.random_job(rng, m.category)
	m.merc_name = JobDb.random_name(rng)
	var range_lv: Array = JobDb.GRADE_LEVEL.get(grade, [1, 3])
	m.level = rng.randi_range(range_lv[0], range_lv[1])
	var grade_mult := 1.0
	if grade == "정예":
		grade_mult = 1.15
	elif grade == "특수":
		grade_mult = 1.35
	m.max_hp = int((60 + m.level * 12) * grade_mult)
	m.attack = int((6 + m.level * 3) * grade_mult)
	m.hp = m.max_hp
	return m


func is_available() -> bool:
	return status == Status.READY


func is_alive() -> bool:
	return status != Status.DEAD and status != Status.MISSING and hp > 0


func status_text() -> String:
	match status:
		Status.READY: return "대기"
		Status.ON_EXPEDITION: return "원정중"
		Status.MISSING: return "실종"
		Status.DEAD: return "사망"
		_: return "?"


## 사망 시 누적되는 영구 스트레스 (기획서 7장).
func permanent_stress_value() -> int:
	if level <= 3:
		return 3
	elif level <= 6:
		return 6
	elif level <= 9:
		return 10
	return 15
