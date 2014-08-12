
var asteroids = [];

function collision(box, x, y)
{
	return x > box.x && x < (box.x+box.width) && y > box.y && y < (box.y + box.height);
}

var Entity = Base.extend({
	frameHandler: null,
	stage: null,
	bitmap: null,
	sprite: null,
	imgData: null,
	velocity: {x: 0, y: 0},
	maxSpeed: 5,
	thrust: 0.4,
	drag: 0.01,
	sizeFixed: false,
	constructor: function(imgData, stage)
	{
		this.stage = stage;
		this.bitmap = new Bitmap(new BitmapData(imgData.url));
		this.sprite = new Sprite();
		this.sprite.addChild(this.bitmap);
		stage.addChild(this.sprite);

		if (imgData.offset != null)
		{
			this.bitmap.x = imgData.offset.x;
			this.bitmap.y = imgData.offset.y;
			this.sizeFixed = true;
		}

		this.imgData = imgData;

		var a = this;
		this.frameHandler = function(e){a.handleFrame(e)};
		stage.addEventListener(Event.ENTER_FRAME, this.frameHandler);
	},
	handleFrame: function(e)
	{
		if (!this.sizeFixed && this.bitmap.bitmapData.width > 0)
		{
			//if the offset has not been set, set to centre
			this.bitmap.x = -this.bitmap.bitmapData.width/2;
			this.bitmap.y = -this.bitmap.bitmapData.height/2;
			this.sizeFixed = true;
		}
	},
	destroy: function()
	{
		this.stage.removeChild(this.sprite);
		this.stage.removeEventListener(Event.ENTER_FRAME, this.frameHandler);
	}
});

var PersistentEntity = Entity.extend({
	constructor: function(imgData, stage)
	{
		this.base(imgData, stage);
	},
	handleFrame: function(e)
	{
		this.base(e);
		//wrap to other side
		if (this.sprite.x > this.stage.stageWidth)
			this.sprite.x = 0;
		if (this.sprite.x < 0)
			this.sprite.x = this.stage.stageWidth;
		if (this.sprite.y > this.stage.stageHeight)
			this.sprite.y = 0;
		if (this.sprite.y < 0)
			this.sprite.y = this.stage.stageHeight;
	}
});

var Bullet = Entity.extend({
	constructor: function(imgData, stage, angle)
	{
		this.base(imgData, stage);
		this.sprite.rotation = angle;
		this.thrust = 20;
	},
	handleFrame: function(e)
	{
		var componentX = Math.cos((this.sprite.rotation-90)*(Math.PI/180));
		var componentY = Math.sin((this.sprite.rotation-90)*(Math.PI/180));
		var thrustX = componentX*this.thrust;
		var thrustY = componentY*this.thrust;
		this.sprite.x += thrustX;
		this.sprite.y += thrustY;

		if (this.sprite.x > this.stage.stageWidth || this.sprite.x < 0)
			this.destroy();
		if (this.sprite.y > this.stage.stageHeight || this.sprite.y < 0)
			this.destroy();

		for (var i = 0; i < asteroids.length; i++)
		{
			var box = asteroids[i].sprite.getBounds(this.stage);
			if (collision(box, this.sprite.x, this.sprite.y))
			{
				asteroids[i].explode();
				this.destroy();
				var audio = new Audio('sounds/sfx_twoTone.ogg');
				audio.play();
			}
		}
	}
});

var Asteroid = PersistentEntity.extend({
	size: 0,
	speed: 1,
	angle: 0,
	rotationSpeed: 0,
	constructor: function(imgData, stage, size, speed, angle)
	{
		this.base(imgData, stage);
		this.size = size;
		this.speed = speed;
		this.angle = angle;
		this.rotationSpeed = Math.random()*5;
	},
	explode: function()
	{
		//make asteroidlets of next size down
		if (this.size > 2)
		{
			var type = "big";
			if (this.size == 4)
				type = "med";
			else if (this.size == 3)
				type = "small";
			else
				type = "tiny"

			for(var i = 0; i < Math.ceil(Math.random()*5); i++)
			{
				var asteroid = new Asteroid({url: "graphics/Meteors/meteorBrown_" + type + Math.ceil(Math.random()*2) + ".png"}, this.stage, this.size-1, 5*Math.random(), 360*Math.random());
				asteroid.sprite.x = this.sprite.x;
				asteroid.sprite.y = this.sprite.y;
				asteroids.push(asteroid);
			}
		}

		this.destroy();
	},
	handleFrame: function(e)
	{
		this.base(e);

		var componentX = Math.cos(this.angle)*this.speed;
		var componentY = Math.sin(this.angle)*this.speed;
		this.sprite.x += componentX;
		this.sprite.y += componentY;

		this.sprite.rotation += this.rotationSpeed;
	},
	destroy: function()
	{
		this.base();
		for (var i = 0; i < asteroids.length; i++)
		{
			if (asteroids[i] == this)
				asteroids.splice(i, 1);
		}

		if (asteroids.length == 0)
			alert("You win!");
	}
});

var LocalPlayer = PersistentEntity.extend({
	name: null,
	left: false,
	right: false,
	up: false,
	down: false,
	space: false,
	maxSpeed: 5,
	gunPoints: null,
	health: 10,
	damageSprite: null,
	damageLevel: 0,
	canShoot: true,

	constructor: function(imgData, stage, name, maxSpeed, gunPoints)
	{
		this.base(imgData, stage);
		this.name = name;
		this.maxSpeed = maxSpeed;
		this.gunPoints = gunPoints;
		var a = this;
		stage.addEventListener(KeyboardEvent.KEY_DOWN, function(e){a.handleKeyDown(e)});
		stage.addEventListener(KeyboardEvent.KEY_UP  , function(e){a.handleKeyUp(e)});
	},
	handleFrame: function(e)
	{
		this.base(e);
		var thrustX = 0;
		var thrustY = 0;
		var angle = (this.sprite.rotation - 90)*(Math.PI/180);
		var componentX = 0;
		var componentY = 0;

		if (this.up)
		{
			componentX = Math.cos(angle);
			componentY = Math.sin(angle);
			thrustX = componentX*this.thrust;
			thrustY = componentY*this.thrust;
		}

		if ( (this.velocity.x < this.maxSpeed*componentX && thrustX > 0) || (this.velocity.x > this.maxSpeed*componentX && thrustX < 0) )
			this.velocity.x += thrustX;

		if ( (this.velocity.y < this.maxSpeed*componentY && thrustY > 0) || (this.velocity.y > this.maxSpeed*componentY && thrustY < 0) )
			this.velocity.y += thrustY;
		
		//drag components
		this.velocity.y += -this.velocity.y*this.drag;
		this.velocity.x += -this.velocity.x*this.drag;

		this.sprite.x += this.velocity.x;
		this.sprite.y += this.velocity.y;

		//rotate
		if (this.left)
			this.sprite.rotation -= 5;
		else if(this.right)
			this.sprite.rotation += 5;

		//collision check
		for (var i = 0; i < asteroids.length; i++)
		{
			var box = asteroids[i].sprite.getBounds(this.stage);
			if (collision(box, this.sprite.x, this.sprite.y))
			{
				this.health -= asteroids[i].size;
				asteroids[i].explode();
				var audio = new Audio('sounds/sfx_lose.ogg');
				audio.play();

				if (this.health < 4 && this.damageLevel == 2)
				{
					this.damageSprite.destroy();
					this.damageSprite = new Entity({url: "graphics/Damage/playerShip1_damage3.png"}, this.stage);
					this.damageLevel = 3;
				}
				else if (this.health < 6 && this.damageLevel == 1)
				{
					this.damageSprite.destroy();
					this.damageSprite = new Entity({url: "graphics/Damage/playerShip1_damage2.png"}, this.stage);
					this.damageLevel = 2;
				}
				else if (this.health < 8 && this.damageLevel == 0)
				{
					this.damageSprite = new Entity({url: "graphics/Damage/playerShip1_damage1.png"}, this.stage);
					this.damageLevel = 1;
				}

				if (this.health < 0)
				{
					this.destroy();
					this.damageSprite.destroy();
				}
			}
		}

		if (this.damageSprite)
		{
			this.damageSprite.sprite.x = this.sprite.x;
			this.damageSprite.sprite.y = this.sprite.y;
			this.damageSprite.sprite.rotation = this.sprite.rotation;
		}
	},
	handleKeyUp: function(e)
	{
		if (this.space && this.canShoot && this.health > 0)
		{
			this.canShoot = false;
			var audio = new Audio('sounds/sfx_laser2.ogg');
			audio.play();
			for(var i = 0; i < this.gunPoints.length; i++)
			{
				var bullet = new Bullet({url: "graphics/Lasers/laserBlue01.png", offset: {x: -4, y: -27}}, this.stage, this.sprite.rotation);
				
				var angle = (this.sprite.rotation-90)*(Math.PI/180);

				var gunPointXComponent = (Math.cos(angle)*this.gunPoints[i].x) - (Math.sin(angle)*this.gunPoints[i].y);
				var gunPointYComponent = (Math.sin(angle)*this.gunPoints[i].x) + (Math.cos(angle)*this.gunPoints[i].y);

				bullet.sprite.x = this.sprite.x + gunPointXComponent;
				bullet.sprite.y = this.sprite.y + gunPointYComponent;
			}
		}

		if (e.keyCode == 87) this.up = false;
		if (e.keyCode == 83) this.down = false;
		if (e.keyCode == 65) this.left = false;
		if (e.keyCode == 68) this.right = false;
		if (e.keyCode == 32) this.space = false;
	},
	handleKeyDown: function(e)
	{
		if (e.keyCode == 87) this.up = true;
		if (e.keyCode == 83) this.down = true;
		if (e.keyCode == 65) this.left = true;
		if (e.keyCode == 68) this.right = true;
		if (e.keyCode == 32)
		{
			this.space = true;
			this.canShoot = true;
		}
	},
	explode: function()
	{

	}
});

function setupBackground(stage)
{
	var tileWidth = 256;
	var tileHeight = 256;

	for (var y = 0; y < stage.stageWidth; y += tileHeight)
		for (var x = 0; x < stage.stageWidth; x += tileWidth)
		{
			var bitmap = new Bitmap(new BitmapData("graphics/Backgrounds/blue.png"));
			var sprite = new Sprite();
			sprite.addChild(bitmap);
			stage.addChild(sprite);
			sprite.x = x;
			sprite.y = y;
		}
}


function setupAsteroids(stage)
{
	for (var i = 0; i < 10; i++)
	{
		var asteroid = new Asteroid({url: "graphics/Meteors/meteorBrown_big" + Math.ceil(Math.random()*3) + ".png"}, stage, 4, 5*Math.random(), 360*Math.random());
		asteroid.sprite.x = Math.floor(Math.random()*stage.stageWidth);
		asteroid.sprite.y = Math.floor(Math.random()*stage.stageHeight);
		asteroids.push(asteroid);
	}
}

function main()
{
	var stage = new Stage("c");
	setupBackground(stage);

	var player = new LocalPlayer({url: "graphics/playerShip1_green.png"}, stage, "Player 1", 100, [{x: 40, y: -20}, {x: 40, y: 20}]); //move image data to array of all types
	player.sprite.x = stage.stageWidth/2;
	player.sprite.y = stage.stageHeight/2;

	setupAsteroids(stage);
}

window.onload = main;