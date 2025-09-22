"""Hexa-Snake (Bee Edition) implemented with pygame-style APIs."""
import math
import random
from typing import Dict, List, Optional, Sequence, Tuple

import pygame

AXIAL_DIRECTIONS: Dict[str, Tuple[int, int]] = {
    "north": (0, -1),
    "north_east": (1, -1),
    "south_east": (1, 0),
    "south": (0, 1),
    "south_west": (-1, 1),
    "north_west": (-1, 0),
}

KEY_DIRECTION_MAP: Dict[str, str] = {
    "w": "north",
    "ArrowUp": "north",
    "d": "north_east",
    "ArrowRight": "south_east",
    "s": "south",
    "ArrowDown": "south",
    "a": "south_west",
    "ArrowLeft": "north_west",
}


class HexaSnakeGame:
    """Core game controller executed inside the Pyodide runtime."""

    def __init__(
        self,
        canvas_id: str,
        pixel_width: int = 720,
        pixel_height: int = 640,
        cols: int = 13,
        rows: int = 11,
        cell_size: float = 28.0,
    ) -> None:
        pygame.init()
        self.surface = pygame.display.set_mode((pixel_width, pixel_height), canvas_id=canvas_id)
        pygame.display.set_caption("Hexa-Snake (Bee Edition)")

        self.canvas_id = canvas_id
        self.pixel_width = pixel_width
        self.pixel_height = pixel_height
        self.cols = cols
        self.rows = rows
        self.cell_size = cell_size

        self.colors = {
            "background": "#fdf6d6",
            "grid_light": "#f9e8a7",
            "grid_dark": "#f1d47f",
            "grid_outline": "#e0b24b",
            "bee_body": "#fbc02d",
            "bee_head": "#f57f17",
            "bee_outline": "#7c4a03",
            "honey": "#ffd54f",
            "honey_outline": "#f57f17",
        }

        self.angles = [math.pi / 6 + index * (math.pi / 3) for index in range(6)]
        self.grid_cells: List[Tuple[int, int]] = [
            (q, r) for r in range(self.rows) for q in range(self.cols)
        ]

        self._compute_layout()
        self._initialise_state()

    # ------------------------------------------------------------------
    # Lifecycle helpers
    # ------------------------------------------------------------------
    def _initialise_state(self) -> None:
        self.base_interval = 0.55
        self.speed_increment = 0.03
        self.minimum_interval = 0.16
        self.step_interval = self.base_interval

        self.direction: Optional[str] = None
        self.pending_direction: Optional[str] = None
        self.time_since_step = 0.0
        self.score = 0
        self.speed_level = 1
        self.game_over = False
        self.just_collected = False
        self.needs_redraw = True

        center_q = self.cols // 2
        center_r = self.rows // 2
        self.snake: List[Tuple[int, int]] = [
            (center_q, center_r),
            (center_q, center_r + 1),
            (center_q, center_r + 2),
        ]
        self.honey: Optional[Tuple[int, int]] = self._spawn_honey()

    def reset(self) -> None:
        self._initialise_state()

    # ------------------------------------------------------------------
    # Event & update loop
    # ------------------------------------------------------------------
    def handle_events(self, events: Sequence[Dict]) -> None:
        for event in events or []:
            key = event.get("key")
            if not key:
                continue
            if len(key) == 1:
                key = key.lower()
            direction_name = KEY_DIRECTION_MAP.get(key)
            if not direction_name:
                continue
            if self.direction is None:
                self.direction = direction_name
            elif not self._is_opposite(direction_name, self.direction):
                self.pending_direction = direction_name

    def step(self, delta_seconds: float) -> Dict[str, float]:
        if self.needs_redraw:
            self._draw()

        if self.game_over:
            return self._state_snapshot()

        if delta_seconds < 0:
            delta_seconds = 0

        self.time_since_step += delta_seconds
        moved = False
        while self.time_since_step >= self.step_interval and not self.game_over:
            self.time_since_step -= self.step_interval
            moved = True
            self._advance_snake()

        if moved or self.just_collected:
            self._draw()

        return self._state_snapshot()

    # ------------------------------------------------------------------
    # Core mechanics
    # ------------------------------------------------------------------
    def _advance_snake(self) -> None:
        direction = self.pending_direction or self.direction
        if not direction:
            return

        self.direction = direction
        self.pending_direction = None
        delta_q, delta_r = AXIAL_DIRECTIONS[direction]
        head_q, head_r = self.snake[0]
        new_head = (head_q + delta_q, head_r + delta_r)

        if self._out_of_bounds(new_head) or new_head in self.snake:
            self.game_over = True
            return

        self.snake.insert(0, new_head)
        self.just_collected = False

        if self.honey and new_head == self.honey:
            self.score += 1
            self.speed_level += 1
            self.step_interval = max(
                self.minimum_interval,
                self.base_interval - self.speed_increment * (self.speed_level - 1),
            )
            self.just_collected = True
            self.honey = self._spawn_honey()
            if self.honey is None:
                self.game_over = True
        else:
            self.snake.pop()

    def _spawn_honey(self) -> Optional[Tuple[int, int]]:
        available = [cell for cell in self.grid_cells if cell not in self.snake]
        if not available:
            return None
        return random.choice(available)

    def _out_of_bounds(self, cell: Tuple[int, int]) -> bool:
        q, r = cell
        return q < 0 or r < 0 or q >= self.cols or r >= self.rows

    def _is_opposite(self, first: str, second: str) -> bool:
        dq1, dr1 = AXIAL_DIRECTIONS[first]
        dq2, dr2 = AXIAL_DIRECTIONS[second]
        return dq1 + dq2 == 0 and dr1 + dr2 == 0

    # ------------------------------------------------------------------
    # Rendering helpers
    # ------------------------------------------------------------------
    def _compute_layout(self) -> None:
        centers = [self._axial_to_pixel_raw(q, r) for q, r in self.grid_cells]
        corners = []
        for cx, cy in centers:
            corners.extend(self._hex_points_for_center(cx, cy))
        min_x = min(x for x, _ in corners)
        max_x = max(x for x, _ in corners)
        min_y = min(y for _, y in corners)
        max_y = max(y for _, y in corners)

        width = max_x - min_x
        height = max_y - min_y
        self.offset_x = (self.pixel_width - width) / 2 - min_x
        self.offset_y = (self.pixel_height - height) / 2 - min_y

    def _axial_to_pixel_raw(self, q: int, r: int) -> Tuple[float, float]:
        size = self.cell_size
        x = size * (math.sqrt(3) * q + math.sqrt(3) / 2 * r)
        y = size * (1.5 * r)
        return (x, y)

    def _hex_points_for_center(self, cx: float, cy: float) -> List[Tuple[float, float]]:
        return [
            (cx + self.cell_size * math.cos(angle), cy + self.cell_size * math.sin(angle))
            for angle in self.angles
        ]

    def _hex_points(self, cell: Tuple[int, int]) -> List[Tuple[float, float]]:
        cx_raw, cy_raw = self._axial_to_pixel_raw(*cell)
        cx = cx_raw + self.offset_x
        cy = cy_raw + self.offset_y
        return self._hex_points_for_center(cx, cy)

    def _draw(self) -> None:
        surface = self.surface
        surface.fill(self.colors["background"])

        for index, cell in enumerate(self.grid_cells):
            base_color = self.colors["grid_light"] if (cell[0] + cell[1]) % 2 == 0 else self.colors["grid_dark"]
            points = self._hex_points(cell)
            pygame.draw.polygon(surface, base_color, points, 0)
            pygame.draw.polygon(surface, self.colors["grid_outline"], points, 1)

        if self.honey:
            honey_points = self._hex_points(self.honey)
            pygame.draw.polygon(surface, self.colors["honey"], honey_points, 0)
            pygame.draw.polygon(surface, self.colors["honey_outline"], honey_points, 2)

        for index, segment in enumerate(self.snake):
            segment_points = self._hex_points(segment)
            fill = self.colors["bee_head"] if index == 0 else self.colors["bee_body"]
            pygame.draw.polygon(surface, fill, segment_points, 0)
            pygame.draw.polygon(surface, self.colors["bee_outline"], segment_points, 2)

        pygame.display.flip()
        self.needs_redraw = False

    # ------------------------------------------------------------------
    # State helpers
    # ------------------------------------------------------------------
    def _state_snapshot(self) -> Dict[str, float]:
        return {
            "score": self.score,
            "length": len(self.snake),
            "game_over": self.game_over,
            "speed_level": max(1, self.speed_level),
            "step_interval": self.step_interval,
            "honey_collected": self.just_collected,
        }


__all__ = ["HexaSnakeGame", "AXIAL_DIRECTIONS", "KEY_DIRECTION_MAP"]
