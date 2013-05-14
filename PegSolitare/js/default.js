// Peg Solitaire
// Mickey MacDonald & Ryan Nahle 2013
(function ()
{
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    var canvas; //Will be linked to the canvas in our default.html page
    var stage; //Is the equivalent of stage in AS3; we'll add "children" to it
    var context; 

    // Game States 
    var gameStates =
    {
        "Start" : 1,
        "Playing" : 2,
        "GameOver": 3,
        "Paused": 4,
    };

    var currentGameState; // Keeps track of our current game state
    
    // Graphics //
    var backgroundImage, backgroundBitmap; //The background graphic
    var playerImage, playerBitmap; //The player paddle graphic
    var ballImage, ballBitmap; //The ball graphic
    var cpuImage, cpuBitmap; //The CPU paddle
    var winImage, winBitmap; //The winning popup
    var loseImage, loseBitmap; //The losing popup
    var pausedImage, pausedBitmap; //The Image we show when paused

    // Variables //
    var title; //The games title
    var playerScore; //The main player score
    var cpuScore; //The CPU score
    var cpuSpeed = 4; //The speed of the CPU paddle; the faster it is the harder the game is
    var xSpeed = 6; //Used for the ball 
    var ySpeed = 6; //Used for the ball and the player paddle
    var winScore = '10'; //When the player or cpu hit this score the game is over

    //Calculate display scale factor
    var SCALE_X = 4;
    var SCALE_Y = 4;
    var MARGIN = 25; //Inset from edge of screen
    

    // Variables
    var BOXWIDTH = 30;
    var BOARDER = 2;
    var SQUARE_COLOUR = "#ff0000";
    var SQUARE_SEL_COLOUR = "#0000ff";
    var PEG_COLOUR = "#ffff0f";

    var red = true;
    var selectedX = -1;
    var selectedY = -1;
    var pegCount = 0;

    // Preloader 
    var preload;
    var manifest;

    //SoundJS
    var soundManifest;
    

    app.onactivated = function (args)
    {
        if (args.detail.kind === activation.ActivationKind.launch)
        {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated)
            {
                // TODO: This application has been newly launched. Initialize
                // your application here.
                initialize();
            }
            else
            {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }
            args.setPromise(WinJS.UI.processAll());
        }
    };

    


    function initialize()
    {
        canvas = document.getElementById("gameCanvas"); // link our canvas to the one in default.html

        context = gameCanvas.getContext("2d");

        canvas.width = window.innerWidth; // Set the canvas width
        canvas.height = window.innerHeight; // Set the canvas height

        stage = new createjs.Stage(canvas); // This creates our stage on the canvas
        
        // Use PreloadJS to make sure sound & images are loaded
        // before we begin using them this is especially
        // important for large or remote resources
        preload = new createjs.LoadQueue();
        preload.installPlugin(createjs.Sound)

        preload.loadManifest([
                            //Images 
                            { src: "Assets/pause.png", id: "paused" },
                            { src: "Assets/bg.png", id: "bg" },
                            { src: "Assets/paddle.png", id: "cpu" },
                            { src: "Assets/paddle.png", id: "player" },
                            { src: "Assets/ball.png", id: "ball" },
                            { src: "Assets/win.png", id: "win" },
                            { src: "Assets/lose.png", id: "lose" },
                            //Sounds
                            { src: "Assets/playerScore.mp3", id: "playerScore" },
                            { src: "Assets/enemyScore.mp3", id: "enemyScore" },
                            { src: "Assets/hit.mp3", id: "hit" },
                            { src: "Assets/wall.mp3", id: "wall" }
        ]);
        preload.addEventListener("complete", prepareGame);
        
        //prepareGame();

        //Add our listener to check for state changes in the view, like snap view
        window.addEventListener("resize", onViewStateChanged);

        //window.addEventListener("click", GetInput);
    }


    // This function will setup our game
    // This is where we assign our varibles and add objects to the stage
    function prepareGame()
    {

        // Set the current state to 'Start'
        currentGameState = gameStates.Start;
        
        startGame(); // Run our startGame function
    }

    function findPos(obj) {
        var curleft = 0, curtop = 0;
        if (obj.offsetParent) {
            do {
                curleft += obj.offsetLeft;
                curtop += obj.offsetTop;
            } while (obj = obj.offsetParent);
            return { x: curleft, y: curtop };
        }
        return undefined;
    }
    

    function startGame()
    {
        createjs.Ticker.setFPS(60); // Set the tick rate of our update timer
        createjs.Ticker.addListener(gameLoop); // Add a listener to call our gameloop on every tick
    }

    // Our gameloop, I have broke it into two parts. This is to make it a little easier to read and understand.
    function gameLoop()
    {
        update();
        draw();
    }


    // The update, this is where our game logic lives
    function update()
    {

        // Our game state switch
        switch (currentGameState)
        {

            // The code below is ran while the game is in the 'Start' state
            case gameStates.Start: 

                //stage.onClick = null; //This nulls any click input

                // Check for a touch or click
                currentGameState = gameStates.Playing; // Switch states to playing
                break;

                // The code below is ran while the game is in the 'Playing' state
            case gameStates.Playing:
                display("clear"); //Clear any overlays on screen
                playGame();  // Moved the game play logic code to keep the update easy to read
                break;

                // The code below is ran while the game is in the 'Game Over' state
            case gameStates.GameOver:
                // Check for a touch or click
                stage.onClick = function ()
                {
                    // Clear the scores if any exist
                    playerScore.text = 0;
                    cpuScore.text = 0;
                    display('clear'); // This will clear all the overlays
                    reset();
                    currentGameState = gameStates.Start; // Switch states to start
                }
                break;
            case gameStates.Paused:
                display("paused"); //Display the paused overlay
                break;

                
        }        
    }

    // Our draw function
    function draw()
    {
        // Diamond Board
        canvas.width = 9 * BOXWIDTH;

        drawSquare(4, 0, SQUARE_COLOUR);
        drawDot(4, 0, PEG_COLOUR);
        for (var i = 0; i < 3; i++) {
            drawSquare(3 + i, 1, SQUARE_COLOUR);
            drawDot(3 + i, 1, PEG_COLOUR);
        }
        for (var i = 0; i < 5; i++) {
            drawSquare(2 + i, 2, SQUARE_COLOUR);
            drawDot(2 + i, 2, PEG_COLOUR);
        }
        for (var i = 0; i < 7; i++) {
            drawSquare(1 + i, 3, SQUARE_COLOUR);
            drawDot(1 + i, 3, PEG_COLOUR);
        }
        for (var i = 0; i < 9; i++) {
            drawSquare(0 + i, 4, SQUARE_COLOUR);
            if (i != 4)
                drawDot(0 + i, 4, PEG_COLOUR);
        }
        for (var i = 0; i < 7; i++) {
            drawSquare(1 + i, 5, SQUARE_COLOUR);
            drawDot(1 + i, 5, PEG_COLOUR);
        }
        for (var i = 0; i < 5; i++) {
            drawSquare(2 + i, 6, SQUARE_COLOUR);
            drawDot(2 + i, 6, PEG_COLOUR);
        }
        for (var i = 0; i < 3; i++) {
            drawSquare(3 + i, 7, SQUARE_COLOUR);
            drawDot(3 + i, 7, PEG_COLOUR);
        }
        drawSquare(4, 8, SQUARE_COLOUR);
        drawDot(4, 8, PEG_COLOUR);
        pegCount = 40;

        //stage.update();
    }


    // The gameplay logic, moved to its own function to make it easier to read
    function playGame()
    {
        stage.onMouseDown = GetInput;
      /*  {
            var pos = findPos(canvas);
            var c = context;

            var x = e.pageX - pos.x;
            var y = e.pageY - pos.y;
            var coord = "x=" + x + ", y=" + y;

            var xStart = Math.floor((e.pageX - pos.x) / BOXWIDTH);
            var yStart = Math.floor((e.pageY - pos.y) / BOXWIDTH);
            var coord_rnd = "x=" + xStart + ", y=" + yStart;

            var p = c.getImageData(xStart * BOXWIDTH + BOXWIDTH / 2, yStart * BOXWIDTH + BOXWIDTH / 2, 1, 1).data;
            var pB = c.getImageData(xStart * BOXWIDTH + BOARDER, yStart * BOXWIDTH + BOARDER, 1, 1).data;

            var hexPeg = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
            var hexBorder = "#" + ("000000" + rgbToHex(pB[0], pB[1], pB[2])).slice(-6);

            var peg;
            if (hexPeg == PEG_COLOUR) {
                peg = true;
            }
            else {
                peg = false;
            }

            // square is selected, unselect it
            if (hexBorder == SQUARE_SEL_COLOUR) {
                selectedX = -1;
                selectedY = -1;
                drawSquare(xStart, yStart, SQUARE_COLOUR);
                if (peg) {
                    drawDot(xStart, yStart, PEG_COLOUR);
                }

                // square is unselected
            }
            else if (hexBorder == SQUARE_COLOUR) {

                // no others selected so select
                if (selectedX == -1 && selectedY == -1) {
                    // check we have a peg to move
                    var srcPeg = hasPeg(xStart, yStart, c);
                    if (!srcPeg) {
                        return;
                    }
                    selectedX = xStart;
                    selectedY = yStart;
                    drawSquare(xStart, yStart, SQUARE_SEL_COLOUR);
                    if (peg) {
                        drawDot(xStart, yStart, PEG_COLOUR);
                    }

                    // other square selected - try move
                }
                else {
                    var xDiff = xStart - selectedX;
                    var yDiff = yStart - selectedY;

                    // check we can go there
                    if (xDiff > 2 || xDiff < -2 || yDiff > 2 || yDiff < -2) {
                        return;
                    }
                    if (xDiff != 0 && yDiff != 0) {
                        return;
                    }

                    // do move!
                    var destPeg = hasPeg(xStart, yStart, c);
                    if (!destPeg) {
                        // jumped peg
                        var xOff = 0;
                        var yOff = 0;

                        if (xStart - selectedX > 0) {
                            xOff = 1;
                        }
                        else if (xStart - selectedX < 0) {
                            xOff = -1;
                        }
                        else {
                            xOff = 0;
                            if (yStart - selectedY > 0) {
                                yOff = 1;
                            }
                            else if (yStart - selectedY < 0) {
                                yOff = -1;
                            }
                            else {
                                return;
                            }
                        }

                        // check we have a peg to jump
                        var midPeg = hasPeg(selectedX + xOff, selectedY + yOff, c);
                        if (!midPeg) {
                            return;
                        }

                        // jumped peg
                        drawSquare(selectedX + xOff, selectedY + yOff, SQUARE_COLOUR);
                        // peg dest
                        drawDot(xStart, yStart, PEG_COLOUR);
                        // peg src
                        drawSquare(selectedX, selectedY, SQUARE_COLOUR);

                        pegCount--;
                        selectedX = -1;
                        selectedY = -1;
                    }
                }
            }

            // Check if they have won
            if (pegCount == 1) {
                // $('#win').html("YOU WIN!");
                //init();
            }
        }*/
    }

    function movePaddle(e)
    {
        // Player Movement
        playerBitmap.y = e.stageY; 
    }

    // Reset, this will set the paddle and ball to their starting place
    function reset()
    {
        
        stage.onMouseMove = null; // Clears movement input

        playerBitmap.x = MARGIN + ((playerImage.width * SCALE_X) * 0.25);
        playerBitmap.y = (canvas.height * 0.5) - (playerImage.height);

        cpuBitmap.x = (canvas.width - MARGIN) - (cpuImage.width * SCALE_X);
        cpuBitmap.y = (canvas.height * 0.5) - (cpuImage.height);

        ballBitmap.x = (canvas.width * 0.5) - ((ballImage.width * 0.5) * SCALE_X); 
        ballBitmap.y = (canvas.height * 0.5) - ((ballImage.height * 0.5) * SCALE_Y); 
    }

    // This will draw the squares
    function drawSquare(x, y, colour)
    {
        context.fillStyle = "rgb(0,0,0)";
        context.fillRect(x * BOXWIDTH, y * BOXWIDTH, BOXWIDTH, BOXWIDTH);
        context.fillStyle = colour;
        context.fillRect(x * BOXWIDTH + BOARDER, y * BOXWIDTH + BOARDER, BOXWIDTH - 2 * BOARDER, BOXWIDTH - 2 * BOARDER);
    }

    // This will draw the dots or pegs
    function drawDot(x, y, colour)
    {
        context.fillStyle = colour;
        context.beginPath();
        context.arc(x * BOXWIDTH + (BOXWIDTH / 2), y * BOXWIDTH + (BOXWIDTH / 2), BOXWIDTH * 0.4, 0, Math.PI * 2, true);
        context.closePath();
        context.fill();
    }

    // This will check if the square has a peg in it
    function hasPeg(x, y, c)
    {
        var p = c.getImageData(x * BOXWIDTH + BOXWIDTH / 2, y * BOXWIDTH + BOXWIDTH / 2, 1, 1).data;
        var hexPeg = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);

        if (hexPeg == PEG_COLOUR)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    // This will check if a peg has been selected
    function isSelected(x, y, c)
    {
        var pB = c.getImageData(x * BOXWIDTH + BOARDER, y * BOXWIDTH + BOARDER, 1, 1).data;
        var hexBorder = "#" + ("000000" + rgbToHex(pB[0], pB[1], pB[2])).slice(-6);

        if (hexBorder == SQUARE_SEL_COLOUR)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    
    function GetInput(e)
    {

        var pos = findPos(canvas);
        var c = context;

        var x = e.pageX - pos.x;
        var y = e.pageY - pos.y;
        var coord = "x=" + x + ", y=" + y;

        var xStart = Math.floor((e.pageX - pos.x) / BOXWIDTH);
        var yStart = Math.floor((e.pageY - pos.y) / BOXWIDTH);
        var coord_rnd = "x=" + xStart + ", y=" + yStart;

        var p = c.getImageData(xStart * BOXWIDTH + BOXWIDTH / 2, yStart * BOXWIDTH + BOXWIDTH / 2, 1, 1).data;
        var pB = c.getImageData(xStart * BOXWIDTH + BOARDER, yStart * BOXWIDTH + BOARDER, 1, 1).data;

        var hexPeg = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
        var hexBorder = "#" + ("000000" + rgbToHex(pB[0], pB[1], pB[2])).slice(-6);

        var peg;
        if (hexPeg == PEG_COLOUR)
        {
            peg = true;
        }
        else
        {
            peg = false;
        }

        /* square is selected, unselect it */
        if (hexBorder == SQUARE_SEL_COLOUR)
        {
            selectedX = -1;
            selectedY = -1;
            drawSquare(xStart, yStart, SQUARE_COLOUR);
            if (peg)
            {
                drawDot(xStart, yStart, PEG_COLOUR);
            }

            /* square is unselected */
        }
        else if (hexBorder == SQUARE_COLOUR)
        {

            /* no others selected so select */
            if (selectedX == -1 && selectedY == -1)
            {
                /* check we have a peg to move */
                var srcPeg = hasPeg(xStart, yStart, c);
                if (!srcPeg)
                {
                    return;
                }
                selectedX = xStart;
                selectedY = yStart;
                drawSquare(xStart, yStart, SQUARE_SEL_COLOUR);
                if (peg)
                {
                    drawDot(xStart, yStart, PEG_COLOUR);
                }

                /* other square selected - try move */
            }
            else
            {
                var xDiff = xStart - selectedX;
                var yDiff = yStart - selectedY;

                /* check we can go there */
                if (xDiff > 2 || xDiff < -2 || yDiff > 2 || yDiff < -2)
                {
                    return;
                }
                if (xDiff != 0 && yDiff != 0)
                {
                    return;
                }

                /* do move! */
                var destPeg = hasPeg(xStart, yStart, c);
                if (!destPeg)
                {
                    // jumped peg
                    var xOff = 0;
                    var yOff = 0;

                    if (xStart - selectedX > 0)
                    {
                        xOff = 1;
                    }
                    else if (xStart - selectedX < 0)
                    {
                        xOff = -1;
                    }
                    else
                    {
                        xOff = 0;
                        if (yStart - selectedY > 0)
                        {
                            yOff = 1;
                        }
                        else if (yStart - selectedY < 0) {
                            yOff = -1;
                        }
                        else {
                            return;
                        }
                    }

                    /* check we have a peg to jump */
                    var midPeg = hasPeg(selectedX + xOff, selectedY + yOff, c);
                    if (!midPeg)
                    {
                        return;
                    }

                    // jumped peg
                    drawSquare(selectedX + xOff, selectedY + yOff, SQUARE_COLOUR);
                    // peg dest
                    drawDot(xStart, yStart, PEG_COLOUR);
                    // peg src
                    drawSquare(selectedX, selectedY, SQUARE_COLOUR);

                    pegCount--;
                    selectedX = -1;
                    selectedY = -1;
                }
            }
        }

        /* Check if they have won */
        if (pegCount == 1)
        {
            // $('#win').html("YOU WIN!");
            //init();
        }
    }

    function rgbToHex(r, g, b) {
        if (r > 255 || g > 255 || b > 255)
            throw "Invalid color";
        return ((r << 16) | (g << 8) | b).toString(16);
    }

    // This function will display our overlays and clear them when needed
    function display(e)
    {
        
        stage.onMouseMove = null;

        switch (e)
        {
            case 'win':
                winBitmap.x = (canvas.width * 0.5) - (winImage.width * 2);
                winBitmap.y = (canvas.height * 0.5) - (winImage.height * 2);
                stage.addChild(winBitmap);
                e = null;
                currentGameState = gameStates.GameOver;
                break;


            case 'lose':
                loseBitmap.x = (canvas.width * 0.5) - (winImage.width * 2);
                loseBitmap.y = (canvas.height * 0.5) - (winImage.height * 2);
                e = null;
                stage.addChild(loseBitmap);
 
                currentGameState = gameStates.GameOver;
                break;

            case 'paused':
                pausedBitmap.x = 0;
                pausedBitmap.y = 0;
                e = null;
                stage.addChild(pausedBitmap);
                break;

            case 'clear':
                e = null;
                stage.removeChild(loseBitmap);
                stage.removeChild(winBitmap);
                stage.removeChild(pausedBitmap);
                break;
        }
    }

    //This Function will check if the view state is snapped. 
    //If it is we set our gamestate to paused. 
    function onViewStateChanged()
    {
        var viewStates = Windows.UI.ViewManagement.ApplicationViewState, msg;
        var newViewState = Windows.UI.ViewManagement.ApplicationView.value;

        if (newViewState === viewStates.snapped)
        {
            currentGameState = gameStates.Paused;
        } 
    }

    app.oncheckpoint = function (args)
    {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };

    document.addEventListener("DOMContentLoaded", initialize, false);

    app.start();
})();
