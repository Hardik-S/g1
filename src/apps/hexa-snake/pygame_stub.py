"""Minimal pygame compatibility layer for Pyodide canvas rendering."""
import sys
import types
from js import document


def _color_to_css(color):
    if isinstance(color, str):
        return color

    if isinstance(color, (list, tuple)):
        if len(color) == 3:
            r, g, b = color
            return f"rgb({int(r)}, {int(g)}, {int(b)})"
        if len(color) == 4:
            r, g, b, a = color
            alpha = a if a <= 1 else a / 255
            return f"rgba({int(r)}, {int(g)}, {int(b)}, {alpha})"

    return "#000000"


class CanvasSurface:
    def __init__(self, canvas):
        self.canvas = canvas
        self.ctx = canvas.getContext("2d")
        self.width = canvas.width
        self.height = canvas.height

    def fill(self, color):
        css = _color_to_css(color)
        self.ctx.fillStyle = css
        self.ctx.fillRect(0, 0, self.width, self.height)


def _install_display_module(pygame_module):
    display = types.ModuleType("pygame.display")

    def set_mode(size, **kwargs):
        canvas_id = kwargs.get("canvas_id")
        if not canvas_id:
            raise ValueError("canvas_id is required to bind pygame surface")
        canvas = document.getElementById(canvas_id)
        if canvas is None:
            raise ValueError(f"Canvas '{canvas_id}' was not found in the document")
        if size and len(size) == 2:
            width, height = size
            if width:
                canvas.width = int(width)
            if height:
                canvas.height = int(height)
        return CanvasSurface(canvas)

    def flip():
        return None

    def set_caption(*_args, **_kwargs):
        return None

    display.set_mode = set_mode
    display.flip = flip
    display.set_caption = set_caption
    pygame_module.display = display
    sys.modules['pygame.display'] = display


def _install_draw_module(pygame_module):
    draw = types.ModuleType("pygame.draw")

    def polygon(surface, color, points, width=0):
        ctx = surface.ctx
        css = _color_to_css(color)
        ctx.beginPath()
        first_x, first_y = points[0]
        ctx.moveTo(first_x, first_y)
        for x, y in points[1:]:
            ctx.lineTo(x, y)
        ctx.closePath()
        if width == 0:
            ctx.fillStyle = css
            ctx.fill()
        ctx.strokeStyle = css
        ctx.lineWidth = abs(width) if width else 1
        ctx.stroke()

    def line(surface, color, start_pos, end_pos, width=1):
        ctx = surface.ctx
        ctx.beginPath()
        ctx.moveTo(start_pos[0], start_pos[1])
        ctx.lineTo(end_pos[0], end_pos[1])
        ctx.lineWidth = width
        ctx.strokeStyle = _color_to_css(color)
        ctx.stroke()

    draw.polygon = polygon
    draw.line = line
    pygame_module.draw = draw
    sys.modules['pygame.draw'] = draw


def _install_event_module(pygame_module):
    event = types.ModuleType("pygame.event")

    def get():
        try:
            from bee_bridge import get_events
        except Exception:
            return []
        events = get_events() or []
        python_events = []
        for payload in events:
            if isinstance(payload, dict):
                python_events.append(payload)
            else:
                try:
                    python_events.append(dict(payload))
                except Exception:
                    python_events.append({})
        return python_events

    event.get = get
    pygame_module.event = event
    sys.modules['pygame.event'] = event


def _install_time_module(pygame_module):
    time = types.ModuleType("pygame.time")

    class Clock:
        def tick(self, _fps=0):
            return 0

    time.Clock = Clock
    pygame_module.time = time
    sys.modules['pygame.time'] = time


def install_stub():
    if 'pygame' in sys.modules:
        return sys.modules['pygame']

    pygame_module = types.ModuleType('pygame')
    pygame_module.init = lambda: None
    pygame_module.quit = lambda: None
    pygame_module.Surface = CanvasSurface

    _install_display_module(pygame_module)
    _install_draw_module(pygame_module)
    _install_event_module(pygame_module)
    _install_time_module(pygame_module)

    sys.modules['pygame'] = pygame_module
    return pygame_module
