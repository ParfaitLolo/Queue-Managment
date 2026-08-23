/* =====================================================
   SMARTQUEUE-AVSEC
   FRONTEND
===================================================== */


/* =====================================================
   LISTE DES CAMERAS
===================================================== */

const cameras = [

    ["CAM-01", "Enregistrement"],
    ["CAM-02", "Contrôle sûreté Nord"],
    ["CAM-03", "Contrôle sûreté Sud"],
    ["CAM-04", "Embarquement"],
    ["CAM-05", "Hall départ"],
    ["CAM-06", "Contrôle passeports"],
    ["CAM-07", "Salle d'attente"],
    ["CAM-08", "Porte d'embarquement"]

];


const titles = {

    dashboard: "Tableau de bord - Supervision en temps réel",
    flux: "Flux passagers",
    files: "Gestion des files d'attente",
    cameras: "Gestion des caméras",
    previsions: "Prévisions d'affluence",
    alertes: "Alertes et événements",
    rapports: "Rapports",
    parametres: "Paramètres"

};


let slot = 0;


/* =====================================================
   VARIABLES POUR LES ZONES
===================================================== */

const zones = {};

const drawing = {};

let startX = 0;
let startY = 0;


/* =====================================================
   CREATION D'UNe ZONE D'AFFICHAGE CAMERA
===================================================== */

function cam(n, id, name) {

    return `

    <div class="camera">

        <div class="camera-header">

            🟢

            <span id="cam${n}">
                ${id} - ${name}
            </span>

            <b>LIVE</b>

        </div>


        <div class="camera-screen">

            <div class="video-container">

                <img
                    id="video-${n}"
                    class="video"
                    src="/video/${n}"
                    alt="Flux caméra ${id}"
                >

                <canvas
                    id="canvas-${n}"
                    class="canvas"
                    width="800"
                    height="450"
                ></canvas>

            </div>

        </div>


        <!-- =========================
             DONNEE YOLO
        ========================== -->

        <div class="person-count">

            <span>
                PERSONNES DÉTECTÉES
            </span>

            <strong id="person-count-${n}">
                0
            </strong>

        </div>


        <!-- =========================
             ACTIONS CAMERA
        ========================== -->

        <div class="camera-actions">

            <button
                class="select-camera"
                onclick="chooseCamera(${n})">

                🎥 Choisir

            </button>


            <button
                class="expand-camera"
                onclick="expandCamera(${n})">

                ⛶ Agrandir

            </button>

        </div>


        <!-- =========================
             ACTIONS ZONE
        ========================== -->

        <div class="zone-actions">

            <button
                class="validate-zone"
                id="validate-${n}">

                ✓ Valider la zone

            </button>


            <button
                class="clear-zone"
                id="clear-${n}">

                Effacer la zone

            </button>

        </div>


        <div id="result-${n}"></div>
          <p>

            Nombre de points :

            <span id="count-${n}">
                0
            </span>

        </p>

    </div>

    `;
}




/* =====================================================
   DASHBOARD
===================================================== */

function dashboard() {

    return `

    <section class="dashboard">


        <!-- INDICATEURS -->

        <div class="indicators">

            <h2>INDICATEURS CLÉS</h2>


            <div class="indicator green">

                <span>ENREGISTREMENT</span>

                <strong id="dashboard-enregistrement">
                    0
                </strong>

                <label id="dashboard-enregistrement-status">
                    FAIBLE
                </label>

                <p>
                    Attente :
                    <b id="dashboard-enregistrement-wait">05 min</b>
                </p>

                <div class="indicator-details">

                    <p>
                        Arrivées :
                        <b id="dashboard-enregistrement-arrival">
                            0 pax/min
                        </b>
                    </p>

                    <p>
                        Traitement :
                        <b id="dashboard-enregistrement-throughput">
                            0 pax/min
                        </b>
                    </p>

                    <p>
                        Attente maximale :
                        <b id="dashboard-enregistrement-max-wait">
                            0 min
                        </b>
                    </p>

                    <p>
                        Tendance :
                        <b id="dashboard-enregistrement-trend">
                            → Stable
                        </b>
                    </p>

                </div>

            </div>


            <div class="indicator orange">

                <span>CONTRÔLE SÛRETÉ</span>

                <strong id="dashboard-surete">
                    0
                </strong>

                <label id="dashboard-surete-status">
                    ÉLEVÉ
                </label>

                <p>
                    Attente :
                    <b id="dashboard-surete-wait">17 min</b>
                </p>

                <div class="indicator-details">

                    <p>
                        Arrivées :
                        <b id="dashboard-surete-arrival">
                            0 pax/min
                        </b>
                    </p>

                    <p>
                        Traitement :
                        <b id="dashboard-surete-throughput">
                            0 pax/min
                        </b>
                    </p>

                    <p>
                        Attente maximale :
                        <b id="dashboard-surete-max-wait">
                            0 min
                        </b>
                    </p>

                    <p>
                        Tendance :
                        <b id="dashboard-surete-trend">
                            ↑ En hausse
                        </b>
                    </p>

                </div>      

            </div>


            <div class="indicator green">

                <span>EMBARQUEMENT</span>

                <strong id="dashboard-embarquement">
                    0
                </strong>

                <label id="dashboard-embarquement-status">
                    FAIBLE
                </label>

                <p>
                    Attente :
                    <b id="dashboard-embarquement-wait">07 min</b>
                </p>
            
                <div class="indicator-details">
                    <p>
                        Arrivées :
                        <b id="dashboard-embarquement-arrival">
                            0 pax/min
                        </b>
                    </p>

                    <p>
                        Traitement :
                        <b id="dashboard-embarquement-throughput">
                            0 pax/min
                        </b>
                    </p>

                    <p>
                        Attente maximale :
                        <b id="dashboard-embarquement-max-wait">
                            0 min
                        </b>
                    </p>

                    <p>
                        Tendance :
                        <b id="dashboard-embarquement-trend">
                            ↓ En baisse
                        </b>
                    </p>        

                </div>  

            </div>

            <div class="indicator green">

                <span>HALL DÉPART</span>

                <strong id="dashboard-hall-depart">
                    0
                </strong>

                <label id="dashboard-hall-depart-status">
                    FAIBLE
                </label>

                <p>
                    Attente :
                    <b id="dashboard-hall-depart-wait">07 min</b>
                </p>

                <div class="indicator-details">

                    <p>
                        Arrivées :
                        <b id="dashboard-hall-depart-arrival">
                            0 pax/min
                        </b>
                    </p>

                    <p>
                        Traitement :
                        <b id="dashboard-hall-depart-throughput">
                            0 pax/min
                        </b>
                    </p>

                    <p>
                        Attente maximale :
                        <b id="dashboard-hall-depart-max-wait">
                            0 min
                        </b>
                    </p>

                    <p>
                        Tendance :
                        <b id="dashboard-hall-depart-trend">
                            → Stable
                        </b>
                    </p>

                </div>

            </div>

        </div>


        <!-- CAMERAS -->

        <div class="cameras">

            ${cam(
                1,
                "CAM-01",
                "Enregistrement"
            )}

            ${cam(
                2,
                "CAM-02",
                "Contrôle sûreté Nord"
            )}

            ${cam(
                3,
                "CAM-04",
                "Embarquement"
            )}

            ${cam(
                4,
                "CAM-05",
                "Hall départ"
            )}

        </div>


        <!-- ALERTES -->
        <div class="alerts">

            <h2>ALERTES EN COURS</h2>

            <div id="alerts-list">

                <div class="alert-empty">
                    Aucune alerte en cours
                </div>

            </div>

        </div>
    
    </section>


    <!-- PREVISION -->

    <section class="bottom">

        ${forecast()}

    </section>


    <!-- RECOMMANDATION -->

    ${recommendation()}

    `;

}

/* Page flux montrant le flux en temps réel*/

function pageFlux() {

    return `
        <div class="page">

            <h2>Flux passagers</h2>

            <div class="page-grid">

                <div class="panel">
                    <h3>Enregistrement</h3>
                    <div class="big"
                         id="flux-enregistrement">
                        0
                    </div>
                    <p>Personnes détectées</p>
                </div>

                <div class="panel">
                    <h3>Contrôle sûreté</h3>
                    <div class="big"
                         id="flux-surete">
                        0
                    </div>
                    <p>Personnes détectées</p>
                </div>

                <div class="panel">
                    <h3>Total</h3>
                    <div class="big"
                         id="flux-total">
                        0
                    </div>
                    <p>Passagers détectés</p>
                </div>

            </div>

        </div>
    `;
}


/* Page caméras montrant les caméras en temps réel*/

function pageCameras() {

    return `
        <div class="page">

            <h2>Gestion des caméras</h2>

            <div class="page-grid">

                <div class="panel">
                    <h3>CAM-01</h3>
                    <p>Enregistrement</p>
                    <span class="status-online">
                        ● CONNECTÉE
                    </span>
                </div>

                <div class="panel">
                    <h3>CAM-02</h3>
                    <p>Contrôle sûreté Nord</p>
                    <span class="status-online">
                        ● CONNECTÉE
                    </span>
                </div>

                <div class="panel">
                    <h3>CAM-03</h3>
                    <p>Contrôle sûreté Sud</p>
                    <span>
                        ● EN ATTENTE
                    </span>
                </div>

                <div class="panel">
                    <h3>CAM-04</h3>
                    <p>Embarquement</p>
                    <span>
                        ● EN ATTENTE
                    </span>
                </div>

            </div>

        </div>
    `;
}



/* =====================================================
   PREVISION
===================================================== */

function forecast() {

    const forecastZones = [
        {
            cameraId: 1,
            name: "Enregistrement"
        },
        {
            cameraId: 2,
            name: "Contrôle sûreté"
        },
        {
            cameraId: 3,
            name: "Embarquement"
        }
    ];

    const rows = forecastZones
        .map(function(zone) {

            return `
                <tr id="forecast-row-${zone.cameraId}">

                    <td>
                        ${zone.name}
                    </td>

                    <td id="forecast-current-${zone.cameraId}">
                        0
                    </td>

                    <td id="forecast-15-${zone.cameraId}">
                        0
                    </td>

                    <td id="forecast-30-${zone.cameraId}">
                        0
                    </td>

                    <td>
                        <span
                            id="forecast-risk-${zone.cameraId}"
                            class="forecast-risk risk-low"
                        >
                            FAIBLE
                        </span>
                    </td>

                </tr>
            `;

        })
        .join("");

    return `

        <div class="panel">

            <h2>
                PRÉVISION D'AFFLUENCE
            </h2>

            <table>

                <thead>

                    <tr>
                        <th>ZONE</th>
                        <th>ACTUEL</th>
                        <th>+15 MIN</th>
                        <th>+30 MIN</th>
                        <th>RISQUE</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>

            <p class="forecast-information">
                Projection calculée à partir des débits
                d’arrivée et de sortie actuels.
            </p>

        </div>

    `;
}


/* =====================================================
   RECOMMANDATION
===================================================== */

function recommendation() {

    return `

        <section
            id="recommendation-panel"
            class="recommendation"
        >

            <div class="recommendation-title">

                <span>🤖</span>

                <strong>
                    RECOMMANDATION
                </strong>

            </div>

            <div class="recommendation-content">

                <h3 id="recommendation-message">
                    Analyse des données en cours...
                </h3>

                <p id="recommendation-details">
                    En attente des premières mesures.
                </p>

            </div>

            <button
                id="recommendation-apply"
                type="button"
                disabled
            >
                APPLIQUER
            </button>

        </section>

    `;
}

/* =====================================================
   PAGES
===================================================== */

function page(p) {

    if (p === "dashboard") {
        return dashboard();
    }

    if (p === "flux") {
        return pageFlux();
    }

    if (p === "cameras") {
        return pageCameras();
    }

    if (p === "previsions") {
        return forecast();
    }

    if (p === "Alertes") {
        return forecast();
    }

    if (p === "Rapports") {
        return forecast();
    }
    return `
        <div class="page">

            <h2>${titles[p]}</h2>

            <p>
                Cette page recevra ses données
                depuis le backend Python.
            </p>

        </div>
    `;
}


/* =====================================================
   NAVIGATION
===================================================== */

document.querySelectorAll("nav a").forEach(a => {
    a.onclick = () => {
        document.querySelectorAll("nav a").forEach(x => {
            x.classList.remove("active");
        });

        a.classList.add("active");

        const selectedPage = a.dataset.page;

        document.getElementById("pageTitle").textContent =
            titles[selectedPage];

        document.getElementById("content").innerHTML =
            page(selectedPage);

        /*
            Très important :
            car chaque appui sur dashboard recrée les caméras donc les canva doivent être réinitialisés.
        */
        if (selectedPage === "dashboard") {
            initializeCameras();
        }
    };
});



/* =====================================================
   CHOISIR UNE CAMERA
===================================================== */

function chooseCamera(n) {

    slot = n;


    document.getElementById(
        "cameraList"
    ).innerHTML =

        cameras.map(c => `

            <button
                class="camera-option"
                onclick="
                    assignCamera(
                        '${c[0]}',
                        '${c[1]}'
                    )
                ">

                🟢 ${c[0]}

                <small>
                    ${c[1]}
                </small>

            </button>

        `).join("");


    document
        .getElementById("cameraModal")
        .classList.remove("hidden");

}


/* =====================================================
   ASSIGNER UNE CAMERA
===================================================== */

function assignCamera(id, name) {

    document.getElementById(
        "cam" + slot
    ).textContent =
        id + " - " + name;


    /*
        Le flux vidéo correspondant
        est également changé.
    */

    const numero =
        cameras.findIndex(
            c => c[0] === id
        ) + 1;


    const video =
        document.getElementById(
            `video-${slot}`
        );


    if (video) {

        video.src =
            `/video/${numero}`;

    }


    closeCamera();

}


/* =====================================================
   FERMER MODAL CAMERA
===================================================== */

function closeCamera() {

    document
        .getElementById("cameraModal")
        .classList.add("hidden");

}


/* =====================================================
   AGRANDIR CAMERA
===================================================== */

function expandCamera(n) {

    const title =
        document.getElementById(`cam${n}`).textContent;

    const video =
        document.getElementById(`video-${n}`);

    document.getElementById("largeTitle").textContent = title;

    const largeVideo =
        document.getElementById("largeVideo");

    largeVideo.src = video.src;

    document
        .getElementById("videoModal")
        .classList.remove("hidden");
}


/* =====================================================
   FERMER VIDEO
===================================================== */

function closeVideo() {

    document
        .getElementById("videoModal")
        .classList.add("hidden");


    document.getElementById(
        "largeVideo"
    ).src = "";

}


/* =====================================================
   HORLOGE
===================================================== */

function clock() {

    const d = new Date();


    document.getElementById(
        "time"
    ).textContent =
        d.toLocaleTimeString("fr-FR");


    document.getElementById(
        "dateText"
    ).textContent =
        d.toLocaleDateString(
            "fr-FR",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );

}


/* =====================================================
   DEMARRAGE
===================================================== */

function demarrerApplication() {

    document.getElementById(
        "pageTitle"
    ).textContent =
        titles.dashboard;


    document.getElementById(
        "content"
    ).innerHTML =
        dashboard();

    /*
        Très important :
        car le dashboard est créé au démarrage donc les canva doivent être initialisés
    */
    initializeCameras();
    clock();

}


/* Horloge */

setInterval(
    clock,
    1000
);


/*
    Démarrage immédiat.
*/

document.addEventListener(
    "DOMContentLoaded",
    demarrerApplication
);