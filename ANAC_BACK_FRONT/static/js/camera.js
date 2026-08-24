// ============================================================
// CONFIGURATION DES CAMÉRAS
// ============================================================

// Pour le moment : 2 caméras
const cameraIds = [1, 2, 3, 4];
const dashboardMapping = {

    1: {
        countId: "dashboard-enregistrement",
        statusId: "dashboard-enregistrement-status",
        waitId: "dashboard-enregistrement-wait",
        arrivalId: "dashboard-enregistrement-arrival",
        throughputId: "dashboard-enregistrement-throughput",
        maxWaitId: "dashboard-enregistrement-max-wait",
        trendId: "dashboard-enregistrement-trend"
    },

    2: {
        countId: "dashboard-surete",
        statusId: "dashboard-surete-status",
        waitId: "dashboard-surete-wait",
        arrivalId: "dashboard-surete-arrival",
        throughputId: "dashboard-surete-throughput",
        maxWaitId: "dashboard-surete-max-wait",
        trendId: "dashboard-surete-trend"
    },

    3: {
        countId: "dashboard-embarquement",
        statusId: "dashboard-embarquement-status",
        waitId: "dashboard-embarquement-wait",
        arrivalId: "dashboard-embarquement-arrival",
        throughputId: "dashboard-embarquement-throughput",
        maxWaitId: "dashboard-embarquement-max-wait",
        trendId: "dashboard-embarquement-trend"
    },
    4: {
        countId: "dashboard-hall-depart",
        statusId: "dashboard-hall-depart-status",
        waitId: "dashboard-hall-depart-wait",
        arrivalId: "dashboard-hall-depart-arrival",
        throughputId: "dashboard-hall-depart-throughput",
        maxWaitId: "dashboard-hall-depart-max-wait",
        trendId: "dashboard-hall-depart-trend"
    }

};
const cameraNames = {
    1: "ENREGISTREMENT",
    2: "CONTRÔLE SÛRETÉ NORD",
    3: "EMBARQUEMENT",
    4: "HALL DÉPART"
};
const forecastConfiguration = {

    1: {
        name: "Enregistrement"
    },

    2: {
        name: "Contrôle sûreté"
    },

    3: {
        name: "Embarquement"
    },
    4: {
        name: "Hall départ"
    }   
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

            // Mettre à jour les prévisions contient également updaterecommandation()
            updateForecast(data);
            // Mettre à jour les indicateurs du tableau de bord
            updateDashboardIndicator(
                cameraId,
                data[cameraId]
            );

            // Mettre à jour Flux Page 
            updateFluxPage(data);
            // Mettre à jou la page file attente
            updateQueuePage(data);
            // Graphiques et indicateurs de la page Prévisions
            updateForecastPage(data);




            const cameraData =
                data[cameraId];

            if (!cameraData) {
                return;
            }

            // Mise à jour Donnée affichée dans la carte caméra
            personCount.textContent =
                cameraData.person_count ?? 0;

    

      

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

    // ==========================================
    // RÉCUPÉRATION DES ÉLÉMENTS HTML
    // ==========================================

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

    const arrivalElement =
        document.getElementById(
            config.arrivalId
        );

    const throughputElement =
        document.getElementById(
            config.throughputId
        );

    const maxWaitElement =
        document.getElementById(
            config.maxWaitId
        );

    const trendElement =
        document.getElementById(
            config.trendId
        );

    // Les trois éléments principaux sont obligatoires
    if (
        !countElement
        || !statusElement
        || !waitElement
    ) {
        return;
    }

    // ==========================================
    // RÉCUPÉRATION DES DONNÉES
    // ==========================================

    const personCount = Number(
        cameraData.person_count ?? 0
    );

    const waitingMinutes = Number(
        cameraData.waiting_time_minutes ?? 0
    );

    const arrivalRate = Number(
        cameraData.arrival_rate_per_min ?? 0
    );

    const throughputRate = Number(
        cameraData.throughput_rate_per_min ?? 0
    );

    const maximumWaitMinutes =
        Number(
            cameraData
                .maximum_active_wait_seconds
            ?? 0
        ) / 60;

    // ==========================================
    // AFFICHAGE DES DONNÉES
    // ==========================================

    countElement.textContent =
        personCount;

    waitElement.textContent =
        `${waitingMinutes.toFixed(1)} min`;

    if (arrivalElement) {
        arrivalElement.textContent =
            `${arrivalRate.toFixed(1)} pax/min`;
    }

    if (throughputElement) {
        throughputElement.textContent =
            `${throughputRate.toFixed(1)} pax/min`;
    }

    if (maxWaitElement) {
        maxWaitElement.textContent =
            `${maximumWaitMinutes.toFixed(1)} min`;
    }

    // ==========================================
    // TENDANCE DE LA FILE
    // ==========================================

    const flowDifference =
        arrivalRate - throughputRate;

    let trendText;
    let trendClass;

    if (flowDifference > 0.5) {

        trendText = "↗ En augmentation";
        trendClass = "trend-up";

    } else if (flowDifference < -0.5) {

        trendText = "↘ En diminution";
        trendClass = "trend-down";

    } else {

        trendText = "→ Stable";
        trendClass = "trend-stable";
    }

    if (trendElement) {

        trendElement.textContent =
            trendText;

        trendElement.classList.remove(
            "trend-up",
            "trend-down",
            "trend-stable"
        );

        trendElement.classList.add(
            trendClass
        );
    }

    // ==========================================
    // NIVEAU DE CONGESTION
    // ==========================================

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

    // ==========================================
    // COULEUR DE LA CARTE
    // ==========================================

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

// ============================================================
// PREDICTION DU NOMBRE DE PERSONNES DANS LA FILE
// ============================================================


function calculateForecast(
    personCount,
    arrivalRate,
    throughputRate,
    minutes
) {

    const netFlow =
        arrivalRate - throughputRate;

    const predictedCount =
        personCount
        + netFlow * minutes;

    return Math.max(
        0,
        Math.round(predictedCount)
    );
}

function calculateForecastRisk(
    cameraData,
    currentCount,
    predictedCount
) {

    const congestionLevel =
        cameraData.congestion_level
        || "FAIBLE";

    const growth =
        predictedCount - currentCount;

    if (
        congestionLevel === "CRITIQUE"
        || growth >= 20
    ) {
        return {
            level: "CRITIQUE",
            className: "risk-critical",
            priority: 4
        };
    }

    if (
        congestionLevel === "ELEVE"
        || growth >= 10
    ) {
        return {
            level: "ÉLEVÉ",
            className: "risk-high",
            priority: 3
        };
    }

    if (
        congestionLevel === "MODERE"
        || growth >= 5
    ) {
        return {
            level: "MODÉRÉ",
            className: "risk-moderate",
            priority: 2
        };
    }

    return {
        level: "FAIBLE",
        className: "risk-low",
        priority: 1
    };
}

function updateForecast(data) {

    const forecasts = [];

    for (
        const [cameraId, config]
        of Object.entries(forecastConfiguration)
    ) {

        const cameraData =
            data[cameraId];

        if (!cameraData) {
            continue;
        }

        const personCount = Number(
            cameraData.person_count ?? 0
        );

        const arrivalRate = Number(
            cameraData.arrival_rate_per_min ?? 0
        );

        const throughputRate = Number(
            cameraData.throughput_rate_per_min ?? 0
        );

        const forecast15 =
            calculateForecast(
                personCount,
                arrivalRate,
                throughputRate,
                15
            );

        const forecast30 =
            calculateForecast(
                personCount,
                arrivalRate,
                throughputRate,
                30
            );

        const risk =
            calculateForecastRisk(
                cameraData,
                personCount,
                forecast30
            );

        const currentElement =
            document.getElementById(
                `forecast-current-${cameraId}`
            );

        const forecast15Element =
            document.getElementById(
                `forecast-15-${cameraId}`
            );

        const forecast30Element =
            document.getElementById(
                `forecast-30-${cameraId}`
            );

        const riskElement =
            document.getElementById(
                `forecast-risk-${cameraId}`
            );

        if (currentElement) {
            currentElement.textContent =
                personCount;
        }

        if (forecast15Element) {
            forecast15Element.textContent =
                forecast15;
        }

        if (forecast30Element) {
            forecast30Element.textContent =
                forecast30;
        }

        if (riskElement) {

            riskElement.textContent =
                risk.level;

            riskElement.classList.remove(
                "risk-low",
                "risk-moderate",
                "risk-high",
                "risk-critical"
            );

            riskElement.classList.add(
                risk.className
            );
        }

        forecasts.push({

            cameraId:
                Number(cameraId),

            zoneName:
                config.name,

            currentCount:
                personCount,

            forecast15:
                forecast15,

            forecast30:
                forecast30,

            arrivalRate:
                arrivalRate,

            throughputRate:
                throughputRate,

            waitingMinutes:
                Number(
                    cameraData.waiting_time_minutes
                    ?? 0
                ),

            risk:
                risk

        });
    }

    updateRecommendation(forecasts);
}
// ============================================================
// RECOMMANDATION D'ACTION
// ============================================================


function updateRecommendation(forecasts) {

    const panel =
        document.getElementById(
            "recommendation-panel"
        );

    const messageElement =
        document.getElementById(
            "recommendation-message"
        );

    const detailsElement =
        document.getElementById(
            "recommendation-details"
        );

    const applyButton =
        document.getElementById(
            "recommendation-apply"
        );

    if (
        !panel
        || !messageElement
        || !detailsElement
        || !applyButton
    ) {
        return;
    }

    if (forecasts.length === 0) {

        messageElement.textContent =
            "Données insuffisantes";

        detailsElement.textContent =
            "Aucune donnée de caméra disponible.";

        applyButton.disabled = true;

        return;
    }

    const sortedForecasts =
        [...forecasts].sort(
            function(first, second) {

                if (
                    second.risk.priority
                    !== first.risk.priority
                ) {
                    return (
                        second.risk.priority
                        - first.risk.priority
                    );
                }

                return (
                    second.forecast30
                    - first.forecast30
                );
            }
        );

    const worstZone =
        sortedForecasts[0];

    panel.classList.remove(
        "recommendation-low",
        "recommendation-moderate",
        "recommendation-high",
        "recommendation-critical"
    );

    if (worstZone.risk.level === "CRITIQUE") {

        panel.classList.add(
            "recommendation-critical"
        );

        messageElement.textContent =
            `Ouvrir immédiatement un poste supplémentaire à ${worstZone.zoneName}`;

        detailsElement.textContent =
            `${worstZone.currentCount} personnes actuellement, `
            + `${worstZone.forecast30} prévues dans 30 minutes. `
            + `Arrivées : ${worstZone.arrivalRate.toFixed(1)} pax/min, `
            + `sorties : ${worstZone.throughputRate.toFixed(1)} pax/min.`;

        applyButton.disabled = false;

    } else if (worstZone.risk.level === "ÉLEVÉ") {

        panel.classList.add(
            "recommendation-high"
        );

        messageElement.textContent =
            `Préparer l’ouverture d’un poste à ${worstZone.zoneName}`;

        detailsElement.textContent =
            `La file pourrait atteindre `
            + `${worstZone.forecast30} personnes dans 30 minutes.`;

        applyButton.disabled = false;

    } else if (worstZone.risk.level === "MODÉRÉ") {

        panel.classList.add(
            "recommendation-moderate"
        );

        messageElement.textContent =
            `Surveiller l’évolution à ${worstZone.zoneName}`;

        detailsElement.textContent =
            `Projection à 15 minutes : `
            + `${worstZone.forecast15} personnes. `
            + `Projection à 30 minutes : `
            + `${worstZone.forecast30} personnes.`;

        applyButton.disabled = true;

    } else {

        panel.classList.add(
            "recommendation-low"
        );

        messageElement.textContent =
            "Aucune action immédiate nécessaire";

        detailsElement.textContent =
            "Les flux observés sont actuellement maîtrisés.";

        applyButton.disabled = true;
    }
}