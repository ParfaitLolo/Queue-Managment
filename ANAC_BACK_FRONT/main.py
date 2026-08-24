from fastapi import FastAPI
from fastapi.responses import (
    HTMLResponse,
    StreamingResponse
)
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel

from camera import Camera


app = FastAPI()

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

class RegionData(BaseModel):

    region: list[list[float]]

# ============================================================
# CAMERAS
# ============================================================

cameras = {

    1: Camera(
        camera_id=1,
        source="11.mp4"
    ),

    2: Camera(
        camera_id=2,
        source="12.mp4"
    ),

    3: Camera(
        camera_id=3,
        source="11.mp4"
    ),

    4: Camera(
        camera_id=4,
        source="11.mp4"
    ),
}

# Démarrer toutes les caméras

for camera in cameras.values():

    camera.start()





# ==========================================
# Page HTML
# ==========================================

@app.get("/", response_class=HTMLResponse)
def home():

    with open(
        "templates/index.html",
        "r",
        encoding="utf-8"
    ) as file:

        return file.read()


# routes =================================================
@app.get("/video/{camera_id}")
def video(camera_id: int):

    if camera_id not in cameras:

        return {
            "error": "Caméra inconnue"
        }


    return StreamingResponse(

        cameras[camera_id].generate_frames(),

        media_type=
        "multipart/x-mixed-replace; boundary=frame"

    )



# routes ============================================================
@app.post("/set-region/{camera_id}")
def set_region(
    camera_id: int,
    data: RegionData
):

    if camera_id not in cameras:

        return {
            "error": "Caméra inconnue"
        }


    cameras[camera_id].set_region(
        data.region
    )


    return {

        "message": "Zone reçue",

        "camera_id": camera_id,

        "region": data.region

    }


# routes =================================================

@app.get("/data")
def get_data():

    return {

        camera_id:
        camera.get_data()

        for camera_id, camera
        in cameras.items()

    }

# routes =================================================
@app.get("/test", response_class=HTMLResponse)
def test():

    with open(
        "templates/index_test.html",
        "r",
        encoding="utf-8"
    ) as file:
        return file.read()