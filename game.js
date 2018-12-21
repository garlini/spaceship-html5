function GameLoop(game)
{
    var ctx = canvas.getContext("2d");
    var requestAnimationId = null;
        
    //inspirado em: https://developer.mozilla.org/en-US/docs/Games/Anatomy
    var lastTick = performance.now();
    var lastRender = lastTick;
    var tickLength = 1000 / 60;
    var stopLoop = false;
    var loop = function (tFrame) {
        if (!stopLoop) {
            requestAnimationId = window.requestAnimationFrame(loop);
        } else {
            return;
        }
        var nextTick = lastTick + tickLength;
        var numTicks = 0;
        
        //If tFrame < nextTick then 0 ticks need to be updated (0 is default for numTicks).
        //If tFrame = nextTick then 1 tick needs to be updated (and so forth).
        //Note: As we mention in summary, you should keep track of how large numTicks is.
        //If it is large, then either your game was asleep, or the machine cannot keep up.
        if (tFrame > nextTick) {
          var timeSinceTick = tFrame - lastTick;
          numTicks = Math.floor( timeSinceTick / tickLength );
        }
        
        queueUpdates(numTicks);
        render(tFrame);
        lastRender = tFrame;
        
    };
    var queueUpdates = function (numTicks) {
        for(var i=0; i < numTicks; i++) {
            lastTick = lastTick + tickLength; //Now lastTick is this tick.
            update(lastTick);
        }
    };
    var render = function (tFrame) {
        game.render(tFrame);
    };
    var update = function (lastTick) {
        game.update(lastTick);
    };
    
    this.start = function () {
        loop(performance.now());
    };
    
    this.stop = function () {
        stopLoop = true;
    };
}

function Game(canvas, width, height)
{
    var game = this;
    
    this.METEORO_SIZE = 60;
    this.NAVE_SIZE = 40;
    this.TIRO_WIDTH = 20;
    this.TIRO_HEIGHT = 40;
    this.EXPLOSAO_SIZE = 60;
    
    this.width = width;
    this.height = height;
    
    this.gameover = false;
    this.pontuacao = 0;
    
    var ctx = canvas.getContext("2d");
        
    var nave = new Nave(ctx, this, width / 2 - 20, height-40);
    
    var meteoros = [];
    
    var tiros = [];
    
    this.meteoroBitmap = null;
    var imgMeteoro = new Image();
    imgMeteoro.onload = function () {
        window.createImageBitmap(imgMeteoro, 0, 0, 180, 180, {resizeWidth: this.METEORO_SIZE, resizeHeight: this.METEORO_SIZE}).then(function (bitmap) {
            game.meteoroBitmap = bitmap;
        });
    };
    imgMeteoro.src = 'assets/meteor.png';
    
    this.naveBitmap = null;
    var imgNave = new Image();
    imgNave.onload = function () {
        window.createImageBitmap(imgNave, 0, 0, 236, 233, {resizeWidth: this.NAVE_SIZE, resizeHeight: this.NAVE_SIZE}).then(function (bitmap) {
            game.naveBitmap = bitmap;
        }); 
    };
    imgNave.src = 'assets/spaceship.jpg';
    
    this.tiroBitmap = null;
    var imgTiro = new Image();
    imgTiro.onload = function () {
        window.createImageBitmap(imgTiro, 0, 0, 79, 300, {resizeWidth: this.TIRO_WIDTH, resizeHeight: this.TIRO_HEIGHT}).then(function (bitmap) {
            game.tiroBitmap = bitmap;
        });
    };
    imgTiro.src = 'assets/missile.png';
    
    //a explosao será um array de bitmaps. Cada elemento é um frame da explosao
    this.arrExplosionBitmap = [];
    var imgExplosao = new Image();
    imgExplosao.onload = function () {
        var FRAME_SIZE = 128;
        var cria_frame_explosao = function (frame, x, y) {
            window.createImageBitmap(imgExplosao, x, y, FRAME_SIZE, FRAME_SIZE, {resizeWidth: game.EXPLOSAO_SIZE, resizeHeight: game.EXPLOSAO_SIZE}).then(function (bitmap) {
                game.arrExplosionBitmap[frame] = bitmap;
            });
        };
        var posFrames = [
            {x: 0, y: 0}, {x: FRAME_SIZE, y: 0}, {x: FRAME_SIZE*2, y: 0}, {x: FRAME_SIZE*3, y: 0},
            {x: 0, y: FRAME_SIZE}, {x: FRAME_SIZE, y: FRAME_SIZE}, {x: FRAME_SIZE*2, y: FRAME_SIZE}, {x: FRAME_SIZE*3, y: FRAME_SIZE},
            {x: 0, y: FRAME_SIZE*2}, {x: FRAME_SIZE, y: FRAME_SIZE*2}, {x: FRAME_SIZE*2, y: FRAME_SIZE*2}, {x: FRAME_SIZE*3, y: FRAME_SIZE*2},
            {x: 0, y: FRAME_SIZE*3}, {x: FRAME_SIZE, y: FRAME_SIZE*3}, {x: FRAME_SIZE*2, y: FRAME_SIZE*3}, {x: FRAME_SIZE*3, y: FRAME_SIZE*3}
        ];
        for (var frame = 0; frame < posFrames.length; frame++) {
            cria_frame_explosao(frame, posFrames[frame].x, posFrames[frame].y);
        }
    };
    imgExplosao.src = 'assets/explosion.png';
    
    var teclado = {up: false, right: false, down: false, left: false, tiro: false};
    
    this.update = function (lastTick) {
        
              
        var i, meteoro, tiro;
        
        if (teclado.right) {
            nave.moveRight();
        } else if (teclado.left) {
            nave.moveLeft();
        }
        
        //move tiros
        for (i = 0; i < tiros.length; i++) {
            tiro = tiros[i];
            if (tiro && tiro.move()) {
                tiros[i] = null; /* out */
            }
        }
        
        //move meteoros
        for (i = 0; i < meteoros.length; i++) {
            meteoro = meteoros[i];
            if (meteoro && (!meteoro.dead) && meteoro.move()) {
                meteoros[i] = null; /* out */
            }
        }
        
        //checa colisacao dos tiros com meteoros
        this.checaColisoesTiros();
        
        //checa colisao com meteoros
        if (!this.gameover && this.checaColisoesNave()) {
            this.gameover = true;
            if (this.ongameover) {
                this.ongameover(this, this.pontuacao);
            }
        }
          
        
        //cria novos tiros
        if (!this.gameover && teclado.tiro) {
            this.criaTiro(lastTick);
        }
        
        //cria novos meteoros
        if (!this.gameover) {
            this.criaMeteoros(lastTick);
        }
    };
    
    var ultimo = performance.now();
    var fps = 0;
    this.render = function (tFrame) {
        
        var i, meteoro, tiro;
        
        ctx.clearRect(0, 0, width, height);
        
        nave.render(tFrame);
        for (i = 0; i < meteoros.length; i++) {
            meteoro = meteoros[i];
            if (meteoro) {
                if (meteoro.render(tFrame)) {
                    meteoros[i] = null;
                }
            }
        }
        for (i = 0; i < tiros.length; i++) {
            tiro = tiros[i];
            if (tiro) {
                tiro.render(tFrame);
            }
        }
        
        //pontuacao
        ctx.font = '12px verdana';
        ctx.fillStyle = 'blue';
        ctx.fillText('Pontuação: ' + this.pontuacao, 2, 15);
        
        if ((tFrame - ultimo) > 1000) {
            //console.log('FPS: ' + fps);
            fps = 0;
            ultimo = tFrame;
            console.log('Qtd meteoros: ' + meteoros.length);
            console.log('Qtd tiros: ' + tiros.length);
        }
        fps++;
    };
    
    var ultimoTiro = -10000;
    this.criaTiro = function(lastTick){
        if (lastTick - ultimoTiro > 500) {
            var tiro = new Tiro(ctx, this, nave.getCentroX(), nave.y - this.TIRO_HEIGHT);
            
            //procura uma posicao desocupada no array. se nao encontrar, adiciona no final
            var insertPos = null;
            for (var i = 0; i < tiros.length; i++) {
                if (!tiros[i]) {
                    insertPos = i; /* i esta livre */
                    break;
                }
            }
            if (insertPos === null) {
                tiros.push(tiro);
            } else {
                tiros[insertPos] = tiro;
            }
            ultimoTiro = lastTick;
        }
    };
    
    var ultimoMeteoro = -10000;
    this.criaMeteoros = function (lastTick) {
        if (lastTick - ultimoMeteoro > 750) {
            var meteoro = new Meteoro(ctx, this, Util.getRandomArbitrary(0, this.width - this.METEORO_SIZE), 0);
            
            var insertPos = null;
            for (var i = 0; i < meteoros.length; i++) {
                if (!meteoros[i]) {
                    insertPos = i; 
                    break;
                }
            }
            if (insertPos === null) {            
                meteoros.push(meteoro);
            } else {
                meteoros[insertPos] = meteoro;
            }
            ultimoMeteoro = lastTick;
        }
    };
    
    this.checaColisoesNave = function () {
        var meteoro; 
        for (var i = 0; i < meteoros.length; i++) {
            meteoro = meteoros[i];
            if (meteoro === null || meteoro.dead) {
                continue;
            }
            if (Util.collisionDetection(nave, meteoro)) {
                nave.kill();
                meteoros[i] = null;
                return true;
            }
        }
        return false;
    };
    
    this.checaColisoesTiros = function () {
        var tiro, meteoro, i, j;
        for (i = 0; i < tiros.length; i++) {
            tiro = tiros[i];
            if (tiro === null) {
                continue;
            }
            for (j = 0; j < meteoros.length; j++) {
                meteoro = meteoros[j];
                if (meteoro === null || meteoro.dead) {
                    continue;
                }
                if (Util.collisionDetection(tiro, meteoro)) {
                    if (!this.gameover) {
                        this.pontuacao++;
                    }
                    meteoro.kill();
                    tiros[i] = null;
                }
            }
        }
    };
        
    window.onkeydown = function (ev) {
        switch (ev.keyCode) {
            case 37:
                teclado.left = true;
                break;
            case 39:
                teclado.right = true;
                break;  
            case 32:
                teclado.tiro = true;
                break;
        }
    };
    window.onkeyup = function (ev) {
        switch (ev.keyCode) {
            case 37:
                teclado.left = false;
                break;
            case 39:
                teclado.right = false;
                break;
            case 32:
                teclado.tiro = false;
                break;    
        }
    };
}

function Nave(ctx, game, x, y)
{
    this.x = x;
    this.y = y;
    this.width = game.NAVE_SIZE;
    this.height = game.NAVE_SIZE;
    this.velocidade = 2;
    this.dead = false;
    this.explodindo = false;
    this.explosaoFrame = 0;
    
    this.moveRight = function () {
        if (this.dead) {
            return;
        }
        this.x += this.velocidade;
        if ((this.x + this.width) > game.width) {
            this.x = game.width - this.width;
        }
    };
    
    this.moveLeft = function () {
        if (this.dead) {
            return;
        }
        this.x -= this.velocidade;
        if (this.x < 0) {
            this.x = 0;
        }
    };
    
    this.render = function (tFrame) {
        
        if (game.naveBitmap && !this.dead) {
            ctx.drawImage(game.naveBitmap, this.x, this.y, this.width, this.height);
        }
        
        if (this.explodindo && game.arrExplosionBitmap.length > 0) {
            if (this.explosaoFrame >= game.arrExplosionBitmap.length) {
                return true; /* fim animação */
            }
            ctx.drawImage(game.arrExplosionBitmap[this.explosaoFrame], this.x, this.y, game.EXPLOSAO_SIZE, game.EXPLOSAO_SIZE);
            this.explosaoFrame++;
        }
        
        return false;
    };
       
    
    this.kill = function () {
        this.dead = true;
        this.explodindo = true;
    };
    
    this.getCentroX = function () {
        return this.x + (this.width / 2);
    };
}

function Meteoro(ctx, game, x, y)
{
    this.x = x;
    this.y = y;
    this.width = game.METEORO_SIZE;
    this.height = game.METEORO_SIZE;
    this.velocidade = 5;
    this.out = false;
    this.dead = false;
    this.explodindo = false;
    this.explosaoFrame = 0;
    this.repeteFrame = 0;
    
    this.render = function (tFrame) {
        if (this.out) {
            return true;
        }
        
        if (game.meteoroBitmap && !this.dead) {
            ctx.drawImage(game.meteoroBitmap, this.x, this.y, this.width, this.height);
        }
        
        if (this.explodindo && game.arrExplosionBitmap.length > 0) {
            if (this.explosaoFrame >= game.arrExplosionBitmap.length) {
                return true; /* objeto pode ser removido */
            }
            ctx.drawImage(game.arrExplosionBitmap[this.explosaoFrame], this.x, this.y, game.EXPLOSAO_SIZE, game.EXPLOSAO_SIZE);
            this.explosaoFrame++;
        }
        
        return false;
    };
    
    this.move = function () {
        if (this.out || this.dead) {
            return false;
        }
        this.y += this.velocidade;
        this.out = this.y > game.height;
        return this.out;
    };
    
    this.kill = function () {
        this.dead = true;
        this.explodindo = true;
    };
}

function Tiro(ctx, game, x, y)
{
    this.x = x;
    this.y = y;
    this.width = game.TIRO_WIDTH;
    this.height = game.TIRO_HEIGHT;
    this.velocidade = -5;
    this.out = false;
    
    this.move = function () {
        if (this.out) {
            return this.out;
        }
        
        this.y += this.velocidade;
        this.out = (this.y + this.height) < 0;
        return this.out;
    };
    
    this.render = function (tFrame) {
        if (this.out) {
            return;
        }
        
        if (game.tiroBitmap) {
            ctx.drawImage(game.tiroBitmap, this.x, this.y, this.width, this.height);
        }
    };
}

var Util = {
    getRandomArbitrary: function(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    //retirado de: https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
    collisionDetection: function (rect1, rect2) {
        if (rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.height + rect1.y > rect2.y) {
             // collision detected!
             return true;
         }                
         return false;
    }
};