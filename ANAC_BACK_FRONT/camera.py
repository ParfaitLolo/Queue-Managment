import cv2
import queue
import threading
import time

from ultralytics import YOLO

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

        self.model = YOLO(model_path)

        # ==================================================
        # RÉGION DE DÉTECTION
        # ==================================================

        self.region = None

        # ==================================================
        # RÉSULTATS
        # ==================================================

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

            # ------------------------------------------------
            # RÉCUPÉRER LA RÉGION ACTUELLE
            # ------------------------------------------------

            with self.lock:

                if self.region is None:
                    region = None
                else:
                    region = list(self.region)

            # ------------------------------------------------
            # DÉTECTION YOLO
            # ------------------------------------------------

            if region is not None:

                try:

                    results = self.model.track(
                        frame,
                        persist=True,
                        classes=[0],
                        imgsz=self.imgsz,
                        conf=0.35,
                        verbose=False
                    )

                    boxes = results[0].boxes

                    count = (
                        len(boxes)
                        if boxes is not None
                        else 0
                    )

                    processed_frame = (
                        results[0].plot()
                    )

                except Exception as error:

                    print(
                        f"Erreur YOLO caméra "
                        f"{self.camera_id} : {error}"
                    )

                    count = 0
                    processed_frame = frame

            else:

                count = 0
                processed_frame = frame

            # ------------------------------------------------
            # SAUVEGARDER LE RÉSULTAT
            # ------------------------------------------------

            with self.lock:

                self.person_count = count
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

        with self.lock:
            self.region = region

        print(
            f"Caméra {self.camera_id} "
            f"→ nouvelle région : {region}"
        )

    # ======================================================
    # RÉCUPÉRER LES DONNÉES
    # ======================================================

    def get_data(self):

        with self.lock:

            return {
                "camera_id": self.camera_id,
                "person_count": self.person_count,
                "region": self.region,
                "source_fps": self.source_fps,
                "stream_fps": self.stream_fps,
                "resolution": {
                    "width": self.frame_width,
                    "height": self.frame_height
                }
            }