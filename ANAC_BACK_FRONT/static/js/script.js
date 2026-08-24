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

const MAX_FLUX_HISTORY = 150;

const fluxHistory = {

    labels: [],

    registration: [],

    security: [],

    boarding: []

};

let fluxHistoryChart = null;

let fluxRateChart = null;

const queueZones = [

    {
        cameraId: 1,
        name: "Enregistrement",
        historyKey: "registration"
    },

    {
        cameraId: 2,
        name: "Contrôle sûreté",
        historyKey: "security"
    },

    {
        cameraId: 3,
        name: "Embarquement",
        historyKey: "boarding"
    }

];

const MAX_QUEUE_HISTORY = 150;

const queueHistory = {

    labels: [],

    registration: [],

    security: [],

    boarding: []

};

let queueLengthChart = null;

let queueWaitChart = null;

let cameraConfigurations = [

    {
        id: 1,
        name: "CAM-01",
        zone: "Enregistrement",
        type: "IP",
        source: "rtsp://192.168.1.101/stream",
        status: "online"
    },

    {
        id: 2,
        name: "CAM-02",
        zone: "Contrôle sûreté Nord",
        type: "IP",
        source: "rtsp://192.168.1.102/stream",
        status: "online"
    },

    {
        id: 3,
        name: "CAM-03",
        zone: "Contrôle sûreté Sud",
        type: "IP",
        source: "",
        status: "waiting"
    },

    {
        id: 4,
        name: "CAM-04",
        zone: "Embarquement",
        type: "IP",
        source: "",
        status: "waiting"
    }

];


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

        <div class="page flux-page">

            <h2>Flux passagers en temps réel</h2>

             <!-- ÉVOLUTION TEMPORELLE -->

            <div class="panel flux-chart-panel">

                <h3>
                    Évolution du nombre de passagers
                </h3>

                <div class="chart-container">

                    <canvas
                        id="flux-history-chart"
                    ></canvas>

                </div>

            </div>


            <!-- COMPARAISON DES DÉBITS -->

            <div class="panel flux-chart-panel">

                <h3>
                    Arrivées et sorties par zone
                </h3>

                <div class="chart-container">

                    <canvas
                        id="flux-rate-chart"
                    ></canvas>

                </div>

            </div>

            <!-- INDICATEURS INSTANTANÉS -->

            <div class="page-grid flux-indicators">

                <div class="panel">

                    <h3>Passagers présents</h3>

                    <div
                        class="big"
                        id="flux-total"
                    >
                        0
                    </div>

                    <p>
                        Toutes zones confondues
                    </p>

                </div>

                <div class="panel">

                    <h3>Débit d'arrivée</h3>

                    <div
                        class="big"
                        id="flux-arrival-total"
                    >
                        0.0
                    </div>

                    <p>
                        Passagers/minute
                    </p>

                </div>

                <div class="panel">

                    <h3>Débit de sortie</h3>

                    <div
                        class="big"
                        id="flux-throughput-total"
                    >
                        0.0
                    </div>

                    <p>
                        Passagers/minute
                    </p>

                </div>

                <div class="panel">

                    <h3>Évolution de la file</h3>

                    <div
                        class="big"
                        id="flux-balance"
                    >
                        0.0
                    </div>

                    <p id="flux-balance-label">
                        File stable
                    </p>

                </div>

            </div>

        </div>

    `;
}

/* Page flux montrant les files d'attente en temps réel*/
function pageFile() {

    return `

        <div class="page queue-page">

            <h2>
                Files d’attente
            </h2>

            
            <!-- LONGUEUR DES FILES -->

            <div class="panel queue-chart-panel">

                <h3>
                    Évolution de la longueur des files
                </h3>

                <div class="chart-container">

                    <canvas
                        id="queue-length-chart"
                    ></canvas>

                </div>

            </div>


            <!-- TEMPS D'ATTENTE -->

            <div class="panel queue-chart-panel">

                <h3>
                    Temps d’attente par zone
                </h3>

                <div class="chart-container">

                    <canvas
                        id="queue-wait-chart"
                    ></canvas>

                </div>

            </div>


            <!-- INDICATEURS GLOBAUX -->

            <div class="page-grid queue-indicators">

                <div class="panel">

                    <h3>Personnes en attente</h3>

                    <div
                        class="big"
                        id="queue-total-count"
                    >
                        0
                    </div>

                    <p>
                        Toutes zones confondues
                    </p>

                </div>


                <div class="panel">

                    <h3>Attente moyenne</h3>

                    <div
                        class="big"
                        id="queue-average-wait"
                    >
                        0.0 min
                    </div>

                    <p>
                        Moyenne des personnes présentes
                    </p>

                </div>


                <div class="panel">

                    <h3>Attente maximale</h3>

                    <div
                        class="big"
                        id="queue-maximum-wait"
                    >
                        0.0 min
                    </div>

                    <p id="queue-maximum-zone">
                        Aucune attente
                    </p>

                </div>


                <div
                    class="panel"
                    id="queue-congestion-panel"
                >

                    <h3>Niveau global</h3>

                    <div
                        class="big"
                        id="queue-congestion-level"
                    >
                        FAIBLE
                    </div>

                    <p id="queue-critical-zone">
                        Situation normale
                    </p>

                </div>

            </div>

        </div>

    `;
}

/* Page caméras montrant les caméras en temps réel*/
function pageCameras() {

    return `

        <div class="page camera-management-page">

            <div class="camera-page-header">

                <div>

                    <h2>
                        Gestion des caméras
                    </h2>

                    <p>
                        Ajoutez, recherchez et configurez
                        les caméras.
                    </p>

                </div>

                <button
                    type="button"
                    id="add-camera-button"
                    class="primary-button"
                >
                    + AJOUTER UNE CAMÉRA
                </button>

            </div>


            <!-- RECHERCHE -->

            <div class="camera-toolbar">

                <div class="camera-search-container">

                    <span aria-hidden="true">
                        🔍
                    </span>

                    <input
                        type="search"
                        id="camera-search"
                        placeholder="Rechercher une caméra ou une zone..."
                        autocomplete="off"
                    >

                </div>

                <span id="camera-result-count">
                    0 caméra
                </span>

            </div>


            <!-- LISTE DYNAMIQUE -->

            <div
                id="camera-management-list"
                class="page-grid camera-list"
            ></div>


            <!-- MESSAGE AUCUN RÉSULTAT -->

            <div
                id="camera-empty-result"
                class="camera-empty-result"
                hidden
            >

                Aucune caméra trouvée.

            </div>


            <!-- FENÊTRE AJOUT / CONFIGURATION -->

            <dialog
                id="camera-dialog"
                class="camera-dialog"
            >

                <form
                    id="camera-form"
                    class="camera-form"
                >

                    <div class="camera-dialog-header">

                        <h3 id="camera-dialog-title">
                            Ajouter une caméra
                        </h3>

                        <button
                            type="button"
                            id="camera-dialog-close"
                            class="dialog-close-button"
                            aria-label="Fermer"
                        >
                            ×
                        </button>

                    </div>


                    <input
                        type="hidden"
                        id="camera-edit-id"
                    >


                    <label for="camera-name-input">
                        Identifiant de la caméra
                    </label>

                    <input
                        type="text"
                        id="camera-name-input"
                        placeholder="Exemple : CAM-05"
                        required
                    >


                    <label for="camera-zone-input">
                        Zone surveillée
                    </label>

                    <select
                        id="camera-zone-input"
                        required
                    >

                        <option value="">
                            Sélectionner une zone
                        </option>

                        <option value="Enregistrement">
                            Enregistrement
                        </option>

                        <option value="Contrôle sûreté Nord">
                            Contrôle sûreté Nord
                        </option>

                        <option value="Contrôle sûreté Sud">
                            Contrôle sûreté Sud
                        </option>

                        <option value="Embarquement">
                            Embarquement
                        </option>

                        <option value="Hall départ">
                            Hall départ
                        </option>

                        <option value="Arrivée">
                            Arrivée
                        </option>

                    </select>


                    <label for="camera-type-input">
                        Type de caméra
                    </label>

                    <select
                        id="camera-type-input"
                        required
                    >

                        <option value="IP">
                            Caméra IP
                        </option>

                        <option value="ONVIF">
                            Caméra IP ONVIF
                        </option>

                        <option value="Webcam">
                            Webcam USB
                        </option>

                        <option value="Analogique">
                            Caméra analogique avec encodeur
                        </option>

                        <option value="Fichier">
                            Fichier vidéo de test
                        </option>

                    </select>


                    <label for="camera-source-input">
                        Source vidéo
                    </label>

                    <input
                        type="text"
                        id="camera-source-input"
                        placeholder="RTSP, numéro webcam ou chemin vidéo"
                    >


                    <p
                        id="camera-source-help"
                        class="camera-form-help"
                    >
                        Exemple :
                        rtsp://192.168.1.100/stream
                    </p>


                    <label for="camera-status-input">
                        État
                    </label>

                    <select
                        id="camera-status-input"
                    >

                        <option value="online">
                            Connectée
                        </option>

                        <option value="waiting">
                            En attente
                        </option>

                        <option value="offline">
                            Hors ligne
                        </option>

                    </select>


                    <div class="camera-dialog-actions">

                        <button
                            type="button"
                            id="camera-form-cancel"
                        >
                            ANNULER
                        </button>

                        <button
                            type="submit"
                            class="primary-button"
                        >
                            ENREGISTRER
                        </button>

                    </div>

                </form>

            </dialog>

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

    if(p== "files"){
        return pageFile();
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
                Cette page est en cours de développement ...
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
        if (selectedPage === "flux"){
            initializeFluxCharts();
        }

        if(selectedPage ==="files"){
            initializeQueueCharts();
        }
        if(selectedPage ==="cameras"){
            initializeCameraManagement();
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
   FLUX PAGE 
===================================================== */
function initializeFluxCharts() {

    const historyCanvas =
        document.getElementById(
            "flux-history-chart"
        );

    const rateCanvas =
        document.getElementById(
            "flux-rate-chart"
        );

    if (!historyCanvas || !rateCanvas) {
        return;
    }

    // Éviter de recréer plusieurs graphiques
    if (fluxHistoryChart) {
        fluxHistoryChart.destroy();
    }

    if (fluxRateChart) {
        fluxRateChart.destroy();
    }

    // ==========================================
    // COURBE D'ÉVOLUTION
    // ==========================================

    fluxHistoryChart = new Chart(

        historyCanvas.getContext("2d"),

        {
            type: "line",

            data: {

                labels:
                    fluxHistory.labels,

                datasets: [

                    {
                        label: "Enregistrement",

                        data:
                            fluxHistory.registration,

                        borderColor:
                            "#22c55e",

                        backgroundColor:
                            "rgba(34, 197, 94, 0.10)",

                        tension: 0.3,

                        pointRadius: 0,

                        borderWidth: 2
                    },

                    {
                        label: "Contrôle sûreté",

                        data:
                            fluxHistory.security,

                        borderColor:
                            "#f97316",

                        backgroundColor:
                            "rgba(249, 115, 22, 0.10)",

                        tension: 0.3,

                        pointRadius: 0,

                        borderWidth: 2
                    },

                    {
                        label: "Embarquement",

                        data:
                            fluxHistory.boarding,

                        borderColor:
                            "#3b82f6",

                        backgroundColor:
                            "rgba(59, 130, 246, 0.10)",

                        tension: 0.3,

                        pointRadius: 0,

                        borderWidth: 2
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                scales: {

                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Nombre de personnes"
                        },

                        ticks: {
                            precision: 0
                        }
                    },

                    x: {
                        title: {
                            display: true,
                            text: "Heure"
                        },

                        ticks: {
                            maxTicksLimit: 10
                        }
                    }

                }

            }

        }

    );


    // ==========================================
    // DIAGRAMME ARRIVÉES / SORTIES
    // ==========================================

    fluxRateChart = new Chart(

        rateCanvas.getContext("2d"),

        {
            type: "bar",

            data: {

                labels: [
                    "Enregistrement",
                    "Contrôle sûreté",
                    "Embarquement"
                ],

                datasets: [

                    {
                        label: "Arrivées",

                        data: [0, 0, 0],

                        backgroundColor:
                            "#f97316"
                    },

                    {
                        label: "Sorties",

                        data: [0, 0, 0],

                        backgroundColor:
                            "#22c55e"
                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: {
                    duration: 300
                },

                scales: {

                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Passagers par minute"
                        }
                    }

                }

            }

        }

    );
}

function updateFluxPage(data) {

    const registration =
        data[1] || {};

    const security =
        data[2] || {};

    const boarding =
        data[3] || {};


    // ==========================================
    // NOMBRE DE PERSONNES
    // ==========================================

    const registrationCount =
        Number(
            registration.person_count ?? 0
        );

    const securityCount =
        Number(
            security.person_count ?? 0
        );

    const boardingCount =
        Number(
            boarding.person_count ?? 0
        );

    const totalCount =
        registrationCount
        + securityCount
        + boardingCount;


    // ==========================================
    // DÉBITS
    // ==========================================

    const arrivalRates = [

        Number(
            registration.arrival_rate_per_min ?? 0
        ),

        Number(
            security.arrival_rate_per_min ?? 0
        ),

        Number(
            boarding.arrival_rate_per_min ?? 0
        )

    ];

    const throughputRates = [

        Number(
            registration.throughput_rate_per_min ?? 0
        ),

        Number(
            security.throughput_rate_per_min ?? 0
        ),

        Number(
            boarding.throughput_rate_per_min ?? 0
        )

    ];

    const totalArrival =
        arrivalRates.reduce(
            (total, value) => total + value,
            0
        );

    const totalThroughput =
        throughputRates.reduce(
            (total, value) => total + value,
            0
        );

    const balance =
        totalArrival - totalThroughput;


    // ==========================================
    // METTRE À JOUR LES INDICATEURS
    // ==========================================

    setFluxText(
        "flux-total",
        totalCount
    );

    setFluxText(
        "flux-arrival-total",
        totalArrival.toFixed(1)
    );

    setFluxText(
        "flux-throughput-total",
        totalThroughput.toFixed(1)
    );

    setFluxText(
        "flux-balance",
        `${balance >= 0 ? "+" : ""}${balance.toFixed(1)}`
    );

    updateFluxBalance(balance);


    // ==========================================
    // AJOUTER UNE MESURE À L'HISTORIQUE
    // ==========================================

    const currentTime =
        new Date().toLocaleTimeString(
            "fr-FR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    fluxHistory.labels.push(
        currentTime
    );

    fluxHistory.registration.push(
        registrationCount
    );

    fluxHistory.security.push(
        securityCount
    );

    fluxHistory.boarding.push(
        boardingCount
    );


    // Supprimer les plus anciennes mesures
    if (
        fluxHistory.labels.length
        > MAX_FLUX_HISTORY
    ) {

        fluxHistory.labels.shift();

        fluxHistory.registration.shift();

        fluxHistory.security.shift();

        fluxHistory.boarding.shift();
    }


    // ==========================================
    // ACTUALISER LES GRAPHIQUES
    // ==========================================

    if (fluxHistoryChart) {

        fluxHistoryChart.update(
            "none"
        );

    }

    if (fluxRateChart) {

        fluxRateChart.data.datasets[0].data =
            arrivalRates;

        fluxRateChart.data.datasets[1].data =
            throughputRates;

        fluxRateChart.update(
            "none"
        );

    }

}

function updateFluxBalance(balance) {

    const valueElement =
        document.getElementById(
            "flux-balance"
        );

    const labelElement =
        document.getElementById(
            "flux-balance-label"
        );

    if (!valueElement || !labelElement) {
        return;
    }

    valueElement.classList.remove(
        "flow-increasing",
        "flow-stable",
        "flow-decreasing"
    );

    if (balance > 0.5) {

        labelElement.textContent =
            "↗ File en augmentation";

        valueElement.classList.add(
            "flow-increasing"
        );

    } else if (balance < -0.5) {

        labelElement.textContent =
            "↘ File en diminution";

        valueElement.classList.add(
            "flow-decreasing"
        );

    } else {

        labelElement.textContent =
            "→ File stable";

        valueElement.classList.add(
            "flow-stable"
        );

    }
}

// utilitaire flux page 
function setFluxText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );

    if (element) {
        element.textContent = value;
    }
}


/* =====================================================
   FILE D'ATTENTE PAGE 
===================================================== */

function initializeQueueCharts() {

    const lengthCanvas =
        document.getElementById(
            "queue-length-chart"
        );

    const waitCanvas =
        document.getElementById(
            "queue-wait-chart"
        );

    if (!lengthCanvas || !waitCanvas) {
        return;
    }

    if (queueLengthChart) {
        queueLengthChart.destroy();
    }

    if (queueWaitChart) {
        queueWaitChart.destroy();
    }


    // ==========================================
    // ÉVOLUTION DE LA LONGUEUR DES FILES
    // ==========================================

    queueLengthChart = new Chart(

        lengthCanvas.getContext("2d"),

        {
            type: "line",

            data: {

                labels:
                    queueHistory.labels,

                datasets: [

                    {
                        label: "Enregistrement",

                        data:
                            queueHistory.registration,

                        borderColor:
                            "#22c55e",

                        backgroundColor:
                            "rgba(34, 197, 94, 0.10)",

                        borderWidth: 2,

                        pointRadius: 0,

                        tension: 0.3
                    },

                    {
                        label: "Contrôle sûreté",

                        data:
                            queueHistory.security,

                        borderColor:
                            "#f97316",

                        backgroundColor:
                            "rgba(249, 115, 22, 0.10)",

                        borderWidth: 2,

                        pointRadius: 0,

                        tension: 0.3
                    },

                    {
                        label: "Embarquement",

                        data:
                            queueHistory.boarding,

                        borderColor:
                            "#3b82f6",

                        backgroundColor:
                            "rgba(59, 130, 246, 0.10)",

                        borderWidth: 2,

                        pointRadius: 0,

                        tension: 0.3
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                scales: {

                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Personnes dans la file"
                        },

                        ticks: {
                            precision: 0
                        }
                    },

                    x: {
                        title: {
                            display: true,
                            text: "Heure"
                        },

                        ticks: {
                            maxTicksLimit: 10
                        }
                    }

                }

            }

        }

    );


    // ==========================================
    // ATTENTE MOYENNE ET MAXIMALE
    // ==========================================

    queueWaitChart = new Chart(

        waitCanvas.getContext("2d"),

        {
            type: "bar",

            data: {

                labels:
                    queueZones.map(
                        zone => zone.name
                    ),

                datasets: [

                    {
                        label: "Attente moyenne",

                        data: [0, 0, 0],

                        backgroundColor:
                            "#f59e0b"
                    },

                    {
                        label: "Attente maximale",

                        data: [0, 0, 0],

                        backgroundColor:
                            "#dc2626"
                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: {
                    duration: 300
                },

                scales: {

                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Temps d'attente (minutes)"
                        }
                    }

                }

            }

        }

    );
}

function getAverageWaitMinutes(cameraData) {

    if (
        cameraData.waiting_time_minutes
        !== undefined
    ) {

        return Number(
            cameraData.waiting_time_minutes
            ?? 0
        );

    }

    if (
        cameraData.average_active_wait_seconds
        !== undefined
    ) {

        return (
            Number(
                cameraData.average_active_wait_seconds
                ?? 0
            ) / 60
        );

    }

    return 0;
}

function getMaximumWaitMinutes(cameraData) {

    return (
        Number(
            cameraData.maximum_active_wait_seconds
            ?? 0
        ) / 60
    );
}
const congestionPriority = {

    FAIBLE: 1,

    MODERE: 2,

    ELEVE: 3,

    CRITIQUE: 4

};

function formatCongestionLevel(level) {

    const labels = {

        FAIBLE: "FAIBLE",

        MODERE: "MODÉRÉ",

        ELEVE: "ÉLEVÉ",

        CRITIQUE: "CRITIQUE"

    };

    return labels[level] || "FAIBLE";
}

function updateQueuePage(data) {

    const zoneResults = [];

    for (const zone of queueZones) {

        const cameraData =
            data[zone.cameraId]
            || data[String(zone.cameraId)]
            || {};

        const personCount =
            Number(
                cameraData.person_count ?? 0
            );

        const averageWaitMinutes =
            getAverageWaitMinutes(
                cameraData
            );

        const maximumWaitMinutes =
            getMaximumWaitMinutes(
                cameraData
            );

        const congestionLevel =
            cameraData.congestion_level
            || "FAIBLE";

        zoneResults.push({

            ...zone,

            personCount,

            averageWaitMinutes,

            maximumWaitMinutes,

            congestionLevel,

            priority:
                congestionPriority[
                    congestionLevel
                ] || 1

        });

    }


    // ==========================================
    // TOTAL DES PERSONNES EN FILE
    // ==========================================

    const totalPeople =
        zoneResults.reduce(
            (total, zone) =>
                total + zone.personCount,
            0
        );


    // ==========================================
    // ATTENTE MOYENNE PONDÉRÉE
    // ==========================================

    const weightedWaitTotal =
        zoneResults.reduce(
            (total, zone) => {

                return (
                    total
                    + zone.averageWaitMinutes
                    * zone.personCount
                );

            },
            0
        );

    const globalAverageWait =
        totalPeople > 0
            ? weightedWaitTotal / totalPeople
            : 0;


    // ==========================================
    // ZONE AVEC L'ATTENTE MAXIMALE
    // ==========================================

    const maximumWaitZone =
        [...zoneResults].sort(
            (first, second) =>
                second.maximumWaitMinutes
                - first.maximumWaitMinutes
        )[0];

    const globalMaximumWait =
        maximumWaitZone
            ?.maximumWaitMinutes
        ?? 0;


    // ==========================================
    // ZONE AVEC LA PLUS FORTE CONGESTION
    // ==========================================

    const mostCongestedZone =
        [...zoneResults].sort(
            function(first, second) {

                if (
                    second.priority
                    !== first.priority
                ) {

                    return (
                        second.priority
                        - first.priority
                    );

                }

                return (
                    second.personCount
                    - first.personCount
                );

            }
        )[0];


    // ==========================================
    // ACTUALISER LES INDICATEURS
    // ==========================================

    setQueueText(
        "queue-total-count",
        totalPeople
    );

    setQueueText(
        "queue-average-wait",
        `${globalAverageWait.toFixed(1)} min`
    );

    setQueueText(
        "queue-maximum-wait",
        `${globalMaximumWait.toFixed(1)} min`
    );

    setQueueText(
        "queue-maximum-zone",

        globalMaximumWait > 0
            ? maximumWaitZone.name
            : "Aucune attente"
    );

    setQueueText(
        "queue-congestion-level",

        formatCongestionLevel(
            mostCongestedZone
                ?.congestionLevel
        )
    );

    setQueueText(
        "queue-critical-zone",

        mostCongestedZone
            ? mostCongestedZone.name
            : "Situation normale"
    );

    updateQueueCongestionStyle(
        mostCongestedZone
            ?.congestionLevel
        || "FAIBLE"
    );


    // ==========================================
    // AJOUTER À L'HISTORIQUE
    // ==========================================

    const currentTime =
        new Date().toLocaleTimeString(
            "fr-FR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    queueHistory.labels.push(
        currentTime
    );

    for (const zone of zoneResults) {

        queueHistory[
            zone.historyKey
        ].push(
            zone.personCount
        );

    }

    if (
        queueHistory.labels.length
        > MAX_QUEUE_HISTORY
    ) {

        queueHistory.labels.shift();

        queueHistory.registration.shift();

        queueHistory.security.shift();

        queueHistory.boarding.shift();

    }


    // ==========================================
    // ACTUALISER LES GRAPHIQUES
    // ==========================================

    if (queueLengthChart) {

        queueLengthChart.update(
            "none"
        );

    }

    if (queueWaitChart) {

        queueWaitChart
            .data
            .datasets[0]
            .data =
                zoneResults.map(
                    zone =>
                        Number(
                            zone.averageWaitMinutes
                                .toFixed(2)
                        )
                );

        queueWaitChart
            .data
            .datasets[1]
            .data =
                zoneResults.map(
                    zone =>
                        Number(
                            zone.maximumWaitMinutes
                                .toFixed(2)
                        )
                );

        queueWaitChart.update(
            "none"
        );

    }

}

//utilitaires

function setQueueText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );

    if (element) {
        element.textContent = value;
    }
}

function updateQueueCongestionStyle(level) {

    const panel =
        document.getElementById(
            "queue-congestion-panel"
        );

    if (!panel) {
        return;
    }

    panel.classList.remove(
        "queue-low",
        "queue-moderate",
        "queue-high",
        "queue-critical"
    );

    const classMapping = {

        FAIBLE:
            "queue-low",

        MODERE:
            "queue-moderate",

        ELEVE:
            "queue-high",

        CRITIQUE:
            "queue-critical"

    };

    panel.classList.add(
        classMapping[level]
        || classMapping.FAIBLE
    );
}



/* =====================================================
   Page camera
===================================================== */
function initializeCameraManagement() {

    const addButton =
        document.getElementById(
            "add-camera-button"
        );

    const searchInput =
        document.getElementById(
            "camera-search"
        );

    const cameraList =
        document.getElementById(
            "camera-management-list"
        );

    const dialog =
        document.getElementById(
            "camera-dialog"
        );

    const closeButton =
        document.getElementById(
            "camera-dialog-close"
        );

    const cancelButton =
        document.getElementById(
            "camera-form-cancel"
        );

    const cameraForm =
        document.getElementById(
            "camera-form"
        );

    if (
        !addButton
        || !searchInput
        || !cameraList
        || !dialog
        || !cameraForm
    ) {
        return;
    }


    // Affichage initial
    renderCameraManagementCards();


    // ==========================================
    // RECHERCHE
    // ==========================================

    searchInput.addEventListener(
        "input",
        function() {

            renderCameraManagementCards(
                searchInput.value
            );

        }
    );


    // ==========================================
    // AJOUT
    // ==========================================

    addButton.addEventListener(
        "click",
        function() {

            openCameraDialog();

        }
    );


    // ==========================================
    // CONFIGURATION ET SUPPRESSION
    // ==========================================

    cameraList.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(
                    "[data-camera-action]"
                );

            if (!button) {
                return;
            }

            const cameraId =
                Number(
                    button.dataset.cameraId
                );

            const action =
                button.dataset.cameraAction;

            if (action === "configure") {

                openCameraDialog(
                    cameraId
                );

            }

            if (action === "delete") {

                deleteCameraConfiguration(
                    cameraId
                );

            }

        }
    );


    // ==========================================
    // FERMETURE
    // ==========================================

    closeButton?.addEventListener(
        "click",
        function() {

            dialog.close();

        }
    );

    cancelButton?.addEventListener(
        "click",
        function() {

            dialog.close();

        }
    );


    // ==========================================
    // ENREGISTRER
    // ==========================================

    cameraForm.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            saveCameraConfiguration();

        }
    );


    // Modification de l'aide selon le type
    initializeCameraSourceHelp();
}
function renderCameraManagementCards(
    searchValue = ""
) {

    const list =
        document.getElementById(
            "camera-management-list"
        );

    const resultCount =
        document.getElementById(
            "camera-result-count"
        );

    const emptyResult =
        document.getElementById(
            "camera-empty-result"
        );

    if (!list || !resultCount || !emptyResult) {
        return;
    }

    const normalizedSearch =
        searchValue
            .trim()
            .toLowerCase();

    const filteredCameras =
        cameraConfigurations.filter(
            function(camera) {

                const searchableText = `

                    ${camera.name}
                    ${camera.zone}
                    ${camera.type}
                    ${camera.status}

                `.toLowerCase();

                return searchableText.includes(
                    normalizedSearch
                );

            }
        );

    list.innerHTML =
        filteredCameras
            .map(createCameraManagementCard)
            .join("");

    resultCount.textContent =
        `${filteredCameras.length} caméra${
            filteredCameras.length > 1
                ? "s"
                : ""
        }`;

    emptyResult.hidden =
        filteredCameras.length !== 0;
}

function createCameraManagementCard(camera) {

    const statusConfiguration = {

        online: {
            text: "CONNECTÉE",
            className: "status-online"
        },

        waiting: {
            text: "EN ATTENTE",
            className: "status-waiting"
        },

        offline: {
            text: "HORS LIGNE",
            className: "status-offline"
        }

    };

    const status =
        statusConfiguration[camera.status]
        || statusConfiguration.waiting;

    const sourceText =
        camera.source
            ? maskCameraSource(camera.source)
            : "Non configurée";

    return `

        <article
            class="panel camera-management-card"
            data-camera-id="${camera.id}"
        >

            <div class="camera-card-header">

                <div>

                    <h3>
                        ${escapeCameraText(camera.name)}
                    </h3>

                    <p>
                        ${escapeCameraText(camera.zone)}
                    </p>

                </div>

                <span
                    class="camera-status ${status.className}"
                >
                    ● ${status.text}
                </span>

            </div>


            <div class="camera-information">

                <p>

                    <span>Type</span>

                    <strong>
                        ${escapeCameraText(camera.type)}
                    </strong>

                </p>

                <p>

                    <span>Source</span>

                    <strong>
                        ${escapeCameraText(sourceText)}
                    </strong>

                </p>

            </div>


            <div class="camera-actions">

                <button
                    type="button"
                    class="camera-configure-button"
                    data-camera-action="configure"
                    data-camera-id="${camera.id}"
                >
                    ⚙ CONFIGURER
                </button>

                <button
                    type="button"
                    class="camera-delete-button"
                    data-camera-action="delete"
                    data-camera-id="${camera.id}"
                >
                    🗑 SUPPRIMER
                </button>

            </div>

        </article>

    `;
}

function openCameraDialog(cameraId = null) {

    const dialog =
        document.getElementById(
            "camera-dialog"
        );

    const title =
        document.getElementById(
            "camera-dialog-title"
        );

    const idInput =
        document.getElementById(
            "camera-edit-id"
        );

    const nameInput =
        document.getElementById(
            "camera-name-input"
        );

    const zoneInput =
        document.getElementById(
            "camera-zone-input"
        );

    const typeInput =
        document.getElementById(
            "camera-type-input"
        );

    const sourceInput =
        document.getElementById(
            "camera-source-input"
        );

    const statusInput =
        document.getElementById(
            "camera-status-input"
        );

    if (
        !dialog
        || !title
        || !idInput
        || !nameInput
        || !zoneInput
        || !typeInput
        || !sourceInput
        || !statusInput
    ) {
        return;
    }

    if (cameraId === null) {

        title.textContent =
            "Ajouter une caméra";

        idInput.value = "";

        nameInput.value =
            generateNextCameraName();

        zoneInput.value = "";

        typeInput.value = "IP";

        sourceInput.value = "";

        statusInput.value = "waiting";

    } else {

        const camera =
            cameraConfigurations.find(
                camera => camera.id === cameraId
            );

        if (!camera) {
            return;
        }

        title.textContent =
            `Configurer ${camera.name}`;

        idInput.value =
            camera.id;

        nameInput.value =
            camera.name;

        zoneInput.value =
            camera.zone;

        typeInput.value =
            camera.type;

        sourceInput.value =
            camera.source;

        statusInput.value =
            camera.status;
    }

    updateCameraSourceHelp();

    dialog.showModal();

    nameInput.focus();
}

function saveCameraConfiguration() {

    const editId =
        document.getElementById(
            "camera-edit-id"
        ).value;

    const cameraData = {

        name:
            document.getElementById(
                "camera-name-input"
            ).value.trim(),

        zone:
            document.getElementById(
                "camera-zone-input"
            ).value,

        type:
            document.getElementById(
                "camera-type-input"
            ).value,

        source:
            document.getElementById(
                "camera-source-input"
            ).value.trim(),

        status:
            document.getElementById(
                "camera-status-input"
            ).value

    };

    if (editId) {

        const camera =
            cameraConfigurations.find(
                camera =>
                    camera.id === Number(editId)
            );

        if (camera) {

            Object.assign(
                camera,
                cameraData
            );

        }

    } else {

        const newId =
            cameraConfigurations.length > 0
                ? Math.max(
                    ...cameraConfigurations.map(
                        camera => camera.id
                    )
                ) + 1
                : 1;

        cameraConfigurations.push({

            id: newId,

            ...cameraData

        });

    }

    document
        .getElementById("camera-dialog")
        .close();

    const searchValue =
        document.getElementById(
            "camera-search"
        )?.value || "";

    renderCameraManagementCards(
        searchValue
    );
}

function deleteCameraConfiguration(cameraId) {

    const camera =
        cameraConfigurations.find(
            camera => camera.id === cameraId
        );

    if (!camera) {
        return;
    }

    const confirmed =
        confirm(
            `Supprimer ${camera.name} — ${camera.zone} ?`
        );

    if (!confirmed) {
        return;
    }

    cameraConfigurations =
        cameraConfigurations.filter(
            camera => camera.id !== cameraId
        );

    const searchValue =
        document.getElementById(
            "camera-search"
        )?.value || "";

    renderCameraManagementCards(
        searchValue
    );
}

function initializeCameraSourceHelp() {

    const typeInput =
        document.getElementById(
            "camera-type-input"
        );

    if (!typeInput) {
        return;
    }

    typeInput.addEventListener(
        "change",
        updateCameraSourceHelp
    );
}
function updateCameraSourceHelp() {

    const typeInput =
        document.getElementById(
            "camera-type-input"
        );

    const sourceInput =
        document.getElementById(
            "camera-source-input"
        );

    const helpElement =
        document.getElementById(
            "camera-source-help"
        );

    if (
        !typeInput
        || !sourceInput
        || !helpElement
    ) {
        return;
    }

    const configurations = {

        IP: {
            placeholder:
                "rtsp://192.168.1.100/stream",

            help:
                "Entrez l’adresse RTSP de la caméra."
        },

        ONVIF: {
            placeholder:
                "192.168.1.100",

            help:
                "Entrez l’adresse IP de la caméra ONVIF."
        },

        Webcam: {
            placeholder:
                "0",

            help:
                "Entrez le numéro de la webcam : 0, 1, 2..."
        },

        Analogique: {
            placeholder:
                "rtsp://adresse-encodeur/stream",

            help:
                "Entrez l’adresse de l’encodeur vidéo."
        },

        Fichier: {
            placeholder:
                "/videos/test.mp4",

            help:
                "Entrez le chemin du fichier vidéo."
        }

    };

    const selected =
        configurations[typeInput.value]
        || configurations.IP;

    sourceInput.placeholder =
        selected.placeholder;

    helpElement.textContent =
        selected.help;
}
function generateNextCameraName() {

    const nextNumber =
        cameraConfigurations.length > 0
            ? Math.max(
                ...cameraConfigurations.map(
                    camera => camera.id
                )
            ) + 1
            : 1;

    return `CAM-${String(nextNumber).padStart(2, "0")}`;
}
function maskCameraSource(source) {

    return source.replace(
        /\/\/([^:@/]+):([^@/]+)@/,
        "//$1:***@"
    );
}
function escapeCameraText(value) {

    const element =
        document.createElement("div");

    element.textContent =
        String(value ?? "");

    return element.innerHTML;
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