import cv2
import queue
import threading
import time

from avsec_queue_manager import AVSECQueueManager

# ====================================================== 
class Camera:

    def __init__(
        self,
        camera_id,
        source,
        model_path="yolo11n.pt",
        imgsz=416,
        stream_fps=20,
        jpeg_quality=75
    ):

        # ==================================================
        # IDENTIFICATION
        # ==================================================

        self.camera_id = camera_id
        self.source = source

        # ==================================================
        # PARAMÈTRES
        # ==================================================

        self.imgsz = imgsz
        self.stream_fps = stream_fps
        self.jpeg_quality = jpeg_quality

        # ==================================================
        # OUVERTURE DE LA VIDÉO
        # ==================================================

        self.cap = cv2.VideoCapture(source)

        if not self.cap.isOpened():
            raise RuntimeError(
                f"Impossible d'ouvrir la caméra "
                f"{camera_id} : {source}"
            )

        # ==================================================
        # INFORMATIONS SUR LA VIDÉO
        # ==================================================

        self.source_fps = self.cap.get(
            cv2.CAP_PROP_FPS
        )

        if (
            self.source_fps is None
            or self.source_fps <= 0
            or self.source_fps > 240
        ):
            self.source_fps = 25.0

        # SI FPS IN À FPS OUT, ON LIMITE LE STREAM AU FPS IN
        if stream_fps is None:
            self.stream_fps = self.source_fps
        else:
            self.stream_fps = min(
                float(stream_fps),
                self.source_fps
            )

        
        self.frame_period = 1.0 / self.source_fps


        self.stream_period = (
            1.0 / self.stream_fps
        )

        self.frame_width = int(
            self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        )

        self.frame_height = int(
            self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        )

        self.frame_count = int(
            self.cap.get(cv2.CAP_PROP_FRAME_COUNT)
        )

        # Une source ayant plusieurs frames est généralement
        # un fichier vidéo.
        self.is_video_file = self.frame_count > 1

        print(
            f"Caméra {self.camera_id} ouverte : "
            f"{self.frame_width}x{self.frame_height}, "
            f"{self.source_fps:.2f} FPS, "
            f"{self.frame_count} frames"
        )

        # ==================================================
        # MODÈLE YOLO
        # ==================================================

        self.model_path = model_path
        self.queue_manager = None

        # ==================================================
        # RÉGION DE DÉTECTION
        # ==================================================

        self.region = None

        # ==================================================
        # RÉSULTATS
        # ==================================================
        self.metrics = {
            "queue_count": 0,
            "current_waiting_times": {},
            "average_active_wait_seconds": 0.0,
            "maximum_active_wait_seconds": 0.0,
            "average_completed_wait_seconds": 0.0,
            "estimated_wait_seconds": 0.0,
            "arrival_rate_per_min": 0.0,
            "throughput_rate_per_min": 0.0,
            "total_arrivals": 0,
            "total_exits": 0,
            "congestion_level": "FAIBLE"
        }
        self.person_count = 0
        self.annotated_frame = None

        # Numéro permettant de savoir si une nouvelle image
        # a été traitée.
        self.processed_frame_id = 0

        # ==================================================
        # FILE D'ATTENTE
        # ==================================================

        # Une seule image est conservée afin d'éviter
        # d'accumuler du retard.
        self.frame_queue = queue.Queue(maxsize=1)

        # ==================================================
        # SYNCHRONISATION
        # ==================================================

        self.lock = threading.Lock()
        self.stop_event = threading.Event()

        # ==================================================
        # THREADS
        # ==================================================

        self.capture_worker = threading.Thread(
            target=self.capture,
            daemon=True,
            name=f"capture-camera-{camera_id}"
        )

        self.yolo_worker = threading.Thread(
            target=self.process_yolo,
            daemon=True,
            name=f"yolo-camera-{camera_id}"
        )

    # ======================================================
    # DÉMARRER LA CAMÉRA
    # ======================================================

    def start(self):

        if not self.capture_worker.is_alive():
            self.capture_worker.start()

        if not self.yolo_worker.is_alive():
            self.yolo_worker.start()

        print(
            f"Caméra {self.camera_id} démarrée"
        )

    # ======================================================
    # ARRÊTER LA CAMÉRA
    # ======================================================

    def stop(self):

        self.stop_event.set()

        if self.cap.isOpened():
            self.cap.release()

        print(
            f"Caméra {self.camera_id} arrêtée"
        )

    # ======================================================
    # AJOUTER LA DERNIÈRE IMAGE À LA QUEUE
    # ======================================================

    def push_latest_frame(self, frame):

        # Supprimer l'ancienne image si YOLO ne l'a pas
        # encore traitée.
        try:
            self.frame_queue.get_nowait()

        except queue.Empty:
            pass

        # Ajouter la nouvelle image.
        try:
            self.frame_queue.put_nowait(frame)

        except queue.Full:
            pass

    # ======================================================
    # ACQUISITION VIDÉO
    # ======================================================

    def capture(self):

        next_frame_time = time.perf_counter()

        while not self.stop_event.is_set():

            ret, frame = self.cap.read()

            # ------------------------------------------------
            # FIN OU ERREUR DE LECTURE
            # ------------------------------------------------

            if not ret:

                if self.is_video_file:

                    # Recommencer la vidéo depuis le début.
                    self.cap.set(
                        cv2.CAP_PROP_POS_FRAMES,
                        0
                    )

                    next_frame_time = (
                        time.perf_counter()
                    )

                    continue

                print(
                    f"Erreur de lecture de la caméra "
                    f"{self.camera_id}"
                )

                time.sleep(0.1)
                continue

            # ------------------------------------------------
            # CONSERVER LA DERNIÈRE IMAGE
            # ------------------------------------------------

            self.push_latest_frame(frame)

            # ------------------------------------------------
            # RESPECTER LE FPS DU FICHIER VIDÉO
            # ------------------------------------------------

            if self.is_video_file:

                next_frame_time += self.frame_period

                delay = (
                    next_frame_time
                    - time.perf_counter()
                )

                if delay > 0:
                    time.sleep(delay)

                else:
                    # Si la lecture a pris du retard,
                    # repartir du temps actuel.
                    next_frame_time = (
                        time.perf_counter()
                    )

    # ======================================================
    # TRAITEMENT YOLO
    # ======================================================
    def process_yolo(self):

        while not self.stop_event.is_set():

            try:
                frame = self.frame_queue.get(
                    timeout=0.5
                )

            except queue.Empty:
                continue

            with self.lock:
                queue_manager = self.queue_manager

            # Aucune région : transmettre l’image brute
            if queue_manager is None:

                processed_frame = frame

                metrics = {
                    "queue_count": 0,
                    "current_waiting_times": {},
                    "average_active_wait_seconds": 0.0,
                    "maximum_active_wait_seconds": 0.0,
                    "average_completed_wait_seconds": 0.0,
                    "estimated_wait_seconds": 0.0,
                    "arrival_rate_per_min": 0.0,
                    "throughput_rate_per_min": 0.0,
                    "total_arrivals": 0,
                    "total_exits": 0,
                    "congestion_level": "FAIBLE"
                }

            else:

                try:

                    # __call__ exécute process()
                    results = queue_manager(frame)

                    processed_frame = results.plot_im

                    metrics = {
                        "queue_count":
                            results.queue_count,

                        "current_waiting_times":
                            results.current_waiting_times,

                        "average_active_wait_seconds":
                            results.average_active_wait_seconds,

                        "maximum_active_wait_seconds":
                            results.maximum_active_wait_seconds,

                        "average_completed_wait_seconds":
                            results.average_completed_wait_seconds,

                        "estimated_wait_seconds":
                            results.estimated_wait_seconds,

                        "arrival_rate_per_min":
                            results.arrival_rate_per_min,

                        "throughput_rate_per_min":
                            results.throughput_rate_per_min,

                        "total_arrivals":
                            results.total_arrivals,

                        "total_exits":
                            results.total_exits,

                        "congestion_level":
                            results.congestion_level
                    }

                except Exception as error:

                    print(
                        f"Erreur AVSEC caméra "
                        f"{self.camera_id} : {error}"
                    )

                    processed_frame = frame

                    with self.lock:
                        metrics = self.metrics.copy()

            with self.lock:

                # Éviter qu’un ancien manager écrive ses
                # résultats après un changement de région.
                if (
                    queue_manager is not None
                    and queue_manager
                    is not self.queue_manager
                ):
                    continue

                self.person_count = metrics[
                    "queue_count"
                ]

                self.metrics = metrics
                self.annotated_frame = (
                    processed_frame
                )

                self.processed_frame_id += 1
                
    # ======================================================
    # GÉNÉRATEUR MJPEG
    # ======================================================

    def generate_frames(self):

        stream_period = (
            1.0 / self.stream_fps
        )

        last_frame_id = -1

        while not self.stop_event.is_set():

            loop_start = time.perf_counter()

            # ------------------------------------------------
            # RÉCUPÉRER LA DERNIÈRE IMAGE TRAITÉE
            # ------------------------------------------------

            with self.lock:

                current_frame_id = (
                    self.processed_frame_id
                )

                if self.annotated_frame is None:
                    frame = None
                else:
                    frame = (
                        self.annotated_frame.copy()
                    )

            if frame is None:

                time.sleep(0.01)
                continue

            # Éviter de réencoder immédiatement la même image.
            if current_frame_id == last_frame_id:

                time.sleep(0.005)
                continue

            last_frame_id = current_frame_id

            # ------------------------------------------------
            # ENCODAGE JPEG
            # ------------------------------------------------

            success, encoded_image = cv2.imencode(
                ".jpg",
                frame,
                [
                    cv2.IMWRITE_JPEG_QUALITY,
                    self.jpeg_quality
                ]
            )

            if not success:
                continue

            # ------------------------------------------------
            # ENVOI MJPEG
            # ------------------------------------------------

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Cache-Control: no-cache\r\n\r\n"
                + encoded_image.tobytes()
                + b"\r\n"
            )

            # ------------------------------------------------
            # LIMITER LE FPS DU STREAM
            # ------------------------------------------------

            elapsed = (
                time.perf_counter()
                - loop_start
            )

            delay = stream_period - elapsed

            if delay > 0:
                time.sleep(delay)

    # ======================================================
    # DÉFINIR LA RÉGION
    # ======================================================

    def set_region(self, region):

        if region is None:

            with self.lock:
                self.region = None
                self.queue_manager = None

            print(
                f"Caméra {self.camera_id} "
                f"→ région supprimée"
            )

            return

        normalized_region = [
            (
                int(point[0]),
                int(point[1])
            )
            for point in region
        ]

        # La création peut prendre quelques secondes,
        # car le modèle YOLO est chargé ici.
        new_manager = AVSECQueueManager(
            show=False,
            region=normalized_region,
            model=self.model_path,
            classes=[0],
            imgsz=self.imgsz,
            conf=0.35,
            line_width=3,
            verbose=False,
            metric_window=60,
            lost_timeout=2
        )

        with self.lock:
            self.region = normalized_region
            self.queue_manager = new_manager

        print(
            f"Caméra {self.camera_id} "
            f"→ nouvelle région : "
            f"{normalized_region}"
        )
    # ======================================================
    # RÉCUPÉRER LES DONNÉES
    # ======================================================

    def get_data(self):

        with self.lock:
            print(f"Caméra {self.camera_id} → récupération des données")  
            print(f"Caméra {self.camera_id} → métriques : {self.metrics}")  
            return {
                "camera_id": self.camera_id,

                "person_count":
                    self.metrics["queue_count"],

                "waiting_time_seconds":
                    self.metrics[
                        "estimated_wait_seconds"
                    ],

                "waiting_time_minutes":
                    self.metrics[
                        "estimated_wait_seconds"
                    ] / 60.0,

                "average_active_wait_seconds":
                    self.metrics[
                        "average_active_wait_seconds"
                    ],

                "maximum_active_wait_seconds":
                    self.metrics[
                        "maximum_active_wait_seconds"
                    ],

                "average_completed_wait_seconds":
                    self.metrics[
                        "average_completed_wait_seconds"
                    ],

                "arrival_rate_per_min":
                    self.metrics[
                        "arrival_rate_per_min"
                    ],

                "throughput_rate_per_min":
                    self.metrics[
                        "throughput_rate_per_min"
                    ],

                "total_arrivals":
                    self.metrics["total_arrivals"],

                "total_exits":
                    self.metrics["total_exits"],

                "congestion_level":
                    self.metrics[
                        "congestion_level"
                    ],

                "current_waiting_times":
                    self.metrics[
                        "current_waiting_times"
                    ],

                "region": self.region,

                "source_fps": self.source_fps,
                "stream_fps": self.stream_fps,

                "resolution": {
                    "width": self.frame_width,
                    "height": self.frame_height
                }
            }