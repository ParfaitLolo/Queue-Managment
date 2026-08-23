from collections import deque
from typing import Any
import time

from ultralytics.solutions.solutions import (
    BaseSolution,
    SolutionAnnotator,
    SolutionResults
)
from ultralytics.utils.plotting import colors


class AVSECQueueManager(BaseSolution):

    def __init__(self, **kwargs: Any) -> None:

        # Paramètres métier retirés avant BaseSolution
        self.metric_window = float(
            kwargs.pop("metric_window", 60.0)
        )

        self.lost_timeout = float(
            kwargs.pop("lost_timeout", 2.0)
        )

        super().__init__(**kwargs)

        self.initialize_region()

        self.counts = 0
        self.rect_color = (255, 255, 255)
        self.region_length = len(self.region)

        # --------------------------------------------------
        # État des personnes
        # --------------------------------------------------

        self.entry_times = {}
        self.waiting_times = {}
        self.inside_region = {}
        self.track_status = {}
        self.last_seen = {}

        # --------------------------------------------------
        # Événements pour les débits
        # --------------------------------------------------

        self.arrival_events = deque()
        self.exit_events = deque()

        # Derniers temps terminés :
        # (instant de sortie, durée, track_id)
        self.completed_events = deque(maxlen=1000)

        self.total_arrivals = 0
        self.total_exits = 0

        self.started_at = time.monotonic()

    # ======================================================
    # SUPPRIMER LES ÉVÉNEMENTS TROP ANCIENS
    # ======================================================

    def _cleanup_events(self, now):

        threshold = now - self.metric_window

        while (
            self.arrival_events
            and self.arrival_events[0] < threshold
        ):
            self.arrival_events.popleft()

        while (
            self.exit_events
            and self.exit_events[0] < threshold
        ):
            self.exit_events.popleft()

    # ======================================================
    # ENREGISTRER UNE SORTIE
    # ======================================================

    def _finalize_exit(
        self,
        track_id,
        exit_time,
        event_time=None,
        estimated=False
    ):

        entry_time = self.entry_times.pop(
            track_id,
            None
        )

        if entry_time is None:
            return self.waiting_times.get(track_id)

        if event_time is None:
            event_time = exit_time

        waiting_time = max(
            0.0,
            exit_time - entry_time
        )

        # Conserver définitivement le temps
        self.waiting_times[track_id] = waiting_time

        self.exit_events.append(event_time)

        self.completed_events.append(
            (
                event_time,
                waiting_time,
                track_id
            )
        )

        self.total_exits += 1

        self.inside_region[track_id] = False

        if estimated:
            self.track_status[track_id] = (
                "SORTIE_ESTIMEE"
            )
        else:
            self.track_status[track_id] = "SORTIE"

        print(
            f"Personne {track_id} sortie | "
            f"Temps : {waiting_time:.1f} s | "
            f"Estimée : {estimated}"
        )

        return waiting_time

    # ======================================================
    # METTRE À JOUR UNE PERSONNE
    # ======================================================

    def update_track_state(
        self,
        track_id,
        inside,
        now
    ):

        previous_state = self.inside_region.get(
            track_id,
            False
        )

        self.last_seen[track_id] = now

        # --------------------------------------------------
        # ENTRÉE
        # --------------------------------------------------

        if inside and not previous_state:

            self.entry_times[track_id] = now
            self.arrival_events.append(now)

            self.total_arrivals += 1

            self.track_status[track_id] = (
                "EN_ATTENTE"
            )

            print(
                f"Personne {track_id} "
                f"entrée dans la file"
            )

        # --------------------------------------------------
        # TOUJOURS DANS LA FILE
        # --------------------------------------------------

        if inside:

            entry_time = self.entry_times.get(
                track_id
            )

            waiting_time = (
                now - entry_time
                if entry_time is not None
                else 0.0
            )

            status = "EN_ATTENTE"

            self.track_status[track_id] = status

        # --------------------------------------------------
        # SORTIE OBSERVÉE
        # --------------------------------------------------

        elif previous_state:

            waiting_time = self._finalize_exit(
                track_id=track_id,
                exit_time=now,
                event_time=now,
                estimated=False
            )

            status = "SORTIE"

        # --------------------------------------------------
        # PERSONNE DÉJÀ HORS DE LA FILE
        # --------------------------------------------------

        else:

            # Conserver son dernier temps au lieu de None
            waiting_time = self.waiting_times.get(
                track_id,
                0.0
            )

            status = self.track_status.get(
                track_id,
                "HORS_FILE"
            )

        self.inside_region[track_id] = inside

        return waiting_time, status

    # ======================================================
    # GÉRER LES TRACKS DISPARUS
    # ======================================================

    def handle_missing_tracks(
        self,
        seen_track_ids,
        now
    ):

        for track_id in list(
            self.entry_times.keys()
        ):

            if track_id in seen_track_ids:
                continue

            last_seen_time = self.last_seen.get(
                track_id,
                now
            )

            missing_duration = (
                now - last_seen_time
            )

            if missing_duration >= self.lost_timeout:

                # On utilise le dernier instant où la
                # personne était visible pour la durée.
                self._finalize_exit(
                    track_id=track_id,
                    exit_time=last_seen_time,
                    event_time=now,
                    estimated=True
                )

    # ======================================================
    # CALCULER LES INDICATEURS
    # ======================================================

    def calculate_metrics(self, now):

        self._cleanup_events(now)

        active_waiting_times = {
            track_id: max(
                0.0,
                now - entry_time
            )
            for track_id, entry_time
            in self.entry_times.items()
        }

        active_values = list(
            active_waiting_times.values()
        )

        completed_values = [
            duration
            for _, duration, _
            in self.completed_events
        ]

        average_active_wait = (
            sum(active_values) / len(active_values)
            if active_values
            else 0.0
        )

        maximum_active_wait = (
            max(active_values)
            if active_values
            else 0.0
        )

        average_completed_wait = (
            sum(completed_values)
            / len(completed_values)
            if completed_values
            else 0.0
        )

        observation_duration = min(
            self.metric_window,
            max(1.0, now - self.started_at)
        )

        arrival_rate = (
            len(self.arrival_events)
            * 60.0
            / observation_duration
        )

        throughput_rate = (
            len(self.exit_events)
            * 60.0
            / observation_duration
        )

        # Estimation du temps nécessaire pour traiter
        # les personnes actuellement présentes.
        if throughput_rate > 0:

            estimated_wait = (
                self.counts
                / throughput_rate
                * 60.0
            )

        else:

            estimated_wait = (
                average_active_wait
            )

        # Niveau de congestion provisoire.
        # Ces seuils pourront être configurables.
        if (
            self.counts >= 30
            or estimated_wait >= 15 * 60
        ):
            congestion_level = "CRITIQUE"

        elif (
            self.counts >= 20
            or estimated_wait >= 10 * 60
        ):
            congestion_level = "ELEVE"

        elif (
            self.counts >= 10
            or estimated_wait >= 5 * 60
        ):
            congestion_level = "MODERE"

        else:
            congestion_level = "FAIBLE"

        return {
            "queue_count": self.counts,

            "current_waiting_times":
                active_waiting_times,

            "average_active_wait_seconds":
                average_active_wait,

            "maximum_active_wait_seconds":
                maximum_active_wait,

            "average_completed_wait_seconds":
                average_completed_wait,

            "estimated_wait_seconds":
                estimated_wait,

            "arrival_rate_per_min":
                arrival_rate,

            "throughput_rate_per_min":
                throughput_rate,

            "total_arrivals":
                self.total_arrivals,

            "total_exits":
                self.total_exits,

            "congestion_level":
                congestion_level
        }

    # ======================================================
    # TRAITEMENT D’UNE FRAME
    # ======================================================

    def process(self, im0) -> SolutionResults:

        now = time.monotonic()

        self.extract_tracks(im0)

        annotator = SolutionAnnotator(
            im0,
            line_width=self.line_width
        )

        annotator.draw_region(
            reg_pts=self.region,
            color=self.rect_color,
            thickness=self.line_width * 2
        )

        seen_track_ids = set()

        for box, track_id, cls, conf in zip(
            self.boxes,
            self.track_ids,
            self.clss,
            self.confs
        ):

            seen_track_ids.add(track_id)

            self.store_tracking_history(
                track_id,
                box
            )

            track_history = self.track_history.get(
                track_id,
                []
            )

            if not track_history:
                continue

            # Centre actuel de la boîte
            current_position = tuple(
                float(value)
                for value in track_history[-1]
            )

            current_point = self.Point(
                current_position
            )

            # covers() inclut aussi la frontière
            inside = self.r_s.covers(
                current_point
            )

            waiting_time, status = (
                self.update_track_state(
                    track_id=track_id,
                    inside=inside,
                    now=now
                )
            )

            label = (
                f"ID:{track_id} "
                f"{status} "
                f"{waiting_time:.0f}s"
            )

            annotator.box_label(
                box,
                label=label,
                color=colors(track_id, True)
            )

        # Gérer les personnes perdues par le tracker
        self.handle_missing_tracks(
            seen_track_ids,
            now
        )

        # Le nombre dans la file correspond aux entrées
        # encore actives. Une perte momentanée ne fait donc
        # pas immédiatement disparaître la personne.
        self.counts = len(self.entry_times)

        metrics = self.calculate_metrics(now)

        annotator.queue_counts_display(
            (
                f"File : {self.counts} | "
                f"Attente : "
                f"{metrics['estimated_wait_seconds'] / 60:.1f} min"
            ),
            points=self.region,
            region_color=self.rect_color,
            txt_color=(104, 31, 17)
        )

        plot_im = annotator.result()

        self.display_output(plot_im)

        # SolutionResults accepte des champs personnalisés
        return SolutionResults(
            plot_im=plot_im,
            queue_count=self.counts,
            total_tracks=len(self.track_ids),

            current_waiting_times=(
                metrics["current_waiting_times"]
            ),

            average_active_wait_seconds=(
                metrics[
                    "average_active_wait_seconds"
                ]
            ),

            maximum_active_wait_seconds=(
                metrics[
                    "maximum_active_wait_seconds"
                ]
            ),

            average_completed_wait_seconds=(
                metrics[
                    "average_completed_wait_seconds"
                ]
            ),

            estimated_wait_seconds=(
                metrics["estimated_wait_seconds"]
            ),

            arrival_rate_per_min=(
                metrics["arrival_rate_per_min"]
            ),

            throughput_rate_per_min=(
                metrics["throughput_rate_per_min"]
            ),

            total_arrivals=(
                metrics["total_arrivals"]
            ),

            total_exits=(
                metrics["total_exits"]
            ),

            congestion_level=(
                metrics["congestion_level"]
            )
        )