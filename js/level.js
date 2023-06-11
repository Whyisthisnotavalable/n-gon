let body = []; //non static bodies
let map = []; //all static bodies
let cons = []; //all constraints between a point and a body
let consBB = []; //all constraints between two bodies
let composite = [] //rotors and other map elements that don't fit 
const level = {
    defaultZoom: 1400,
    onLevel: -1,
    levelsCleared: 0,
    playableLevels: ["openWorldTest"],
    levels: [],
    start() {
        if (level.levelsCleared === 0) { //this code only runs on the first level
            level.openWorldTest(); //starting level
        } else {
            spawn.setSpawnList(); //picks a couple mobs types for a themed random mob spawns
            // spawn.pickList = ["focuser", "focuser"]
            level[level.levels[level.onLevel]](); //picks the current map from the the levels array
            if (!simulation.isCheating && !build.isExperimentRun) {
                localSettings.runCount += level.levelsCleared //track the number of total runs locally
                localSettings.levelsClearedLastGame = level.levelsCleared
                localStorage.setItem("localSettings", JSON.stringify(localSettings)); //update local storage
            }
        }
        level.levelAnnounce();
        simulation.noCameraScroll();
        simulation.setZoom();
        level.addToWorld(); //add bodies to game engine
        simulation.draw.setPaths();
        b.respawnBots();
        m.resetHistory();

        if (tech.isForeverDrones) {
            if (tech.isDroneRadioactive) {
                for (let i = 0; i < tech.isForeverDrones * 0.25; i++) {
                    b.droneRadioactive({ x: m.pos.x + 30 * (Math.random() - 0.5), y: m.pos.y + 30 * (Math.random() - 0.5) }, 5)
                    bullet[bullet.length - 1].endCycle = Infinity
                }
            } else {
                for (let i = 0; i < tech.isForeverDrones; i++) {
                    b.drone({ x: m.pos.x + 30 * (Math.random() - 0.5), y: m.pos.y + 30 * (Math.random() - 0.5) }, 5)
                    bullet[bullet.length - 1].endCycle = Infinity
                }
            }
        }
        if (tech.isExtraMaxEnergy) {
            tech.healMaxEnergyBonus += 0.04 * powerUps.totalPowerUps //Math.min(0.02 * powerUps.totalPowerUps, 0.51)
            m.setMaxEnergy();
        }
        if (tech.isGunCycle) {
            b.inventoryGun++;
            if (b.inventoryGun > b.inventory.length - 1) b.inventoryGun = 0;
            simulation.switchGun();
        }
        if (tech.isSwitchReality && powerUps.research.count > 0) {
            powerUps.research.changeRerolls(-1);
            simulation.makeTextLog(`simulation.amplitude <span class='color-symbol'>=</span> ${Math.random()}`);
            m.switchWorlds()
            simulation.trails()
            powerUps.spawn(player.position.x + Math.random() * 50, player.position.y - Math.random() * 50, "tech", false);
        }
        if (tech.isHealLowHealth) {
            const len = Math.ceil((m.maxHealth - m.health) / 0.26)
            for (let i = 0; i < len; i++) powerUps.spawn(player.position.x + 90 * (Math.random() - 0.5), player.position.y + 90 * (Math.random() - 0.5), "heal", false);
        }
        if (tech.isMACHO) spawn.MACHO()
        for (let i = 0; i < tech.wimpCount; i++) {
            spawn.WIMP()
            for (let j = 0, len = 5; j < len; j++) powerUps.spawn(level.exit.x + 100 * (Math.random() - 0.5), level.exit.y - 100 + 100 * (Math.random() - 0.5), "research", false)
        }
        for (let i = 0; i < tech.wimpExperiment; i++) spawn.WIMP()
        if (tech.isFlipFlopLevelReset && !tech.isFlipFlopOn) {
            tech.isFlipFlopOn = true
            m.eyeFillColor = m.fieldMeterColor
            simulation.makeTextLog(`tech.isFlipFlopOn <span class='color-symbol'>=</span> true`);
        }
        if (tech.isSpawnExitTech) {
            for (let i = 0; i < 2; i++) powerUps.spawn(level.exit.x + 10 * (Math.random() - 0.5), level.exit.y - 100 + 10 * (Math.random() - 0.5), "tech", false) //exit
            // for (let i = 0; i < 2; i++) powerUps.spawn(player.position.x + 90 * (Math.random() - 0.5), player.position.y + 90 * (Math.random() - 0.5), "tech", false); //start
        }
    },
    custom() {},
    customTopLayer() {},
    setDifficulty() {
        simulation.difficulty = 0
        b.dmgScale = 1; //damage done by player decreases each level
        simulation.accelScale = 1 //mob acceleration increases each level
        simulation.CDScale = 1 //mob CD time decreases each level
        simulation.dmgScale = 0.41 * simulation.difficulty //damage done by mobs increases each level
        simulation.healScale = 1 / (1 + simulation.difficulty * 0.055) //a higher denominator makes for lower heals // m.health += heal * simulation.healScale;
    },
    difficultyIncrease(num = 1) {
        for (let i = 0; i < num; i++) {
            simulation.difficulty++
            b.dmgScale *= 0.914; //damage done by player decreases each level
            if (simulation.accelScale < 6) simulation.accelScale *= 1.025 //mob acceleration increases each level
            if (simulation.CDScale > 0.15) simulation.CDScale *= 0.965 //mob CD time decreases each level
        }
        simulation.dmgScale = 0.41 * simulation.difficulty //damage done by mobs increases each level
        simulation.healScale = 1 / (1 + simulation.difficulty * 0.055) //a higher denominator makes for lower heals // m.health += heal * simulation.healScale;
        // console.log(`CD = ${simulation.CDScale}`)
    },
    difficultyDecrease(num = 1) { //used in easy mode for simulation.reset()
        for (let i = 0; i < num; i++) {
            simulation.difficulty--
            b.dmgScale /= 0.914; //damage done by player decreases each level
            if (simulation.accelScale > 1) simulation.accelScale /= 1.025 //mob acceleration increases each level
            if (simulation.CDScale < 1) simulation.CDScale /= 0.965 //mob CD time decreases each level
        }
        if (simulation.difficulty < 1) simulation.difficulty = 0;
        simulation.dmgScale = 0.41 * simulation.difficulty //damage done by mobs increases each level
        if (simulation.dmgScale < 0.1) simulation.dmgScale = 0.1;
        simulation.healScale = 1 / (1 + simulation.difficulty * 0.055)
    },
    difficultyText() {
        if (simulation.difficultyMode === 1) {
            return "easy"
        } else if (simulation.difficultyMode === 2) {
            return "normal"
        } else if (simulation.difficultyMode === 4) {
            return "hard"
        } else if (simulation.difficultyMode === 6) {
            return "why"
        }
    },
    levelAnnounce() {
        // const difficulty = simulation.isCheating ? "testing" : level.difficultyText()
		document.title = ` n-gon: open world`;
    },
    // nextLevel() {
        // level.levelsCleared++;
        // // level.difficultyIncrease(simulation.difficultyMode) //increase difficulty based on modes

        // //difficulty is increased 5 times when finalBoss dies
        // // const len = level.levelsCleared / level.levels.length //add 1 extra difficulty step for each time you have cleared all the levels
        // // for (let i = 0; i < len; i++) 
        // level.difficultyIncrease(simulation.difficultyMode)

        // level.onLevel++; //cycles map to next level
        // if (level.onLevel > level.levels.length - 1) level.onLevel = 0;
        // //reset lost tech display
        // for (let i = 0; i < tech.tech.length; i++) {
            // if (tech.tech[i].isLost) tech.tech[i].isLost = false;
        // }
        // tech.isDeathAvoidedThisLevel = false;
        // simulation.updateTechHUD();
        // simulation.clearNow = true; //triggers in simulation.clearMap to remove all physics bodies and setup for new map
    // },
    populateLevels() {
        simulation.isHorizontalFlipped = (Math.random() < 0.5) ? true : false //if true, some maps are flipped horizontally
        level.levels = level.playableLevels.slice(0) //copy array, not by just by assignment
		level.levels = shuffle(level.levels); //shuffles order of maps
        if (!build.isExperimentSelection || (build.hasExperimentalMode && !simulation.isCheating)) { //experimental mode is endless, unless you only have an experiment Tech
            level.levels.unshift("intro"); //add level to the start of the randomized levels list
            level.levels.push("gauntlet"); //add level to the end of the randomized levels list
            level.levels.push("final"); //add level to the end of the randomized levels list
        }
    },
    flipHorizontal() {
        const flipX = (who) => {
            for (let i = 0, len = who.length; i < len; i++) {
                Matter.Body.setPosition(who[i], { x: -who[i].position.x, y: who[i].position.y })
            }
        }
        flipX(map)
        flipX(body)
        flipX(mob)
        flipX(powerUp)
        for (let i = 0, len = cons.length; i < len; i++) {
            cons[i].pointA.x *= -1
            cons[i].pointB.x *= -1
        }
        for (let i = 0, len = consBB.length; i < len; i++) {
            consBB[i].pointA.x *= -1
            consBB[i].pointB.x *= -1
        }
        level.exit.x = -level.exit.x - 100 //minus the 100 because of the width of the graphic
    },
    // playerExitCheck() {
        // if (
            // player.position.x > level.exit.x &&
            // player.position.x < level.exit.x + 100 &&
            // player.position.y > level.exit.y - 150 &&
            // player.position.y < level.exit.y - 40 &&
            // player.velocity.y < 0.1
        // ) {
            // level.nextLevel()
        // }
    // },
    setPosToSpawn(xPos, yPos) {
        m.spawnPos.x = m.pos.x = xPos;
        m.spawnPos.y = m.pos.y = yPos;
        level.enter.x = m.spawnPos.x - 50;
        level.enter.y = m.spawnPos.y + 20;
        m.transX = m.transSmoothX = canvas.width2 - m.pos.x;
        m.transY = m.transSmoothY = canvas.height2 - m.pos.y;
        m.Vx = m.spawnVel.x;
        m.Vy = m.spawnVel.y;
        player.force.x = 0;
        player.force.y = 0;
        Matter.Body.setPosition(player, m.spawnPos);
        Matter.Body.setVelocity(player, m.spawnVel);
        //makes perfect diamagnetism tech: Lenz's law show up in the right spot at the start of a level
        m.fieldPosition = { x: m.pos.x, y: m.pos.y }
        m.fieldAngle = m.angle
    },
    enter: {
        x: 0,
        y: 0,
        draw() {
            ctx.beginPath();
            ctx.moveTo(level.enter.x, level.enter.y + 30);
            ctx.lineTo(level.enter.x, level.enter.y - 80);
            ctx.bezierCurveTo(level.enter.x, level.enter.y - 170, level.enter.x + 100, level.enter.y - 170, level.enter.x + 100, level.enter.y - 80);
            ctx.lineTo(level.enter.x + 100, level.enter.y + 30);
            ctx.lineTo(level.enter.x, level.enter.y + 30);
            ctx.fillStyle = "#ccc";
            ctx.fill();
        }
    },
    exit: {
        x: 0,
        y: 0,
        draw() {
            ctx.beginPath();
            ctx.moveTo(level.exit.x, level.exit.y + 30);
            ctx.lineTo(level.exit.x, level.exit.y - 80);
            ctx.bezierCurveTo(level.exit.x, level.exit.y - 170, level.exit.x + 100, level.exit.y - 170, level.exit.x + 100, level.exit.y - 80);
            ctx.lineTo(level.exit.x + 100, level.exit.y + 30);
            ctx.lineTo(level.exit.x, level.exit.y + 30);
            ctx.fillStyle = "#0ff";
            ctx.fill();
        }
    },
    addToWorld() { //needs to be run to put bodies into the world
        for (let i = 0; i < body.length; i++) {
            if (body[i] !== m.holdingTarget && !body[i].isNoSetCollision) {
                body[i].collisionFilter.category = cat.body;
                body[i].collisionFilter.mask = cat.player | cat.map | cat.body | cat.bullet | cat.mob | cat.mobBullet
            }
            body[i].classType = "body";
            Composite.add(engine.world, body[i]); //add to world
        }
        for (let i = 0; i < map.length; i++) {
            map[i].collisionFilter.category = cat.map;
            map[i].collisionFilter.mask = cat.player | cat.map | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet;
            Matter.Body.setStatic(map[i], true); //make static
            Composite.add(engine.world, map[i]); //add to world
        }
    },
    spinner(x, y, width, height, density = 0.001, angle = 0, frictionAir = 0.001, angularVelocity = 0) {
        x += width / 2
        y += height / 2
        const who = body[body.length] = Bodies.rectangle(x, y, width, height, {
            collisionFilter: {
                category: cat.body,
                mask: cat.player | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet //cat.player | cat.map | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet
            },
            isNotHoldable: true,
            frictionAir: frictionAir,
            friction: 1,
            frictionStatic: 1,
            restitution: 0,
        });
        Matter.Body.setAngle(who, angle)
        Matter.Body.setAngularVelocity(who, angularVelocity);


        Matter.Body.setDensity(who, density)
        const constraint = Constraint.create({ //fix rotor in place, but allow rotation
            pointA: {
                x: who.position.x,
                y: who.position.y
            },
            bodyB: who,
            stiffness: 1,
            damping: 1
        });
        Composite.add(engine.world, constraint);
        return constraint
    },
    boost(x, y, height = 1000) { //height is how high the player will be flung above y
        who = map[map.length] = Matter.Bodies.fromVertices(x + 50, y + 35, Vertices.fromPath("120 40 -120 40 -50 -40 50 -40"), {
            collisionFilter: {
                category: cat.body,
                mask: cat.player | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet //cat.player | cat.map | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet
            },
            boostBounds: {
                min: {
                    x: x,
                    y: y - 20
                },
                max: {
                    x: x + 100,
                    y: y
                }
            },
            yVelocity: -1.21 * Math.sqrt(Math.abs(height)),
            query() {
                // check for collisions
                query = (who) => {
                    if (Matter.Query.region(who, this.boostBounds).length > 0) {
                        list = Matter.Query.region(who, this.boostBounds)
                        Matter.Body.setVelocity(list[0], {
                            x: list[0].velocity.x + (Math.random() - 0.5) * 2.5, //add a bit of horizontal drift to reduce endless bounces
                            y: this.yVelocity //give a upwards velocity
                        });
                    }
                }
                query(body)
                query(mob)
                query(bullet)
                query(powerUp)
                //player collision
                if (Matter.Query.region([player], this.boostBounds).length > 0) {
                    m.buttonCD_jump = 0; // reset short jump counter to prevent short jumps on boosts
                    m.hardLandCD = 0 // disable hard landing
                    if (player.velocity.y > 26) {
                        Matter.Body.setVelocity(player, {
                            x: player.velocity.x,
                            y: -15 //gentle bounce if coming down super fast
                        });
                    } else {
                        Matter.Body.setVelocity(player, {
                            x: player.velocity.x + (Math.random() - 0.5) * 2.5,
                            y: this.yVelocity //give a upwards velocity that will put the player that the height desired
                        });
                    }
                }

                //draw 
                ctx.fillStyle = "rgba(200,0,255,0.15)";
                ctx.fillRect(this.boostBounds.min.x, this.boostBounds.min.y - 10, 100, 30);
                ctx.fillStyle = "rgba(200,0,255,0.05)";
                ctx.fillRect(this.boostBounds.min.x, this.boostBounds.min.y - 50, 100, 70);
                // ctx.fillStyle = "rgba(200,0,255,0.02)";
                // ctx.fillRect(x, y - 120, 100, 120);
            },
        });
        return who
    },
    elevator(x, y, width, height, maxHeight, force = 0.003, friction = { up: 0.01, down: 0.2 }) {
        x += width / 2
        y += height / 2
        maxHeight += height / 2
        const yTravel = maxHeight - y
        force += simulation.g
        const who = body[body.length] = Bodies.rectangle(x, y, width, height, {
            collisionFilter: {
                category: cat.body,
                mask: cat.player | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet //cat.player | cat.map | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet
            },
            inertia: Infinity, //prevents rotation
            isNotHoldable: true,
            friction: 1,
            frictionStatic: 1,
            restitution: 0,
            frictionAir: 0.001,
            holdX: x,
            move() {
                if (!m.isBodiesAsleep) {
                    if (this.isUp) { //moving up still with high air friction
                        this.force.y -= force * this.mass //hard force propels up, even with high friction

                        if (this.position.y < maxHeight) { //switch to down mode
                            this.isUp = false
                            this.frictionAir = friction.down
                            //adds a hard jerk at the top of vertical motion because it's fun
                            Matter.Body.setPosition(this, {
                                x: this.holdX,
                                y: maxHeight
                            });
                            Matter.Body.setVelocity(this, {
                                x: 0,
                                y: 0
                            });
                        }
                    } else if (this.position.y + 10 * this.velocity.y > y) { //free falling down, with only air friction
                        Matter.Body.setVelocity(this, { //slow down early to avoid a jerky stop that can pass through blocks
                            x: 0,
                            y: this.velocity.y * 0.7
                        });
                        if (this.position.y + this.velocity.y > y) { //switch to up mode
                            this.isUp = true
                            this.frictionAir = friction.up
                        }
                    }

                }
                // hold horizontal position
                Matter.Body.setPosition(this, {
                    x: this.holdX,
                    y: this.position.y
                });
                Matter.Body.setVelocity(this, {
                    x: 0,
                    y: this.velocity.y
                });
            },
            off() {
                Matter.Body.setPosition(this, {
                    x: this.holdX,
                    y: this.position.y
                });
                Matter.Body.setVelocity(this, {
                    x: 0,
                    y: this.velocity.y
                });
            },
            constraint: this.null,
            addConstraint() {
                this.constraint = Constraint.create({
                    pointA: {
                        x: this.position.x,
                        y: this.position.y
                    },
                    bodyB: this,
                    stiffness: 0.01,
                    damping: 0.3
                });
                Composite.add(engine.world, this.constraint);
            },
            removeConstraint() {
                Composite.remove(engine.world, this.constraint, true)
            },
            drawTrack() {
                ctx.fillStyle = "#ccc"
                ctx.fillRect(this.holdX, y, 5, yTravel)
            }
        });
        Matter.Body.setDensity(who, 0.01) //10x density for added stability
        return who
    },
    platform(x, y, width, height, speed = 0, density = 0.001) {
        x = x + width / 2
        y = y + height / 2
        const who = body[body.length] = Bodies.rectangle(x, y, width, height, {
            collisionFilter: {
                category: cat.body,
                mask: cat.player | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet //cat.player | cat.map | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet
            },
            inertia: Infinity, //prevents rotation
            isNotHoldable: true,
            friction: 1,
            frictionStatic: 1,
            restitution: 0,
        });

        Matter.Body.setDensity(who, density)
        const constraint = Constraint.create({ //fix rotor in place, but allow rotation
            pointA: {
                x: x,
                y: y
            },
            bodyB: who,
            stiffness: 0.1,
            damping: 0.3
        });
        Composite.add(engine.world, constraint);
        constraint.plat = {
            position: who.position,
            speed: speed,
        }
        constraint.pauseUntilCycle = 0 //to to pause platform at top and bottom

        return constraint
    },
    rotor(x, y, rotate = 0, radius = 800, width = 40, density = 0.0005) {
        const rotor1 = Matter.Bodies.rectangle(x, y, width, radius, {
            density: density,
            isNotHoldable: true,
            isComposite: true
        });
        const rotor2 = Matter.Bodies.rectangle(x, y, width, radius, {
            angle: Math.PI / 2,
            density: density,
            isNotHoldable: true,
            isComposite: true
        });
        rotor = Body.create({ //combine rotor1 and rotor2
            parts: [rotor1, rotor2],
            restitution: 0,
            collisionFilter: {
                category: cat.body,
                mask: cat.body | cat.mob | cat.mobBullet | cat.mobShield | cat.powerUp | cat.player | cat.bullet
            },
        });
        Matter.Body.setPosition(rotor, {
            x: x,
            y: y
        });
        Composite.add(engine.world, [rotor]);
        body[body.length] = rotor1
        body[body.length] = rotor2

        setTimeout(function() {
            rotor.collisionFilter.category = cat.body;
            rotor.collisionFilter.mask = cat.body | cat.player | cat.bullet | cat.mob | cat.mobBullet //| cat.map
        }, 1000);

        const constraint = Constraint.create({ //fix rotor in place, but allow rotation
            pointA: {
                x: x,
                y: y
            },
            bodyB: rotor
        });
        Composite.add(engine.world, constraint);

        if (rotate) {
            rotor.rotate = function() {
                if (!m.isBodiesAsleep) {
                    Matter.Body.applyForce(rotor, {
                        x: rotor.position.x + 100,
                        y: rotor.position.y + 100
                    }, {
                        x: rotate * rotor.mass,
                        y: 0
                    })
                } else {
                    Matter.Body.setAngularVelocity(rotor, 0);
                }
            }
        }
        composite[composite.length] = rotor
        return rotor
    },
    toggle(x, y, isOn = false, isLockOn = false) {
        spawn.mapVertex(x + 65, y + 2, "70 10 -70 10 -40 -10 40 -10"); //toggle platform
        map[map.length - 1].restitution = 0;
        map[map.length - 1].friction = 1;
        map[map.length - 1].frictionStatic = 1;
        spawn.bodyRect(x, y - 5, 120, 15) //toggle body called flip
        let flip = body[body.length - 1];
        flip.isNoSetCollision = true //prevents collision from being rewritten in level.addToWorld
        flip.collisionFilter.category = cat.body
        flip.collisionFilter.mask = cat.player | cat.body
        flip.isNotHoldable = true
        flip.frictionAir = 0.01
        flip.restitution = 0
        Matter.Body.setDensity(flip, 0.003)
        if (isOn) {
            Matter.Body.setAngle(flip, (0.25 - 0.5) * Math.PI)
        } else {
            Matter.Body.setAngle(flip, (-0.25 - 0.5) * Math.PI)
        }
        cons[cons.length] = Constraint.create({
            pointA: {
                x: x + 65,
                y: y - 5
            },
            bodyB: flip,
            stiffness: 1,
            length: 0
        });
        Composite.add(engine.world, [cons[cons.length - 1]]);

        return {
            flip: flip,
            isOn: isOn,
            query() {
                const limit = {
                    right: (-0.25 - 0.5) * Math.PI,
                    left: (0.25 - 0.5) * Math.PI
                }
                if (flip.angle < limit.right) {
                    Matter.Body.setAngle(flip, limit.right)
                    Matter.Body.setAngularVelocity(flip, 0);
                    if (!isLockOn) this.isOn = false
                } else if (flip.angle > limit.left) {
                    Matter.Body.setAngle(flip, limit.left)
                    Matter.Body.setAngularVelocity(flip, 0);
                    this.isOn = true
                }
                if (this.isOn) {
                    ctx.beginPath();
                    ctx.moveTo(flip.vertices[0].x, flip.vertices[0].y);
                    for (let j = 1; j < flip.vertices.length; j++) {
                        ctx.lineTo(flip.vertices[j].x, flip.vertices[j].y);
                    }
                    ctx.lineTo(flip.vertices[0].x, flip.vertices[0].y);
                    ctx.fillStyle = "#3df"
                    ctx.fill();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = color.blockS;
                    ctx.stroke();
                }
            },
        }
    },
    button(x, y, width = 126) {
        spawn.mapVertex(x + 65, y + 2, "100 10 -100 10 -70 -10 70 -10");
        map[map.length - 1].restitution = 0;
        map[map.length - 1].friction = 1;
        map[map.length - 1].frictionStatic = 1;

        // const buttonSensor = Bodies.rectangle(x + 35, y - 1, 70, 20, {
        //   isSensor: true
        // });

        return {
            isUp: false,
            min: {
                x: x + 2,
                y: y - 11
            },
            max: {
                x: x + width,
                y: y - 10
            },
            width: width,
            height: 20,
            query() {
                if (Matter.Query.region(body, this).length === 0 && Matter.Query.region([player], this).length === 0) {
                    this.isUp = true;
                } else {
                    if (this.isUp === true) {
                        const list = Matter.Query.region(body, this) //are any blocks colliding with this
                        if (list.length > 0) {
                            if (list[0].bounds.max.x - list[0].bounds.min.x < 150 && list[0].bounds.max.y - list[0].bounds.min.y < 150) { //not too big of a block
                                Matter.Body.setPosition(list[0], { //teleport block to the center of the button
                                    x: this.min.x + width / 2,
                                    y: list[0].position.y
                                })
                            }
                            Matter.Body.setVelocity(list[0], {
                                x: 0,
                                y: 0
                            });
                        }
                    }
                    this.isUp = false;
                }
            },
            draw() {
                ctx.fillStyle = "hsl(0, 100%, 70%)"
                if (this.isUp) {
                    ctx.fillRect(this.min.x, this.min.y - 10, this.width, 20)
                } else {
                    ctx.fillRect(this.min.x, this.min.y - 3, this.width, 25)
                }
            }
        }
    },
    door(x, y, width, height, distance) {
        x = x + width / 2
        y = y + height / 2
        const doorBlock = body[body.length] = Bodies.rectangle(x, y, width, height, {
            collisionFilter: {
                category: cat.body,
                mask: cat.player | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet //cat.player | cat.map | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet
            },
            inertia: Infinity, //prevents rotation
            isNotHoldable: true,
            friction: 1,
            frictionStatic: 1,
            restitution: 0,
            isOpen: false,
            openClose() {
                if (!m.isBodiesAsleep) {
                    if (!this.isOpen) {
                        if (this.position.y > y - distance) { //try to open 
                            const position = {
                                x: this.position.x,
                                y: this.position.y - 1
                            }
                            Matter.Body.setPosition(this, position)
                        }
                    } else {
                        if (this.position.y < y) { //try to close
                            if (
                                Matter.Query.collides(this, [player]).length === 0 &&
                                Matter.Query.collides(this, body).length < 2 &&
                                Matter.Query.collides(this, mob).length === 0
                            ) {
                                const position = {
                                    x: this.position.x,
                                    y: this.position.y + 1
                                }
                                Matter.Body.setPosition(this, position)
                            }
                        }
                    }
                }
            },
            draw() {
                ctx.fillStyle = "#555"
                ctx.beginPath();
                const v = this.vertices;
                ctx.moveTo(v[0].x, v[0].y);
                for (let i = 1; i < v.length; ++i) {
                    ctx.lineTo(v[i].x, v[i].y);
                }
                ctx.lineTo(v[0].x, v[0].y);
                ctx.fill();
            }
        });
        Matter.Body.setStatic(doorBlock, true); //make static
        return doorBlock
    },
    portal(centerA, angleA, centerB, angleB) {
        const width = 50
        const height = 150
        const mapWidth = 200
        const unitA = Matter.Vector.rotate({
            x: 1,
            y: 0
        }, angleA)
        const unitB = Matter.Vector.rotate({
            x: 1,
            y: 0
        }, angleB)

        draw = function() {
            ctx.beginPath(); //portal
            let v = this.vertices;
            ctx.moveTo(v[0].x, v[0].y);
            for (let i = 1; i < v.length; ++i) {
                ctx.lineTo(v[i].x, v[i].y);
            }
            ctx.fillStyle = this.color
            ctx.fill();
        }
        query = function(isRemoveBlocks = false) {
            if (Matter.Query.collides(this, [player]).length === 0) { //not touching player
                if (player.isInPortal === this) player.isInPortal = null
            } else if (player.isInPortal !== this) { //touching player
                if (m.buttonCD_jump === m.cycle) player.force.y = 0 // undo a jump right before entering the portal
                m.buttonCD_jump = 0 //disable short jumps when letting go of jump key
                player.isInPortal = this.portalPair
                //teleport
                if (this.portalPair.angle % (Math.PI / 2)) { //if left, right up or down
                    if (m.immuneCycle < m.cycle + tech.collisionImmuneCycles) m.immuneCycle = m.cycle + tech.collisionImmuneCycles; //player is immune to damage for 30 cycles
                    Matter.Body.setPosition(player, this.portalPair.portal.position);
                } else { //if at some odd angle
                    if (m.immuneCycle < m.cycle + tech.collisionImmuneCycles) m.immuneCycle = m.cycle + tech.collisionImmuneCycles; //player is immune to damage for 30 cycles
                    Matter.Body.setPosition(player, this.portalPair.position);
                }
                //rotate velocity
                let mag
                if (this.portalPair.angle !== 0 && this.portalPair.angle !== Math.PI) { //portal that fires the player up
                    mag = Math.max(10, Math.min(50, player.velocity.y * 0.8)) + 11
                } else {
                    mag = Math.max(6, Math.min(50, Vector.magnitude(player.velocity)))
                }
                let v = Vector.mult(this.portalPair.unit, mag)
                Matter.Body.setVelocity(player, v);
                // move bots to player
                for (let i = 0; i < bullet.length; i++) {
                    if (bullet[i].botType) {
                        // Matter.Body.setPosition(bullet[i], this.portalPair.portal.position);
                        Matter.Body.setPosition(bullet[i], Vector.add(this.portalPair.portal.position, {
                            x: 250 * (Math.random() - 0.5),
                            y: 250 * (Math.random() - 0.5)
                        }));
                        Matter.Body.setVelocity(bullet[i], {
                            x: 0,
                            y: 0
                        });
                    }
                }
            }
            // if (body.length) {
            for (let i = 0, len = body.length; i < len; i++) {
                if (body[i] !== m.holdingTarget) {
                    // body[i].bounds.max.x - body[i].bounds.min.x < 100 && body[i].bounds.max.y - body[i].bounds.min.y < 100
                    if (Matter.Query.collides(this, [body[i]]).length === 0) {
                        if (body[i].isInPortal === this) body[i].isInPortal = null
                    } else if (body[i].isInPortal !== this) { //touching this portal, but for the first time
                        if (isRemoveBlocks) {
                            Matter.Composite.remove(engine.world, body[i]);
                            body.splice(i, 1);
                            break
                        }
                        body[i].isInPortal = this.portalPair
                        //teleport
                        if (this.portalPair.angle % (Math.PI / 2)) { //if left, right up or down
                            Matter.Body.setPosition(body[i], this.portalPair.portal.position);
                        } else { //if at some odd angle
                            Matter.Body.setPosition(body[i], this.portalPair.position);
                        }
                        //rotate velocity
                        let mag
                        if (this.portalPair.angle !== 0 && this.portalPair.angle !== Math.PI) { //portal that fires the player up
                            mag = Math.max(10, Math.min(50, body[i].velocity.y * 0.8)) + 11
                        } else {
                            mag = Math.max(6, Math.min(50, Vector.magnitude(body[i].velocity)))
                        }
                        let v = Vector.mult(this.portalPair.unit, mag)
                        Matter.Body.setVelocity(body[i], v);
                    }
                }
            }
            // }

            //remove block if touching
            // if (body.length) {
            //   touching = Matter.Query.collides(this, body)
            //   for (let i = 0; i < touching.length; i++) {
            //     if (touching[i].bodyB !== m.holdingTarget) {
            //       for (let j = 0, len = body.length; j < len; j++) {
            //         if (body[j] === touching[i].bodyB) {
            //           body.splice(j, 1);
            //           len--
            //           Matter.Composite.remove(engine.world, touching[i].bodyB);
            //           break;
            //         }
            //       }
            //     }
            //   }
            // }

            // if (touching.length !== 0 && touching[0].bodyB !== m.holdingTarget) {
            //   if (body.length) {
            //     for (let i = 0; i < body.length; i++) {
            //       if (body[i] === touching[0].bodyB) {
            //         body.splice(i, 1);
            //         break;
            //       }
            //     }
            //   }
            //   Matter.Composite.remove(engine.world, touching[0].bodyB);
            // }
        }

        const portalA = composite[composite.length] = Bodies.rectangle(centerA.x, centerA.y, width, height, {
            isSensor: true,
            angle: angleA,
            color: "hsla(197, 100%, 50%,0.7)",
            draw: draw,
        });
        const portalB = composite[composite.length] = Bodies.rectangle(centerB.x, centerB.y, width, height, {
            isSensor: true,
            angle: angleB,
            color: "hsla(29, 100%, 50%, 0.7)",
            draw: draw
        });
        const mapA = composite[composite.length] = Bodies.rectangle(centerA.x - 0.5 * unitA.x * mapWidth, centerA.y - 0.5 * unitA.y * mapWidth, mapWidth, height + 10, {
            collisionFilter: {
                category: cat.map,
                mask: cat.bullet | cat.powerUp | cat.mob | cat.mobBullet //cat.player | cat.map | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet
            },
            unit: unitA,
            angle: angleA,
            color: color.map,
            draw: draw,
            query: query,
            lastPortalCycle: 0
        });
        Matter.Body.setStatic(mapA, true); //make static
        Composite.add(engine.world, mapA); //add to world

        const mapB = composite[composite.length] = Bodies.rectangle(centerB.x - 0.5 * unitB.x * mapWidth, centerB.y - 0.5 * unitB.y * mapWidth, mapWidth, height + 10, {
            collisionFilter: {
                category: cat.map,
                mask: cat.bullet | cat.powerUp | cat.mob | cat.mobBullet //cat.player | cat.map | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet
            },
            unit: unitB,
            angle: angleB,
            color: color.map,
            draw: draw,
            query: query,
            lastPortalCycle: 0,
        });
        Matter.Body.setStatic(mapB, true); //make static
        Composite.add(engine.world, mapB); //add to world

        mapA.portal = portalA
        mapB.portal = portalB
        mapA.portalPair = mapB
        mapB.portalPair = mapA
        return [portalA, portalB, mapA, mapB]
    },
    drip(x, yMin, yMax, period = 100, color = "hsla(160, 100%, 35%, 0.5)") {
        return {
            x: x,
            y: yMin,
            period: period,
            dropCycle: 0,
            speed: 0,
            draw() {
                if (!m.isBodiesAsleep) {
                    if (this.dropCycle < simulation.cycle) { //reset
                        this.dropCycle = simulation.cycle + this.period + Math.floor(40 * Math.random())
                        this.y = yMin
                        this.speed = 1
                    } else { //fall
                        this.speed += 0.35 //acceleration from gravity
                        this.y += this.speed
                    }
                }
                if (this.y < yMax) { //draw
                    ctx.fillStyle = color //"hsla(160, 100%, 35%,0.75)"
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 8, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }
    },
    isHazardRise: false,
    hazard(x, y, width, height, damage = 0.003) {
        return {
            min: {
                x: x,
                y: y
            },
            max: {
                x: x + width,
                y: y + height
            },
            width: width,
            height: height,
            maxHeight: height,
            isOn: true,
            opticalQuery() {
                if (this.isOn) {
                    //draw
                    ctx.fillStyle = `hsla(0, 100%, 50%,${0.6 + 0.4 * Math.random()})`
                    ctx.fillRect(this.min.x, this.min.y, this.width, this.height)
                    //collision with player
                    if (this.height > 0 && Matter.Query.region([player], this).length && !(m.isCloak)) {
                        if (m.immuneCycle < m.cycle) {
                            m.immuneCycle = m.cycle + tech.collisionImmuneCycles;
                            m.damage(damage)
                            simulation.drawList.push({ //add dmg to draw queue
                                x: player.position.x,
                                y: player.position.y,
                                radius: damage * 1500,
                                color: simulation.mobDmgColor,
                                time: 20
                            });
                        }
                    }
                }
            },
            query() {
                if (this.isOn) {
                    ctx.fillStyle = "hsla(160, 100%, 35%,0.75)"
                    const offset = 5 * Math.sin(simulation.cycle * 0.015)
                    ctx.fillRect(this.min.x, this.min.y + offset, this.width, this.height - offset)

                    if (this.height > 0 && Matter.Query.region([player], this).length) {
                        if (m.immuneCycle < m.cycle) {
                            const DRAIN = 0.002 * (tech.isRadioactiveResistance ? 0.25 : 1) + m.fieldRegen
                            if (m.energy > DRAIN) {
                                m.energy -= DRAIN
                                m.damage(damage * (tech.isRadioactiveResistance ? 0.25 : 1) * 0.03) //still take 2% damage while you have energy
                            } else {
                                m.damage(damage * (tech.isRadioactiveResistance ? 0.25 : 1))
                            }
                        }
                        //float
                        if (player.velocity.y > 5) player.force.y -= 0.95 * player.mass * simulation.g
                        const slowY = (player.velocity.y > 0) ? Math.max(0.8, 1 - 0.002 * player.velocity.y * player.velocity.y) : Math.max(0.98, 1 - 0.001 * Math.abs(player.velocity.y)) //down : up
                        Matter.Body.setVelocity(player, {
                            x: Math.max(0.95, 1 - 0.036 * Math.abs(player.velocity.x)) * player.velocity.x,
                            y: slowY * player.velocity.y
                        });
                    }
                    //float power ups
                    powerUpCollide = Matter.Query.region(powerUp, this)
                    for (let i = 0, len = powerUpCollide.length; i < len; i++) {
                        const diameter = 2 * powerUpCollide[i].size
                        const buoyancy = 1 - 0.2 * Math.max(0, Math.min(diameter, this.min.y - powerUpCollide[i].position.y + powerUpCollide[i].size)) / diameter
                        powerUpCollide[i].force.y -= buoyancy * 1.1 * powerUpCollide[i].mass * simulation.g;
                        Matter.Body.setVelocity(powerUpCollide[i], {
                            x: powerUpCollide[i].velocity.x,
                            y: 0.95 * powerUpCollide[i].velocity.y
                        });
                    }
                }
            },
            // draw() {
            //     if (this.isOn) {
            //         ctx.fillStyle = color
            //         ctx.fillRect(this.min.x, this.min.y, this.width, this.height)
            //     }
            // },
            level(isFill) {
                if (!m.isBodiesAsleep) {
                    const growSpeed = 1
                    if (isFill) {
                        if (this.height < this.maxHeight) {
                            this.height += growSpeed
                            this.min.y -= growSpeed
                            this.max.y = this.min.y + this.height
                        }
                    } else if (this.height > 0) {
                        this.height -= growSpeed
                        this.min.y += growSpeed
                        this.max.y = this.min.y + this.height
                    }
                }
            }
        }
    },
    chain(x, y, angle = 0, isAttached = true, len = 15, radius = 20, stiffness = 1, damping = 1) {
        const gap = 2 * radius
        const unit = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        }
        for (let i = 0; i < len; i++) {
            body[body.length] = Bodies.polygon(x + gap * unit.x * i, y + gap * unit.y * i, 12, radius, {
                inertia: Infinity,
                isNotHoldable: true
            });
        }
        for (let i = 1; i < len; i++) { //attach blocks to each other
            consBB[consBB.length] = Constraint.create({
                bodyA: body[body.length - i],
                bodyB: body[body.length - i - 1],
                stiffness: stiffness,
                damping: damping
            });
            Composite.add(engine.world, consBB[consBB.length - 1]);
        }
        cons[cons.length] = Constraint.create({ //pin first block to a point in space
            pointA: {
                x: x,
                y: y
            },
            bodyB: body[body.length - len],
            stiffness: 1,
            damping: damping
        });
        Composite.add(engine.world, cons[cons.length - 1]);
        if (isAttached) {
            cons[cons.length] = Constraint.create({ //pin last block to a point in space
                pointA: {
                    x: x + gap * unit.x * (len - 1),
                    y: y + gap * unit.y * (len - 1)
                },
                bodyB: body[body.length - 1],
                stiffness: 1,
                damping: damping
            });
            Composite.add(engine.world, cons[cons.length - 1]);
        }
    },
	water(x, y, width, height) {
        return {
            min: {
                x: x,
                y: y
            },
            max: {
                x: x + width,
                y: y + height
            },
            width: width,
            height: height,
            maxHeight: height,
            isOn: true,
            opticalQuery() {
                if (this.isOn) {
                    //draw
					ctx.save()
					ctx.globalCompositeOperation = "multiply"
                    ctx.fillStyle = `hsla(193, 76%, 90%,0.75)`
                    ctx.fillRect(this.min.x, this.min.y, this.width, this.height)
					ctx.restore()
					ctx.globalCompositeOperation = "source-over"
                    //collision with player
                    if (this.height > 0 && Matter.Query.region([player], this).length && !(m.isCloak)) {
						const randomValue = (50 * Math.random())
						simulation.drawList.push({ //add water to draw queue
							x: headSensor.position.x,
							y: headSensor.position.y + randomValue,
							radius: 10,
							color: "hsla(193, 76%, 90%,0.75)",
							time: 2
						});						
						simulation.drawList.push({ //add water to draw queue
							x: headSensor.position.x,
							y: headSensor.position.y + randomValue,
							radius: 6,
							color: "#FFFFFF55",
							time: 2
						});
                    }
                }
            },
            query() {
                if (this.isOn) {

                    const offset = 5 * Math.sin(simulation.cycle * 0.015)
                    // ctx.fillRect(this.min.x, this.min.y + offset, this.width, this.height - offset)
					//ctx.globalCompositeOperation = "hue"
					// ctx.fillStyle = "#ccc"; 
					ctx.fillStyle = "hsla(193, 76%, 90%,0.75)"
					ctx.fillRect(this.min.x, this.min.y + offset, this.width, this.height - offset)
					// ctx.globalCompositeOperation = "destination-over"					
					
					ctx.globalCompositeOperation = "hue"
					ctx.fillStyle = "#ccc"; 
					ctx.fillRect(this.min.x - 2, this.max.y - 2, this.width + 4, 75 + 4)
					ctx.globalCompositeOperation = "destination-over"
					
					
					//ctx.fillRect(this.min.x, this.min.y + offset, this.width, this.height - offset + 4000)
					
                    if (this.height > 0 && Matter.Query.region([player], this).length) {
						player.force.y -= (input.up ? 0.01:0.005);
						const slowY = (player.velocity.y > 0) ? Math.max(0.8, 1 - 0.002 * player.velocity.y * player.velocity.y) : Math.max(0.98, 1 - 0.001 * Math.abs(player.velocity.y)) //down : up
						Matter.Body.setVelocity(player, {
							x: Math.max(0.95, 1 - 0.036 * Math.abs(player.velocity.x)) * player.velocity.x,
							y: slowY * player.velocity.y
						});
						// const randomValue = (50 * Math.random())
						// const randomValue2 = (Math.random() > 0.5 ? (50 * Math.random()) : (-50 * Math.random()))
						// simulation.drawList.push({ //add water to draw queue
							// x: headSensor.position.x + randomValue2,
							// y: headSensor.position.y + randomValue,
							// radius: 10,
							// color: "hsla(193, 76%, 90%,0.75)",
							// time: 2
						// });						
						// simulation.drawList.push({ //add water to draw queue
							// x: headSensor.position.x + randomValue2,
							// y: headSensor.position.y + randomValue,
							// radius: 6,
							// color: "#FFFFFF55",
							// time: 2
						// });
                    }
                    //float power ups
                    powerUpCollide = Matter.Query.region(powerUp, this)
                    for (let i = 0, len = powerUpCollide.length; i < len; i++) {
                        const diameter = 2 * powerUpCollide[i].size
                        const buoyancy = 1 - 0.2 * Math.max(0, Math.min(diameter, this.min.y - powerUpCollide[i].position.y + powerUpCollide[i].size)) / diameter
                        powerUpCollide[i].force.y -= buoyancy * 1.1 * powerUpCollide[i].mass * simulation.g;
                        Matter.Body.setVelocity(powerUpCollide[i], {
                            x: powerUpCollide[i].velocity.x,
                            y: 0.95 * powerUpCollide[i].velocity.y
                        });
                    }
                }
            },
            level(isFill) {
                if (!m.isBodiesAsleep) {
                    const growSpeed = 1
                    if (isFill) {
                        if (this.height < this.maxHeight) {
                            this.height += growSpeed
                            this.min.y -= growSpeed
                            this.max.y = this.min.y + this.height
                        }
                    } else if (this.height > 0) {
                        this.height -= growSpeed
                        this.min.y += growSpeed
                        this.max.y = this.min.y + this.height
                    }
                }
            }
        }
    },
	perlinNoise(x) {
	  // Generate a random gradient vector for each integer coordinate
	  function generateGradientVector(x) {
		let random =  Math.abs(Math.sin(x));
		random = random - Math.floor(random);
		return random * 2 - 1; // Normalize to [-1, 1]
	  }

	  // Interpolate between two values using cosine interpolation
	  function interpolate(a, b, t) {
		const ft = t * Math.PI;
		const f = (1 - Math.cos(ft)) * 0.5;
		return a * (1 - f) + b * f;
	  }

	  // Compute the dot product between the gradient vector and distance vector
	  function dotProduct(gradient, dx) {
		return gradient * dx;
	  }

	  const x0 = Math.floor(x);
	  const x1 = x0 + 1;
	  const dx = x - x0;

	  const gradient0 = generateGradientVector(x0);
	  const gradient1 = generateGradientVector(x1);

	  const n0 = dotProduct(gradient0, dx);
	  const n1 = dotProduct(gradient1, dx - 1);

	  // Interpolate the noise values
	  const noise = interpolate(n0, n1, dx);

	  return noise;
	},
    //******************************************************************************************************************
    //******************************************************************************************************************
    //******************************************************************************************************************
    //******************************************************************************************************************
    openWorldTest() {
		const seaLevel = 75;
		let floor = [];
		let trees = [];
		let lake = [];
		color.map = "black";
		function Raindrop() {
		  this.y = player.position.y + Math.random() * -5000 - Math.random() * 5000;
		  this.x = player.position.x + Math.random() * 5000 - Math.random() * 5000;
		  this.speed = Math.random() * 5 + 25;
		  this.length = Math.random() * 20 + 30;
		}
		const raindrops = [];
		function drawRaindrop(drop) {
			if(Math.sqrt(Math.pow(player.position.x - drop.x, 2) + Math.pow(player.position.y - drop.y, 2)) + Math.PI < 5000) {
				ctx.beginPath();
				ctx.moveTo(drop.x, drop.y);
				ctx.lineTo(drop.x, drop.y + drop.length);
				ctx.strokeStyle = '#00FFFF';
				ctx.lineWidth = 10;
				ctx.lineCap = 'butt';
				ctx.stroke();
			} else {
				do {
					drop.y = player.position.y + Math.random() * -5000 - Math.random() * 5000;
					drop.x = player.position.x + Math.random() * 5000 - Math.random() * 5000;
				} while(Math.sqrt(Math.pow(player.position.x - drop.x, 2) + Math.pow(player.position.y - drop.y, 2)) + Math.PI < 5000 && drop.x < 0);
			}
		}
		function updateRaindrop(drop) {
		  drop.y += drop.speed;
		  if((Matter.Query.ray(map, { x: drop.x, y: drop.y }, { x: drop.x, y: drop.y - drop.length }).length === 0) == false) {
			simulation.drawList.push({
				x: drop.x,
				y: drop.y - drop.length,
				radius: 10,
				color: "rgb(0,100,250,0.3)",
				time: 8
			});
			do {
				drop.y = player.position.y + Math.random() * -5000 - Math.random() * 5000;
				drop.x = player.position.x + Math.random() * 5000 - Math.random() * 5000;
			} while(Math.sqrt(Math.pow(player.position.x - drop.x, 2) + Math.pow(player.position.y - drop.y, 2)) + Math.PI < 5000)
		  }
		}
		function drawTree(x, y, width, height) {
		  const trunkColor = '#8B4513'; // Brown
		  const leafColor = "#008000"; // Green
		  ctx.save()
		  ctx.beginPath()
		  ctx.lineWidth = 2;
		  ctx.strokeStyle = trunkColor;
		  ctx.fillStyle = trunkColor;
		  ctx.strokeRect(x, y, width, height);
		  ctx.fillRect(x, y, width, height);
		  ctx.fill()
		  ctx.stroke()
		  ctx.restore()
		  
		  ctx.save()
		  ctx.beginPath()
		  ctx.strokeStyle = leafColor;
		  ctx.fillStyle = leafColor;
		  ctx.lineWidth = 5;
		  ctx.strokeRect(x, y - 100, width, height - width)
		  ctx.strokeRect(x - 100, y, width * 3, height / 2)		  
		  ctx.fillRect(x, y - 100, width, height - width)
		  ctx.fillRect(x - 100, y, width * 3, height / 2)
		  ctx.stroke()
		  ctx.fill()
		  ctx.restore()
		}
		function round(num, round = 25) {
			return Math.floor(num / round) * round; 
		}
		function hasDuplicates(a) {
		  const noDups = new Set(a);
		  return a.length !== noDups.size;
		}
		const generateTerrain = () => {
		  function removeAll(array) {
			for (let i = 0; i < array.length; i++) {
				//if(player.position.x - 1000 < array[i].position.x || player.position.x + 1000 > array[i].position.x) {
					Matter.Composite.remove(engine.world, array[i]);
				//}
			}
		  }
		  removeAll(map)
		  map = []
		  floor = []
		  lake = []
		  const playerX = player.position.x;
		  const history = m.history[(m.cycle - 30 * i) % 600]
		  
		  // Check if player has moved right
		  if (playerX > history.position.x) {
			for(let i = -7500; i < 7500; i += 100) {
				let leftRectY = round(perlin.get(Math.cos(round(playerX + i, 100) / 3000), Math.sin(round(playerX + i, 100) / 3000)) * -2500);
				let leftRect = { x: round(playerX + 100, 100) + i, y: leftRectY, width: 100 + 2, height: 6000};
				floor.push(leftRect)
			}
		  }
		  // Check if player has moved left
		  if (playerX < history.position.x) {
			for(let i = -7500; i < 7500; i += 100) {
				let rightRectY = round(perlin.get(Math.cos(round(playerX + i - 100, 100) / 3000), Math.sin(round(playerX + i - 100, 100) / 3000)) * -2500);
				let rightRect = {x: round(playerX, 100) + i, y: rightRectY, width: 100, height: 6000};
				floor.push(rightRect)
			}
		  }
		  // Spawn the map rects
		  for (let i = 0; i < floor.length; i++) {
			  if(Matter.Query.ray(map, { x: floor[i].x + floor[i].width / 2, y: floor[i].y + floor[i].height / 2}, { x: floor[i].x + floor[i].width / 2, y: floor[i].y + floor[i].height / 2}).length === 0) {
				spawn.mapRectNow(floor[i].x, floor[i].y, floor[i].width, floor[i].height);
			  }
		  }
			for(let i = floor.length - 1; i > 0; i--) {
				if(map[i].vertices[0].y > seaLevel) {
					lake.push(level.water(map[i].vertices[0].x, seaLevel + 1, 100, Math.abs(map[i].vertices[0].y - 75)))
				}
			}
		}
		
		let mapLength = 0;
        level.custom = () => {
			// for(let i = 0; i < trees.length; i++) {
				// if(trees[i].y + 400 < 75) {
					// drawTree(trees[i].x, trees[i].y, 100, 400);
				// }
			// }
			if (m.pos.x > 0.55 * 100 + mapLength * 100) {
                mapLength++
                generateTerrain()
            } else if (m.pos.x < -0.55 * 100 + mapLength * 100) {
                mapLength--
                generateTerrain()
            }
		};

		for(let i = -7500; i < 7500; i += 100) {
			floor.push({x: i - 1, y: round(perlin.get(Math.cos(i / 3000), Math.sin(i / 3000)) * -2500), width: 100 + 2, height: 6000})
			// spawn.mapRect(i, round(Math.min(150 * Math.sin(i) * Math.random(), 200 * Math.cos(i) * Math.random()), 25), 100, 3000)
		}
		for(let i = 0; i < floor.length; i++) {
			spawn.mapRectNow(floor[i].x + 100, floor[i].y, floor[i].width, floor[i].height)
		}
		for(let i = floor.length - 1; i > 0; i--) {
			if(map[i].vertices[0].y > seaLevel) {
				lake.push(level.water(map[i].vertices[0].x, seaLevel + 1, 100, Math.abs(map[i].vertices[0].y - 75)))
			}
		}
		// for(let i = 0; i < map.length; i++) {
			// if(Math.random() < 0.1) {
				// trees.push({x: map[i].vertices[0].x, y: map[i].vertices[0].y - 400})
			// }
		// }
		// for(let i = 0; i < map.length; i++) {
			// if(Math.random() < 0.2) {
				// spawn.hopper(map[i].position.x, map[i].vertices[0].y)
			// }
		// }
        level.setPosToSpawn(0, -150); //normal spawn
        level.defaultZoom = 3000
        simulation.zoomTransition(level.defaultZoom)
        document.body.style.backgroundColor = "skyblue";
		simulation.enableConstructMode()
				  function removeAll(array) {
		  	for (let i = 0; i < array.length; ++i) if(player.position.x - 1000 < array[i].position.x || player.position.x + 1000 > array[i].position.x) Matter.Composite.remove(engine.world, array[i]);
		  }
		  removeAll(map)
		level.customTopLayer = () => {
			for(let d = 0; d < Math.abs(Math.sin(map.length)); d++) {
			ctx.beginPath()
			ctx.moveTo(map[0].vertices[0].x, map[1].vertices[3].y)
			for(let i = 0; i < map.length; i++) {
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[0].y)
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[1].y)
			}
			for(let i = map.length - 1; i > 0; i--) {
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[1].y + 25)
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[0].y + 25)
			}
			ctx.strokeStyle = "#7CFC00";
			ctx.fillStyle = "#7CFC00";
			ctx.closePath()
			ctx.stroke()
			ctx.fill()			
			
			ctx.beginPath()
			ctx.lineTo(map[0].vertices[3].x, map[0].vertices[3].y + 25)
			for(let i = 0; i < map.length; i++) {
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[0].y + 25)
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[1].y + 25)
			}
			for(let i = map.length - 1; i > 0; i--) {
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[1].y + 75)
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[0].y + 75)
			}
			ctx.strokeStyle = "brown";
			ctx.fillStyle = "brown";
			ctx.closePath()
			ctx.stroke()
			ctx.fill()			
			
			ctx.beginPath()
			ctx.lineTo(map[0].vertices[3].x, map[0].vertices[3].y + 75)
			for(let i = 0; i < map.length; i++) {
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[0].y + 75)
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[1].y + 75)
			}
			for(let i = map.length - 1; i > 0; i--) {
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[1].y + 300)
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[0].y + 300)
			}
			ctx.strokeStyle = "lightgray";
			ctx.fillStyle = "lightgray";
			ctx.closePath()
			ctx.stroke()
			ctx.fill()			
			
			ctx.beginPath()
			ctx.lineTo(map[0].vertices[3].x, map[0].vertices[3].y + 300)
			for(let i = 0; i < map.length; i++) {
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[0].y + 300)
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[1].y + 300)
			}
			for(let i = map.length - 1; i > 0; i--) {
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[1].y + 500)
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[0].y + 500)
			}
			ctx.strokeStyle = "darkgray";
			ctx.fillStyle = "darkgray";
			ctx.closePath()
			ctx.stroke()
			ctx.fill()			
			
			ctx.beginPath()
			ctx.lineTo(map[0].vertices[3].x, map[0].vertices[3].y)
			for(let i = 0; i < map.length; i++) {
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[0].y + 500)
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[1].y + 500)
			}
			for(let i = map.length - 1; i > 0; i--) {
				ctx.lineTo(map[i].vertices[1].x, map[i].vertices[3].y)
				ctx.lineTo(map[i].vertices[0].x, map[i].vertices[3].y)
			}
			ctx.strokeStyle = "gray";
			ctx.fillStyle = "gray";
			ctx.closePath()
			ctx.stroke()
			ctx.fill()
			}
			// if(raindrops.length < 100) { // too many (like 900) can cause a little bit of lag minus 5 ~ 10 fps, but it really just depends on your computer
				// raindrops.push(new Raindrop());
			// }
			// for (let i = 0; i < raindrops.length; i++) {
				// const drop = raindrops[i];
				// drawRaindrop(drop);
				// updateRaindrop(drop);
			// }
			for(let i = 0; i < lake.length; i++) {
				lake[i].query()
			}
		};
    },
};