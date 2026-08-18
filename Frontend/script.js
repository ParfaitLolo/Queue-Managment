/*
==========================================================
       
        SCRIPT.JS — FRONT-END
==========================================================

Ce fichier contient uniquement le JavaScript du FRONT-END.

Les traitements complexes seront réalisés en Python.

ARCHITECTURE :

    CAMÉRAS
       ↓
     YOLO
       ↓
    PYTHON
       ↓
     FLASK
       ↓
      API
       ↓
    FETCH()
       ↓
 JAVASCRIPT
       ↓
   INTERFACE

==========================================================
        API PRÉVUES
==========================================================

/api/cameras    → caméras
/api/yolo       → détection YOLO
/api/queues     → files d'attente
/api/forecast   → prévisions
/api/alerts     → alertes
/api/dashboard  → indicateurs généraux

==========================================================
*/


/*
==========================================================
1. DONNÉES TEMPORAIRES
==========================================================

Ces données servent uniquement à tester l'interface.

Quand le BACK-END Python sera prêt, elles seront
remplacées automatiquement par les données des API.
==========================================================
*/

let cameras = [
    {
        id: "CAM-01",
        name: "Enregistrement",
        zone: "Enregistrement",
        status: "online"
    },
    {
        id: "CAM-02",
        name: "Contrôle sûreté Nord",
        zone: "Contrôle sûreté",
        status: "online"
    },
    {
        id: "CAM-03",
        name: "Contrôle sûreté Sud",
        zone: "Contrôle sûreté",
        status: "online"
    },
    {
        id: "CAM-04",
        name: "Embarquement",
        zone: "Embarquement",
        status: "online"
    },
    {
        id: "CAM-05",
        name: "Hall départ",
        zone: "Hall départ",
        status: "online"
    },
   
];

/*
 {
        id: "CAM-06",
        name: "Contrôle passeports",
        zone: "Contrôle passeports",
        status: "online"
    },
 { 
        id: "CAM-07",
        name: "Salle d'attente",
        zone: "Salle d'attente",
        status: "online"
    },
    {
        id: "CAM-08",
        name: "Porte d'embarquement",
        zone: "Embarquement",
        status: "online"
    }
*/

/*
==========================================================
2. TITRES DES PAGES
==========================================================
*/

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


/*
==========================================================
3. VARIABLE DE SÉLECTION DE CAMÉRA
==========================================================

slot indique l'emplacement caméra actuellement
sélectionné par le superviseur.

Exemple :

slot = 1 → première caméra
slot = 2 → deuxième caméra
==========================================================
*/

let slot = 0;


/*
==========================================================
4. AFFICHAGE D'UNE CAMÉRA
==========================================================
*/

function cam(numero, id, nom) {

    return `

    <div class="camera">

        <div class="camera-header">

            🟢

            <span id="cam${numero}">
                ${id} - ${nom}
            </span>

            <b>LIVE</b>

        </div>


        <div class="camera-screen">

            <!-- ======================================
                 ZONE RÉSERVÉE AU FLUX VIDÉO
                 
                 Le flux réel pourra être connecté
                 par le back-end Python.
                 ====================================== -->

            <div class="fake-video">

                📹

                <br>

                FLUX CAMÉRA

                <br>

                <small>
                    Emplacement réservé au flux vidéo.
                </small>

            </div>

        </div>


        <div class="camera-actions">

            <button
                class="select-camera"
                onclick="chooseCamera(${numero})">

                🎥 Choisir

            </button>


            <button
                class="expand-camera"
                onclick="expandCamera(${numero})">

                ⛶ Agrandir

            </button>

        </div>

    </div>

    `;
}


/*
==========================================================
5. PRÉVISION D'AFFLUENCE
==========================================================

SOURCE FUTURE :

/api/forecast

Le module Python fournira les vraies valeurs.
==========================================================
*/

function forecast() {

    return `

    <div class="panel">

        <h2>PRÉVISION D'AFFLUENCE</h2>


        <table>

            <tr>

                <th>ZONE</th>

                <th>ACTUEL</th>

                <th>+15 MIN</th>

                <th>+30 MIN</th>

                <th>RISQUE</th>

            </tr>


            <!-- DONNÉES TEMPORAIRES -->

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


/*
==========================================================
6. RECOMMANDATION IA
==========================================================

SOURCE FUTURE :

/api/alerts

ou une API dédiée :

/api/recommendations
==========================================================
*/

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
                Cette recommandation sera fournie
                par le module Python.
            </p>

        </div>


        <button onclick="applyRecommendation()">

            APPLIQUER

        </button>

    </section>

    `;
}


/*
==========================================================
7. TABLEAU DE BORD
==========================================================

Les valeurs actuelles sont temporaires.

PLUS TARD :

YOLO → Python → Flask → /api/dashboard
                         ↓
                    JavaScript
==========================================================
*/

function dashboard() {

    return `

    <section class="dashboard">


        <!-- =========================================
             INDICATEURS
             ========================================= -->

        <div class="indicators">

            <h2>
                INDICATEURS CLÉS
            </h2>


            <div class="indicator green">

                <span>
                    ENREGISTREMENT
                </span>

                <strong>
                    76
                </strong>

                <label>
                    FAIBLE
                </label>

                <p>
                    Attente :
                    <b>05 min</b>
                </p>

            </div>


            <div class="indicator orange">

                <span>
                    CONTRÔLE SÛRETÉ
                </span>

                <strong>
                    142
                </strong>

                <label>
                    ÉLEVÉ
                </label>

                <p>
                    Attente :
                    <b>17 min</b>
                </p>

            </div>


            <div class="indicator green">

                <span>
                    EMBARQUEMENT
                </span>

                <strong>
                    58
                </strong>

                <label>
                    FAIBLE
                </label>

                <p>
                    Attente :
                    <b>07 min</b>
                </p>

            </div>


            <div class="total">

                <span>
                    TOTAL AÉROPORT
                </span>

                <strong>
                    276
                </strong>

                <p>
                    Passagers
                </p>

            </div>

        </div>


        <!-- =========================================
             CAMÉRAS
             ========================================= -->

        <div class="cameras">

            ${cam(
                1,
                "CAM-01",
                "Enregistrement"
            )}

            ${cam(
                2,
                "CAM-02",
                "Contrôle sûreté"
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


        <!-- =========================================
             ALERTES
             
             SOURCE FUTURE :
             /api/alerts
             ========================================= -->

        <div class="alerts">

            <h2>
                ALERTES EN COURS
            </h2>


            <div class="alert critical">

                ⚠

                <b>
                    CONTRÔLE SÛRETÉ
                </b>

                <h3>
                    Congestion critique
                </h3>

                <p>
                    Temps d'attente &gt; 20 min
                </p>

            </div>


            <div class="alert warning">

                ⚠

                <b>
                    CONTRÔLE SÛRETÉ
                </b>

                <h3>
                    Charge élevée
                </h3>

                <p>
                    Temps d'attente &gt; 15 min
                </p>

            </div>


            <div class="alert info">

                ●

                <b>
                    EMBARQUEMENT
                </b>

                <h3>
                    Affluence modérée
                </h3>

                <p>
                    Surveillance recommandée
                </p>

            </div>

        </div>

    </section>


    <!-- PRÉVISION -->

    <section class="bottom">

        ${forecast()}

    </section>


    <!-- RECOMMANDATION -->

    ${recommendation()}

    `;
}


/*
==========================================================
8. NAVIGATION
==========================================================
*/

function page(p) {

    if (p === "dashboard") {

        return dashboard();

    }


    if (p === "previsions") {

        return forecast();

    }


    return `

        <div class="page">

            <h2>
                ${titles[p]}
            </h2>

            <p>
                Cette page recevra ses données
                depuis le backend Python.
            </p>

        </div>

    `;
}


document
    .querySelectorAll("nav a")
    .forEach(a => {

        a.onclick = () => {

            document
                .querySelectorAll("nav a")
                .forEach(x => {

                    x.classList.remove("active");

                });


            a.classList.add("active");


            document
                .getElementById("pageTitle")
                .textContent =
                titles[a.dataset.page];


            document
                .getElementById("content")
                .innerHTML =
                page(a.dataset.page);

        };

    });


/*
==========================================================
9. CHOIX D'UNE CAMÉRA
==========================================================
*/

function chooseCamera(numero) {

    slot = numero;


    document
        .getElementById("cameraList")
        .innerHTML =


        cameras.map(camera => `

            <button
                class="camera-option"
                onclick="
                    assignCamera(
                        '${camera.id}',
                        '${camera.name}'
                    )
                ">

                🟢 ${camera.id}

                <small>
                    ${camera.name}
                </small>

            </button>

        `).join("");


    document
        .getElementById("cameraModal")
        .classList
        .remove("hidden");

}


function assignCamera(id, name) {

    document
        .getElementById("cam" + slot)
        .textContent =
        id + " - " + name;


    closeCamera();

}


function closeCamera() {

    document
        .getElementById("cameraModal")
        .classList
        .add("hidden");

}


/*
==========================================================
10. CAMÉRA EN MODE AGRANDI
==========================================================
*/

function expandCamera(numero) {

    document
        .getElementById("largeTitle")
        .textContent =

        document
            .getElementById("cam" + numero)
            .textContent;


    document
        .getElementById("videoModal")
        .classList
        .remove("hidden");

}


function closeVideo() {

    document
        .getElementById("videoModal")
        .classList
        .add("hidden");

}


/*
==========================================================
11. CONNEXION BACK-END : CAMÉRAS
==========================================================

PYTHON :

backend/cameras.py

FLASK :

GET /api/cameras

JAVASCRIPT :

fetch("/api/cameras")
==========================================================
*/

async function chargerCameras() {

    try {

        const response =
            await fetch("/api/cameras");


        if (!response.ok) {

            throw new Error(
                "API cameras indisponible"
            );

        }


        const data =
            await response.json();


        console.log(
            "Caméras reçues :",
            data
        );


        cameras = data;


    } catch (error) {

        console.error(
            "Erreur caméras :",
            error
        );

    }

}


/*
==========================================================
12. CONNEXION BACK-END : YOLO
==========================================================

GET /api/yolo

Données attendues :

{
    passengers: 142,
    queue: 37,
    waiting_time: 17
}
==========================================================
*/

async function chargerYOLO() {

    try {

        const response =
            await fetch("/api/yolo");


        if (!response.ok) {

            throw new Error(
                "API YOLO indisponible"
            );

        }


        const data =
            await response.json();


        console.log(
            "Données YOLO :",
            data
        );


        /*
        ==============================================
        ZONE RÉSERVÉE

        Ici, on affichera les résultats YOLO
        dans les indicateurs du tableau de bord.
        ==============================================
        */

    } catch (error) {

        console.error(
            "Erreur YOLO :",
            error
        );

    }

}


/*
==========================================================
13. CONNEXION BACK-END : FILES
==========================================================

GET /api/queues
==========================================================
*/

async function chargerFiles() {

    try {

        const response =
            await fetch("/api/queues");


        if (!response.ok) {

            throw new Error(
                "API files indisponible"
            );

        }


        const data =
            await response.json();


        console.log(
            "Files reçues :",
            data
        );


        /*
        ==============================================
        ZONE RÉSERVÉE

        Affichage des files et du temps d'attente.
        ==============================================
        */

    } catch (error) {

        console.error(
            "Erreur files :",
            error
        );

    }

}


/*
==========================================================
14. CONNEXION BACK-END : PRÉVISIONS
==========================================================

GET /api/forecast
==========================================================
*/

async function chargerPrevisions() {

    try {

        const response =
            await fetch("/api/forecast");


        if (!response.ok) {

            throw new Error(
                "API prévisions indisponible"
            );

        }


        const data =
            await response.json();


        console.log(
            "Prévisions reçues :",
            data
        );


        /*
        ==============================================
        ZONE RÉSERVÉE

        Les données Python remplaceront les
        valeurs actuelles de forecast().
        ==============================================
        */

    } catch (error) {

        console.error(
            "Erreur prévisions :",
            error
        );

    }

}


/*
==========================================================
15. CONNEXION BACK-END : ALERTES
==========================================================

GET /api/alerts
==========================================================
*/

async function chargerAlertes() {

    try {

        const response =
            await fetch("/api/alerts");


        if (!response.ok) {

            throw new Error(
                "API alertes indisponible"
            );

        }


        const data =
            await response.json();


        console.log(
            "Alertes reçues :",
            data
        );


        /*
        ==============================================
        ZONE RÉSERVÉE

        Les alertes Python seront affichées ici.
        ==============================================
        */

    } catch (error) {

        console.error(
            "Erreur alertes :",
            error
        );

    }

}


/*
==========================================================
16. CONNEXION BACK-END : DASHBOARD
==========================================================

GET /api/dashboard

Cette API pourra regrouper les principaux
indicateurs du système.
==========================================================
*/

async function chargerDashboard() {

    try {

        const response =
            await fetch("/api/dashboard");


        if (!response.ok) {

            throw new Error(
                "API dashboard indisponible"
            );

        }


        const data =
            await response.json();


        console.log(
            "Dashboard reçu :",
            data
        );


        /*
        ==============================================
        ZONE RÉSERVÉE

        Les données Python viendront mettre à jour :

        - nombre de passagers
        - temps d'attente
        - niveau de charge
        - total aéroport
        ==============================================
        */

    } catch (error) {

        console.error(
            "Erreur dashboard :",
            error
        );

    }

}


/*
==========================================================
17. ACTUALISATION DES DONNÉES
==========================================================

Toutes les 5 secondes, le Front-end demande
les nouvelles données au Back-end.

Quand Flask/Python sera prêt :

Python
  ↓
Flask
  ↓
API
  ↓
fetch()
  ↓
Interface actualisée
==========================================================
*/

async function actualiserDonnees() {

    await chargerCameras();

    await chargerYOLO();

    await chargerFiles();

    await chargerPrevisions();

    await chargerAlertes();

    await chargerDashboard();

}


/*
==========================================================
18. BOUTON "APPLIQUER" DE LA RECOMMANDATION
==========================================================
*/

function applyRecommendation() {

    alert(
        "Cette commande sera connectée au backend Python."
    );

    /*
    FUTURE API :

    POST /api/recommendation/apply

    Le superviseur pourra alors demander
    l'application d'une recommandation.
    */

}


/*
==========================================================
19. HORLOGE
==========================================================
*/

function clock() {

    const d = new Date();


    document
        .getElementById("time")
        .textContent =

        d.toLocaleTimeString("fr-FR");


    document
        .getElementById("dateText")
        .textContent =

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


/*
==========================================================
20. INITIALISATION
==========================================================
*/

document
    .getElementById("pageTitle")
    .textContent =
    titles.dashboard;


document
    .getElementById("content")
    .innerHTML =
    dashboard();


clock();


setInterval(
    clock,
    1000
);


/*
==========================================================
21. DÉMARRAGE DE LA CONNEXION PYTHON
==========================================================

Pour l'instant les API peuvent ne pas encore exister.

Lorsque Flask sera lancé, cette fonction récupérera
automatiquement les données Python.
==========================================================
*/
/*
actualiserDonnees();


/*
Actualisation des données toutes les 5 secondes.
*/
/*
setInterval(
    actualiserDonnees,
    5000
);


/*
==========================================================
                    FIN DU SCRIPT
==========================================================
*/