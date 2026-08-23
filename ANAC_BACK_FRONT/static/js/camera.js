// ============================================================
// CONFIGURATION DES CAMÉRAS
// ============================================================

// Pour le moment : 2 caméras
const cameraNames = {
    1: "ENREGISTREMENT",
    2: "CONTRÔLE SÛRETÉ NORD",
    3: "EMBARQUEMENT",
    4: "HALL DÉPART"
};
const cameraIds = [1, 2, 3, 4];
const dashboardMapping = {

    1: {
        countId: "dashboard-enregistrement",
        statusId: "dashboard-enregistrement-status",
        waitId: "dashboard-enregistrement-wait"
    },

    2: {
        countId: "dashboard-surete",
        statusId: "dashboard-surete-status",
        waitId: "dashboard-surete-wait"
    },

    3: {
        countId: "dashboard-embarquement",
        statusId: "dashboard-embarquement-status",
        waitId: "dashboard-embarquement-wait"
    },
    4: {countId: "dashboard-hall-depart", statusId: "dashboard-hall-depart-status", waitId: "dashboard-hall-depart-wait"}

};


// ============================================================
// CONFIGURATION D'UNE CAMÉRA
// ============================================================

function setupCamera(cameraId) {

    // --------------------------------------------------------
    // Récupérer les éléments HTML
    // --------------------------------------------------------

    const canvas = document.getElementById(
        `canvas-${cameraId}`
    );

    if (!canvas) {
        console.error(`Canvas canvas-${cameraId} introuvable.`);
        return;
    }

    const ctx = canvas.getContext("2d");


    const count = document.getElementById(
        `count-${cameraId}`
    );


    const validateButton = document.getElementById(
        `validate-${cameraId}`
    );


    const clearButton = document.getElementById(
        `clear-${cameraId}`
    );


    const result = document.getElementById(
        `result-${cameraId}`
    );


    const personCount = document.getElementById(
        `person-count-${cameraId}`
    );


    // --------------------------------------------------------
    // Liste des points du polygone
    // --------------------------------------------------------

    let points = [];


    // ========================================================
    // CLIC SUR LE CANVAS
    // ========================================================

    canvas.addEventListener(
        "click",
        function(event) {

            const rect =
                canvas.getBoundingClientRect();


            // ----------------------------------------------
            // Coordonnées dans le canvas
            // ----------------------------------------------

            const x =
                (event.clientX - rect.left)
                *
                (canvas.width / rect.width);


            const y =
                (event.clientY - rect.top)
                *
                (canvas.height / rect.height);


            // ----------------------------------------------
            // Ajouter le point
            // ----------------------------------------------

            points.push({

                x: x,
                y: y

            });


            console.log(

                `Caméra ${cameraId} - Point ajouté :`,

                x,
                y

            );


            // ----------------------------------------------
            // Mettre à jour compteur
            // ----------------------------------------------

            count.textContent =
                points.length;


            // ----------------------------------------------
            // Redessiner
            // ----------------------------------------------

            draw();

        }
    );


    // ========================================================
    // DESSIN DU POLYGONE
    // ========================================================

    function draw() {

        // ----------------------------------------------
        // Effacer canvas
        // ----------------------------------------------

        ctx.clearRect(

            0,
            0,

            canvas.width,
            canvas.height

        );


        // ----------------------------------------------
        // Aucun point
        // ----------------------------------------------

        if (points.length === 0) {

            return;

        }


        // ==============================================
        // LIGNES
        // ==============================================

        ctx.beginPath();


        ctx.moveTo(

            points[0].x,
            points[0].y

        );


        for (

            let i = 1;

            i < points.length;

            i++

        ) {

            ctx.lineTo(

                points[i].x,
                points[i].y

            );

        }


        // ----------------------------------------------
        // Fermer le polygone
        // ----------------------------------------------

        if (points.length >= 3) {

            ctx.closePath();

        }


        // ==============================================
        // REMPLISSAGE
        // ==============================================

        if (points.length >= 3) {

            ctx.fillStyle =
                "rgba(255, 0, 0, 0.25)";


            ctx.fill();

        }


        // ==============================================
        // CONTOUR
        // ==============================================

        ctx.strokeStyle =
            "red";


        ctx.lineWidth =
            4;


        ctx.stroke();


        // ==============================================
        // POINTS
        // ==============================================

        for (

            let i = 0;

            i < points.length;

            i++

        ) {

            const point =
                points[i];


            ctx.beginPath();


            ctx.arc(

                point.x,
                point.y,

                7,

                0,
                Math.PI * 2

            );


            // Point

            ctx.fillStyle =
                "yellow";


            ctx.fill();


            // Contour du point

            ctx.strokeStyle =
                "black";


            ctx.lineWidth =
                2;


            ctx.stroke();


            // ------------------------------------------
            // Numéro du point
            // ------------------------------------------

            ctx.fillStyle =
                "black";


            ctx.font =
                "bold 16px Arial";


            ctx.fillText(

                i + 1,

                point.x + 10,

                point.y - 10

            );

        }

    }


    // ========================================================
    // VALIDER LA ZONE
    // ========================================================

    validateButton.addEventListener(

        "click",

        async function() {

            // ------------------------------------------
            // Vérifier le nombre de points
            // ------------------------------------------

            if (points.length < 3) {

                alert(
                    "Il faut au moins 3 points."
                );

                return;

            }


            // ------------------------------------------
            // Transformer les points
            // ------------------------------------------

            const region =
                points.map(

                    function(point) {

                        return [

                            Math.round(point.x),

                            Math.round(point.y)

                        ];

                    }

                );


            console.log(

                `Caméra ${cameraId} - Région envoyée :`,

                region

            );


            // ==========================================
            // ENVOYER À FASTAPI
            // ==========================================

            try {

                const response =
                    await fetch(

                        `/set-region/${cameraId}`,

                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    region:
                                        region

                                })

                        }

                    );


                const data =
                    await response.json();


                // --------------------------------------
                // Message
                // --------------------------------------

                result.textContent =
                    data.message;


                console.log(

                    `Caméra ${cameraId} - Réponse serveur :`,

                    data

                );

            }

            catch (error) {

                console.error(

                    `Erreur caméra ${cameraId} :`,

                    error

                );


                result.textContent =
                    "Erreur lors de l'envoi.";

            }

        }

    );


    // ========================================================
    // EFFACER LA ZONE
    // ========================================================

    clearButton.addEventListener(

        "click",

        function() {

            // ------------------------------------------
            // Supprimer les points
            // ------------------------------------------

            points = [];


            // ------------------------------------------
            // Effacer canvas
            // ------------------------------------------

            ctx.clearRect(

                0,
                0,

                canvas.width,
                canvas.height

            );


            // ------------------------------------------
            // Compteur
            // ------------------------------------------

            count.textContent =
                "0";


            // ------------------------------------------
            // Message
            // ------------------------------------------

            result.textContent =
                "";


            console.log(

                `Caméra ${cameraId} - Zone supprimée`

            );

        }

    );


    // ========================================================
    // MISE À JOUR DU NOMBRE DE PERSONNES
    // ========================================================

    async function updateData() {

        try {

            const response =
                await fetch("/data");

            if (!response.ok) {
                throw new Error(
                    `Erreur HTTP ${response.status}`
                );
            }

            const data =
                await response.json();

            // Mettre à jour les alertes

            updateAlerts(data);

            const cameraData =
                data[cameraId];

            if (!cameraData) {
                return;
            }

            // Donnée affichée dans la carte caméra
            personCount.textContent =
                cameraData.person_count ?? 0;

            // Données affichées dans les indicateurs
            updateDashboardIndicator(
                cameraId,
                cameraData
            );

      

        } catch (error) {

            console.error(
                `Erreur données caméra ${cameraId} :`,
                error
            );
        }
    }


    // Mise à jour toutes les 500 ms

    setInterval(

        updateData,

        500

    );

}


// ============================================================
// INITIALISATION DES CAMÉRAS
// ============================================================


function initializeCameras() {
    document
        .querySelectorAll("canvas[id^='canvas-']")
        .forEach(canvas => {
            if (canvas.dataset.initialized === "true") {
                return;
            }

            canvas.dataset.initialized = "true";

            const cameraId = Number(
                canvas.id.replace("canvas-", "")
            );

            setupCamera(cameraId);
        });
}


// ============================================================
// MISE À JOUR DES INDICATEURS DU TABLEAU DE BORD
// ============================================================


function updateDashboardIndicator(
    cameraId,
    cameraData
) {

    const config =
        dashboardMapping[cameraId];

    // Cette caméra ne possède pas de carte
    if (!config) {
        return;
    }

    const countElement =
        document.getElementById(
            config.countId
        );

    const statusElement =
        document.getElementById(
            config.statusId
        );

    const waitElement =
        document.getElementById(
            config.waitId
        );

    if (
        !countElement
        || !statusElement
        || !waitElement
    ) {
        return;
    }

    // ------------------------------------------
    // NOMBRE DE PERSONNES
    // ------------------------------------------

    countElement.textContent =
        cameraData.person_count ?? 0;

    // ------------------------------------------
    // TEMPS D’ATTENTE
    // ------------------------------------------

    const waitingMinutes = Number(
        cameraData.waiting_time_minutes ?? 0
    );

    waitElement.textContent =
        `${waitingMinutes.toFixed(1)} min`;

    // ------------------------------------------
    // NIVEAU DE CONGESTION
    // ------------------------------------------

    const congestionLevel =
        cameraData.congestion_level
        || "FAIBLE";

    const levelConfiguration = {

        FAIBLE: {
            text: "FAIBLE",
            className: "green"
        },

        MODERE: {
            text: "MODÉRÉ",
            className: "orange"
        },

        ELEVE: {
            text: "ÉLEVÉ",
            className: "orange"
        },

        CRITIQUE: {
            text: "CRITIQUE",
            className: "critical"
        }

    };

    const level =
        levelConfiguration[congestionLevel]
        || levelConfiguration.FAIBLE;

    statusElement.textContent =
        level.text;

    // Carte contenant l’indicateur
    const indicator =
        countElement.closest(".indicator");

    if (indicator) {

        indicator.classList.remove(
            "green",
            "orange",
            "critical"
        );

        indicator.classList.add(
            level.className
        );
    }
}


// ============================================================
// MISE À JOUR DES ALERTES
// ============================================================


let lastAlertsSignature = "";


function updateAlerts(data) {

    const alertsContainer =
        document.getElementById(
            "alerts-list"
        );

    if (!alertsContainer) {
        return;
    }

    const levelConfiguration = {

        CRITIQUE: {
            priority: 3,
            className: "critical",
            icon: "⚠",
            title: "Congestion critique",
            recommendation:
                "Intervention immédiate recommandée"
        },

        ELEVE: {
            priority: 2,
            className: "warning",
            icon: "⚠",
            title: "Charge élevée",
            recommendation:
                "Renforcement des ressources recommandé"
        },

        MODERE: {
            priority: 1,
            className: "info",
            icon: "●",
            title: "Affluence modérée",
            recommendation:
                "Surveillance recommandée"
        }

    };

    const activeAlerts = [];

    for (
        const [cameraId, cameraData]
        of Object.entries(data)
    ) {

        const congestionLevel =
            cameraData.congestion_level
            || "FAIBLE";

        const configuration =
            levelConfiguration[
                congestionLevel
            ];

        // Pas d’alerte pour le niveau FAIBLE
        if (!configuration) {
            continue;
        }

        activeAlerts.push({
            cameraId: cameraId,

            zone:
                cameraNames[cameraId]
                || `CAMÉRA ${cameraId}`,

            count:
                Number(
                    cameraData.person_count ?? 0
                ),

            waitingMinutes:
                Number(
                    cameraData
                        .waiting_time_minutes
                    ?? 0
                ),

            congestionLevel:
                congestionLevel,

            ...configuration
        });
    }

    // Alertes les plus graves en premier
    activeAlerts.sort(
        function (alertA, alertB) {

            return (
                alertB.priority
                - alertA.priority
            );
        }
    );

    // Limiter à trois alertes affichées
    const displayedAlerts =
        activeAlerts.slice(0, 3);

    // Éviter de reconstruire inutilement le HTML
    const signature = JSON.stringify(
        displayedAlerts.map(
            function (alert) {

                return {
                    cameraId: alert.cameraId,
                    level: alert.congestionLevel,
                    count: alert.count,
                    waiting:
                        alert.waitingMinutes.toFixed(1)
                };
            }
        )
    );

    if (signature === lastAlertsSignature) {
        return;
    }

    lastAlertsSignature = signature;

    alertsContainer.replaceChildren();

    // ------------------------------------------
    // AUCUNE ALERTE
    // ------------------------------------------

    if (displayedAlerts.length === 0) {

        const emptyMessage =
            document.createElement("div");

        emptyMessage.className =
            "alert-empty";

        emptyMessage.textContent =
            "✓ Aucune alerte en cours";

        alertsContainer.appendChild(
            emptyMessage
        );

        return;
    }

    // ------------------------------------------
    // CRÉATION DES ALERTES
    // ------------------------------------------

    displayedAlerts.forEach(
        function (alertData) {

            const alertElement =
                document.createElement("div");

            alertElement.className =
                `alert ${alertData.className}`;

            const header =
                document.createElement("div");

            header.className =
                "alert-header";

            const icon =
                document.createElement("span");

            icon.className =
                "alert-icon";

            icon.textContent =
                alertData.icon;

            const zone =
                document.createElement("b");

            zone.textContent =
                alertData.zone;

            header.append(
                icon,
                zone
            );

            const title =
                document.createElement("h3");

            title.textContent =
                alertData.title;

            const details =
                document.createElement("p");

            details.textContent =
                `${alertData.count} personnes · `
                + `${alertData.waitingMinutes.toFixed(1)} min d’attente`;

            const recommendation =
                document.createElement("small");

            recommendation.textContent =
                alertData.recommendation;

            alertElement.append(
                header,
                title,
                details,
                recommendation
            );

            alertsContainer.appendChild(
                alertElement
            );
        }
    );
}
