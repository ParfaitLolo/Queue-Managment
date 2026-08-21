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
   CREATION D'UNE CAMERA
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
                onclick="validateZone(${n})">

                ✓ Valider la zone

            </button>


            <button
                class="clear-zone"
                onclick="clearZone(${n})">

                Effacer la zone

            </button>

        </div>


        <div id="result-${n}"></div>

    </div>

    `;
}


/* =====================================================
   INITIALISATION DU CANVAS
===================================================== */

function initialiserCanvas(n) {

    const canvas = document.getElementById(`canvas-${n}`);

    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext("2d");


    canvas.onmousedown = function(event) {

        const rect = canvas.getBoundingClientRect();

        startX =
            (event.clientX - rect.left)
            * canvas.width / rect.width;

        startY =
            (event.clientY - rect.top)
            * canvas.height / rect.height;

        drawing[n] = true;

    };


    canvas.onmousemove = function(event) {

        if (!drawing[n]) {
            return;
        }

        const rect = canvas.getBoundingClientRect();

        const currentX =
            (event.clientX - rect.left)
            * canvas.width / rect.width;

        const currentY =
            (event.clientY - rect.top)
            * canvas.height / rect.height;


        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        /* Rectangle de démonstration */

        ctx.beginPath();

        ctx.rect(
            startX,
            startY,
            currentX - startX,
            currentY - startY
        );

        ctx.strokeStyle = "#39b982";
        ctx.lineWidth = 3;

        ctx.stroke();

    };


    canvas.onmouseup = function(event) {

        if (!drawing[n]) {
            return;
        }

        drawing[n] = false;

        const rect = canvas.getBoundingClientRect();

        const endX =
            (event.clientX - rect.left)
            * canvas.width / rect.width;

        const endY =
            (event.clientY - rect.top)
            * canvas.height / rect.height;


        zones[n] = {

            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY

        };

    };

}



/* =====================================================
   VALIDER LA ZONE
===================================================== */

async function validateZone(n) {

    if (!zones[n]) {
        alert("Veuillez dessiner une zone sur la vidéo.");
        return;
    }

    const result = document.getElementById(`result-${n}`);

    result.textContent = "Zone envoyée au serveur...";

    // Transformer le rectangle en points
    const region = [
        [zones[n].x1, zones[n].y1],
        [zones[n].x2, zones[n].y1],
        [zones[n].x2, zones[n].y2],
        [zones[n].x1, zones[n].y2]
    ];

    try {

        const response = await fetch(`/set-region/${n}`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                region: region
            })
        });

        if (!response.ok) {
            throw new Error(
                `Erreur serveur : ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Réponse serveur :", data);

        result.textContent = "✓ Zone validée avec succès";

    } catch (error) {

        console.error("Erreur zone :", error);

        result.textContent =
            "✕ Impossible de contacter le serveur.";
    }
}
/* =====================================================
   EFFACER LA ZONE
===================================================== */

function clearZone(n) {

    const canvas =
        document.getElementById(`canvas-${n}`);

    if (!canvas) {
        return;
    }


    const ctx =
        canvas.getContext("2d");


    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    delete zones[n];


    const result =
        document.getElementById(`result-${n}`);


    result.textContent = "";

}



/* =====================================================
   ACTUALISATION DES DONNÉES YOLO
===================================================== */

async function actualiserYOLO() {

    try {

        const response = await fetch("/data");

        if (!response.ok) {
            throw new Error("Impossible de récupérer /data");
        }

        const data = await response.json();

        console.log("Données Python :", data);


        /* =================================================
           CAMÉRA 1
           person_count = personnes DANS LA ZONE
        ================================================= */

        const count1 = data[1]?.person_count ?? 0;


        // Affichage sous la caméra
        const cameraCount1 =
            document.getElementById("person-count-1");

        if (cameraCount1) {
            cameraCount1.textContent = count1;
        }


        // Indicateur ENREGISTREMENT
        const dashboard1 =
            document.getElementById(
                "dashboard-enregistrement"
            );

        if (dashboard1) {
            dashboard1.textContent = count1;
        }


        // Page FLUX
        const flux1 =
            document.getElementById(
                "flux-enregistrement"
            );

        if (flux1) {
            flux1.textContent = count1;
        }



        /* =================================================
           CAMÉRA 2
           person_count = personnes DANS LA ZONE
        ================================================= */

        const count2 = data[2]?.person_count ?? 0;


        // Affichage sous la caméra
        const cameraCount2 =
            document.getElementById("person-count-2");

        if (cameraCount2) {
            cameraCount2.textContent = count2;
        }


        // Indicateur CONTRÔLE SÛRETÉ
        const dashboard2 =
            document.getElementById(
                "dashboard-surete"
            );

        if (dashboard2) {
            dashboard2.textContent = count2;
        }


        // Page FLUX
        const flux2 =
            document.getElementById(
                "flux-surete"
            );

        if (flux2) {
            flux2.textContent = count2;
        }



        /* =================================================
           TOTAL DES ZONES
        ================================================= */

        const total = count1 + count2;


        // Dashboard
        const dashboardTotal =
            document.getElementById(
                "dashboard-total"
            );

        if (dashboardTotal) {
            dashboardTotal.textContent = total;
        }


        // Page FLUX
        const fluxTotal =
            document.getElementById(
                "flux-total"
            );

        if (fluxTotal) {
            fluxTotal.textContent = total;
        }

    }

    catch (error) {

        console.error(
            "Erreur récupération données YOLO :",
            error
        );

    }

}


/* =====================================================
   LANCEMENT
===================================================== */

actualiserYOLO();

setInterval(
    actualiserYOLO,
    1000
);

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

    a.onclick = function() {

        document
            .querySelectorAll("nav a")
            .forEach(x =>
                x.classList.remove("active")
            );


        a.classList.add("active");


        const pageName =
            a.dataset.page;


        document.getElementById(
            "pageTitle"
        ).textContent =
            titles[pageName];


        document.getElementById(
            "content"
        ).innerHTML =
            page(pageName);


        /*
            Si on revient sur le dashboard,
            on réinitialise les canvas.
        */

        if (pageName === "dashboard") {

            initialiserToutesLesCameras();

            actualiserYOLO();

        }

    };

});


/* =====================================================
   INITIALISER LES CANVAS
===================================================== */

function initialiserToutesLesCameras() {

    for (
        let n = 1;
        n <= cameras.length;
        n++
    ) {

        initialiserCanvas(n);

    }

}


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
        on initialise les canvas
        APRÈS avoir créé le dashboard.
    */

    initialiserToutesLesCameras();


    /*
        Première récupération YOLO
        immédiatement au chargement.
    */

    actualiserYOLO();


    clock();

}


/* Horloge */

setInterval(
    clock,
    1000
);


/*
    Actualisation YOLO toutes les 2 secondes.
*/

setInterval(
    actualiserYOLO,
    2000
);


/*
    Démarrage immédiat.
*/

document.addEventListener(
    "DOMContentLoaded",
    demarrerApplication
);