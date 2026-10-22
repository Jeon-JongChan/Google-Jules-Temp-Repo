class_name UiKit
extends RefCounted

## 기획서(UI 설계서 v0.4) 색상 팔레트와 공용 위젯 빌더.
## 모든 화면이 코드로 UI를 조립할 때 이 헬퍼를 사용한다.

const BG := Color("0e0c08")
const BG2 := Color("16130d")
const BG3 := Color("1e1a11")
const BORDER := Color("3a3020")
const BORDER2 := Color("5a4a2a")
const GOLD := Color("c9a84c")
const GOLD2 := Color("f0c85a")
const RED := Color("c04040")
const GREEN := Color("3a7a50")
const BLUE := Color("3a6a9a")
const PURPLE := Color("6a5aaa")
const TEXT := Color("e8dcc8")
const TEXT2 := Color("a09070")
const TEXT3 := Color("6a5a40")
const WHITE := Color("f5f0e8")

const AVATAR := "res://assets/avatar_default.png"
const TITLE_ART := "res://assets/eradel_title.png"


static func style(bg: Color, border: Color = BORDER, radius: int = 8, border_w: int = 1) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.set_border_width_all(border_w)
	sb.border_color = border
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	return sb


static func panel(bg: Color = BG2, border: Color = BORDER, radius: int = 10) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", style(bg, border, radius))
	return p


static func label(text: String, size: int = 14, color: Color = TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


static func title(text: String, size: int = 30, color: Color = WHITE) -> Label:
	var l := label(text, size, color)
	return l


static func button(text: String, accent: Color = GOLD) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", 14)
	b.add_theme_color_override("font_color", TEXT)
	b.add_theme_color_override("font_hover_color", WHITE)
	b.add_theme_color_override("font_pressed_color", accent)
	b.add_theme_color_override("font_disabled_color", TEXT3)
	var normal := style(BG3, BORDER2, 6)
	var hover := style(BG3.lightened(0.06), accent, 6)
	var pressed := style(accent.darkened(0.6), accent, 6)
	var disabled := style(BG3.darkened(0.3), BORDER, 6)
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("disabled", disabled)
	b.focus_mode = Control.FOCUS_NONE
	return b


static func primary_button(text: String, accent: Color = GREEN) -> Button:
	var b := button(text, accent)
	b.add_theme_color_override("font_color", WHITE)
	b.add_theme_stylebox_override("normal", style(accent.darkened(0.45), accent, 6))
	b.add_theme_stylebox_override("hover", style(accent.darkened(0.3), accent.lightened(0.2), 6))
	b.add_theme_stylebox_override("pressed", style(accent.darkened(0.6), accent, 6))
	return b


static func chip(text: String, color: Color = GOLD) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", style(color.darkened(0.55), color, 10, 1))
	var l := label(text, 12, color.lightened(0.3))
	p.add_child(l)
	return p


static func progress(value: float, maximum: float, color: Color, height: int = 8) -> ProgressBar:
	var pb := ProgressBar.new()
	pb.max_value = maxf(maximum, 0.0001)
	pb.value = clampf(value, 0.0, maximum)
	pb.show_percentage = false
	pb.custom_minimum_size = Vector2(0, height)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.35)
	bg.set_corner_radius_all(4)
	var fg := StyleBoxFlat.new()
	fg.bg_color = color
	fg.set_corner_radius_all(4)
	pb.add_theme_stylebox_override("background", bg)
	pb.add_theme_stylebox_override("fill", fg)
	return pb


static func hsep(h: int = 8) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	return c


static func avatar(diameter: int = 36) -> TextureRect:
	var tr := TextureRect.new()
	var tex := load(AVATAR)
	if tex:
		tr.texture = tex
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	tr.custom_minimum_size = Vector2(diameter, diameter)
	return tr


## 자원 칩이 포함된 상단바. on_back 이 Callable 이면 뒤로 버튼을 단다.
static func top_bar(title_text: String, on_back = null) -> PanelContainer:
	var bar := PanelContainer.new()
	bar.add_theme_stylebox_override("panel", style(BG2, BORDER, 0))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	bar.add_child(h)
	if on_back is Callable:
		var back := button("‹ 뒤로")
		back.pressed.connect(on_back)
		h.add_child(back)
	var t := label(title_text, 16, GOLD)
	t.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	h.add_child(t)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(spacer)
	h.add_child(chip("금화 %d" % GameState.gold, GOLD))
	h.add_child(chip("마나석 %d" % GameState.manastone, BLUE))
	h.add_child(chip("행동력 %d/%d" % [GameState.action_points, GameState.max_action_points], TEXT2))
	return bar


## 화면 루트에 깔 배경(단색).
static func background(parent: Control, color: Color = BG) -> ColorRect:
	var bg := ColorRect.new()
	bg.color = color
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(bg)
	return bg
