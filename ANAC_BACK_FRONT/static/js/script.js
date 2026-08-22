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

                <label>FAIBLE</label>

                <p>
                    Attente :
                    <b>05 min</b>
                </p>

            </div>


            <div class="indicator orange">

                <span>CONTRÔLE SÛRETÉ</span>

                <strong id="dashboard-surete">
                    0
                </strong>

                <label>ÉLEVÉ</label>

                <p>
                    Attente :
                    <b>17 min</b>
                </p>

            </div>


            <div class="indicator green">

                <span>EMBARQUEMENT</span>

                <strong id="dashboard-embarquement">
                    0
                </strong>

                <label>FAIBLE</label>

                <p>
                    Attente :
                    <b>07 min</b>
                </p>

            </div>


            <div class="total">

                <span>TOTAL AÉROPORT</span>

                <strong id="dashboard-total">
                    0
                </strong>

                <p> Passagers</p>

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


            <div class="alert critical">

                ⚠
                <b>CONTRÔLE SÛRETÉ</b>

                <h3>
                    Congestion critique
                </h3>

                <p>
                    Temps d'attente &gt; 20 min
                </p>

            </div>


            <div class="alert warning">

                ⚠
                <b>CONTRÔLE SÛRETÉ</b>

                <h3>
                    Charge élevée
                </h3>

                <p>
                    Temps d'attente &gt; 15 min
                </p>

            </div>


            <div class="alert info">

                ●
                <b>EMBARQUEMENT</b>

                <h3>
                    Affluence modérée
                </h3>

                <p>
                    Surveillance recommandée
                </p>

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

    return `

    <div class="panel">

        <h2>
            PRÉVISION D'AFFLUENCE
        </h2>


        <table>

            <tr>
                <th>ZONE</th>
                <th>ACTUEL</th>
                <th>+15 MIN</th>
                <th>+30 MIN</th>
                <th>RISQUE</th>
            </tr>


            <tr>
                <td>Enregistrement</td>
                <td>76</td>
                <td>85</td>
                <td>94</td>
                <td>Faible</td>
            </tr>


            <tr>
                <td>Contrôle sûreté</td>
                <td>142</td>
                <td>168</td>
                <td>195</td>
                <td>Très élevé</td>
            </tr>


            <tr>
                <td>Embarquement</td>
                <td>58</td>
                <td>62</td>
                <td>72</td>
                <td>Modéré</td>
            </tr>

        </table>

    </div>

    `;

}


/* =====================================================
   RECOMMANDATION
===================================================== */

function recommendation() {

    return `

    <section class="recommendation">

        <div>

            🤖
            <strong>
                RECOMMANDATION IA
            </strong>

        </div>


        <div>

            <h3>
                Ouvrir un poste supplémentaire
                au contrôle sûreté
            </h3>

            <p>
                Cette recommandation viendra
                du module Python.
            </p>

        </div>


        <button
            onclick="alert('Commande à connecter à Flask')">

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