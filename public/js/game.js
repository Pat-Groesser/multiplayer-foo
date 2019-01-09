var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 1280,
    height: 720,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

function preload() {
    this.load.image('ship', 'assets/ship.png');
    this.load.image('otherShip', 'assets/enemy_ship.png');
    this.load.image('star', 'assets/star_gold.png');
}

function create()
{
    var self = this;
    self.socket = io();
    self.otherPlayers = self.physics.add.group();
    self.blueScoreText = self.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
    self.redScoreText = self.add.text(700, 16, '', { fontSize: '32px', fill: '#FF0000' });
    self.cursors = this.input.keyboard.createCursorKeys();

    self.socket.on('currentPlayers', function (players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });

    this.socket.on('newPlayer', function (player) {
        addOtherPlayers(self, player);
    });

    this.socket.on('disconnect', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });

    this.socket.on('scoreUpdate', function (scores) {
        self.blueScoreText.setText('Blue: ' + scores.blue);
        self.redScoreText.setText('Red: ' + scores.red);
    });

    this.socket.on('starLocation', function (starLocation) {
        if (self.star) self.star.destroy();
        self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
        self.physics.add.overlap(self.ship, self.star, function () {
            self.star.destroy();
            self.socket.emit('starCollected');
        }, null, self);
    });
}

function update()
{
    if (this.ship) {
        if (this.cursors.left.isDown) {
            this.ship.setAngularVelocity(-200);
        } else if (this.cursors.right.isDown) {
            this.ship.setAngularVelocity(200);
        } else {
            this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
        } else {
            this.ship.setAcceleration(0);
        }

        this.physics.world.wrap(this.ship, 5);

        // emit player movement
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
            this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
        }

        // save old position data
        this.ship.oldPosition = {
            x: this.ship.x,
            y: this.ship.y,
            rotation: this.ship.rotation
        };
    }
}

function addPlayer(self, player) {
    self.ship = self.physics.add.image(player.x, player.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (player.team === 'blue') {
        self.ship.setTint(0x0000ff);
    } else {
        self.ship.setTint(0xff0000);
    }
    self.ship.setDrag(100);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherShip').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (playerInfo.team === 'blue') {
        otherPlayer.setTint(0x0000ff);
    } else {
        otherPlayer.setTint(0xff0000);
    }
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}