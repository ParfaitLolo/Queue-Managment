// ============================================================
// CONFIGURATION DES CAMÉRAS
// ============================================================

// Pour le moment : 2 caméras
const cameraIds = [1, 2];


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


            const data =
                await response.json();


            // ------------------------------------------
            // Récupérer les données de cette caméra
            // ------------------------------------------

            const cameraData =
                data[cameraId];


            if (!cameraData) {

                return;

            }


            // ------------------------------------------
            // Afficher le nombre de personnes
            // ------------------------------------------

            personCount.textContent =
                cameraData.person_count;


        }

        catch (error) {

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

cameraIds.forEach(

    function(cameraId) {

        setupCamera(cameraId);

    }

);