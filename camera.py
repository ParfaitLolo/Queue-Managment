import cv2
import queue
import threading
import time

from ultralytics import YOLO

import numpy as np

class Camera:

    def __init__(
        self,
        camera_id,
        source,
        model_path="yolo11n.pt"
    ):

        # ==========================================
        # IDENTIFICATION
        # ==========================================

        self.camera_id = camera_id
        self.source = source


        # ==========================================
        # VIDEO
        # ==========================================

        self.cap = cv2.VideoCapture(source)

        if not self.cap.isOpened():

            raise RuntimeError(
                f"Impossible d'ouvrir la caméra "
                f"{camera_id}"
            )


        # ==========================================
        # YOLO
        # ==========================================

        self.model = YOLO(model_path)


        # ==========================================
        # REGION
        # ==========================================

        self.region = None


        # ==========================================
        # RESULTATS
        # ==========================================

        self.person_count = 0

        self.annotated_frame = None


        self.yolo_count = 0
        self.person_count = 0   

        # ==========================================
        # QUEUE
        # ==========================================

        self.frame_queue = queue.Queue(
            maxsize=1
        )


        # ==========================================
        # LOCK
        # ==========================================

        self.lock = threading.Lock()


        # ==========================================
        # THREADS
        # ==========================================

        self.capture_worker = threading.Thread(

            target=self.capture,

            daemon=True
        )


        self.yolo_worker = threading.Thread(

            target=self.process_yolo,

            daemon=True
        )


    # ======================================================
    # DÉMARRER LA CAMÉRA
    # ======================================================

    def start(self):

        self.capture_worker.start()

        self.yolo_worker.start()


    # ======================================================
    # ACQUISITION VIDEO
    # ======================================================

    def capture(self):

        while True:

            ret, frame = self.cap.read()


            # ----------------------------------------------
            # Fin de vidéo
            # ----------------------------------------------

            if not ret:

                self.cap.set(
                    cv2.CAP_PROP_POS_FRAMES,
                    0
                )

                continue


            # ----------------------------------------------
            # Garder uniquement la dernière frame
            # ----------------------------------------------

            try:

                if not self.frame_queue.empty():

                    self.frame_queue.get_nowait()


                self.frame_queue.put_nowait(frame)


            except queue.Full:

                pass


            time.sleep(0.001)


    # ======================================================
    # TRAITEMENT YOLO
    # ======================================================
    """""
    def process_yolo(self):

        while True:

            # ----------------------------------------------
            # Attendre une frame
            # ----------------------------------------------

            frame = self.frame_queue.get()


            # ----------------------------------------------
            # Région actuelle
            # ----------------------------------------------

            with self.lock:

                region = self.region


            # ==============================================
            # YOLO code de parfait en commentaire
            # ==============================================
            
            if region is not None:

                results = self.model.track(

                    frame,

                    persist=True,

                    classes=[0],

                    verbose=False
                )


                # ------------------------------------------
                # Nombre de personnes
                # ------------------------------------------

                count = len(
                    results[0].boxes
                )


                # ------------------------------------------
                # Image annotée
                # ------------------------------------------

                processed_frame = results[0].plot()


            else:

                count = 0

                processed_frame = frame

            # ==============================================
            # SAUVEGARDER LES RESULTATS
            # ==============================================

            with self.lock:

                self.person_count = count

                self.annotated_frame = processed_frame
"""
    #======================================================
    #Comptage + traitement yolo
    #======================================================
    def is_inside_region(self, x, y, region):

            if not region or len(region) < 3:
                return False

            polygon = [
                (int(point[0]), int(point[1]))
                for point in region
            ]

            return cv2.pointPolygonTest(
                polygon,
                (float(x), float(y)),
                False
            ) >= 0

        #=====================================
        # Traitement de yolo
        #=====================================
    def process_yolo(self):

        while True:

            frame = self.frame_queue.get()

            with self.lock:
                region = self.region

            # ==========================================
            # DETECTION YOLO
            # ==========================================

            results = self.model.track(
                frame,
                persist=True,
                classes=[0],
                verbose=False
            )

            result = results[0]

            # Nombre TOTAL détecté par YOLO
            yolo_count = len(result.boxes)

            # Affichage des rectangles YOLO
            processed_frame = result.plot()

            # ==========================================
            # COMPTAGE DANS LA ZONE
            # ==========================================

            zone_count = 0

            if region is not None and len(region) >= 3:

                polygon = np.array(
                    region,
                    dtype=np.int32
                )

                # Dessiner la zone
                cv2.polylines(
                    processed_frame,
                    [polygon],
                    True,
                    (0, 255, 0),
                    3
                )

                if result.boxes is not None:

                    for box in result.boxes:

                        x1, y1, x2, y2 = map(
                            int,
                            box.xyxy[0].tolist()
                        )

                        center_x = int(
                            (x1 + x2) / 2
                        )

                        center_y = int(
                            (y1 + y2) / 2
                        )

                        inside = cv2.pointPolygonTest(
                            polygon,
                            (center_x, center_y),
                            False
                        )

                        if inside >= 0:
                            zone_count += 1

            # ==========================================
            # SAUVEGARDE
            # ==========================================

            with self.lock:

                self.yolo_count = yolo_count
                self.person_count = zone_count
                self.annotated_frame = processed_frame

        # ======================================================
        # GENERATEUR VIDEO
        # ======================================================

    def generate_frames(self):

            while True:

                # ----------------------------------------------
                # Récupérer dernière image
                # ----------------------------------------------

                with self.lock:

                    frame = self.annotated_frame


                if frame is None:

                    time.sleep(0.01)

                    continue


                # ----------------------------------------------
                # JPEG
                # ----------------------------------------------

                success, encoded_image = cv2.imencode(

                    ".jpg",

                    frame
                )


                if not success:

                    continue


                # ----------------------------------------------
                # Streaming
                # ----------------------------------------------

                yield (

                    b"--frame\r\n"

                    b"Content-Type: image/jpeg\r\n\r\n"

                    + encoded_image.tobytes()

                    + b"\r\n"
                )


        # ======================================================
        # DEFINIR REGION
        # ======================================================

    def set_region(self, region):

            with self.lock:

                self.region = region


            print(

                f"Caméra {self.camera_id} "
                f"→ nouvelle région : {region}"

            )

        # ======================================================
        # RECUPERER DONNEES
        # ======================================================

    def get_data(self):

        with self.lock:

            return {
                "camera_id": self.camera_id,

                # Toutes les personnes détectées
                "yolo_count": self.yolo_count,

                # Personnes dans la zone
                "person_count": self.person_count,

                "region": self.region
            }
                