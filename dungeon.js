
    // 2d vector
    function Vec2(x,y) {
        this.x = x;
        this.y = y;
    }

    // axis aligned bounding box
    function AABB(x,y,w,h) {
        this.position = new Vec2(x,y);
        this.size = new Vec2(w,h);
    }

    AABB.prototype.setPosition = function(x,y) {
        this.position.x = x;
        this.position.y = y;
    };

    AABB.prototype.setWidth = function(w) {
        if(w>0)
            this.size.x = w;
    };

    AABB.prototype.setHeight = function(h) {
        if(h>0)
            this.size.y = h;
    };

    AABB.prototype.getVolume = function() {
        return this.size.x*this.size.y;
    };

    AABB.prototype.getCenter = function() {
        return new Vec2(this.position.x+this.size.x/2, this.position.y+this.size.y/2);
    };

    // binary tree

    function BinaryTree(root) {
        this.root = root;
        this.current = null;
    }

    BinaryTree.prototype.BeginTraverse = function(foo) {
        this.current = this.root;
        this.Traverse(this.current);
        this.func = foo;
    }

    BinaryTree.prototype.Traverse = function(node) {
        if(node !== null){
            this.func(node);
            this.Traverse(node.left);
            this.Traverse(node.right);
        }else{
            return;
        }
    }

    function Node(parent, data, left, right) {
        this.parent = parent;
        this.data = data;
        this.left = left;
        this.right = right;
        this.left_visited = false;
        this.right_visited = false; 
    }

    Node.prototype.addLeftChild = function (data) {
        this.left = new Node(this, data, null, null);
        return this.left;
    };

    Node.prototype.addRightChild = function (data) {
        this.right = new Node(this, data, null, null);
        return this.right;
    };

    function NodeIterator(root) {
        this.root = root;
        this.current = root;
    }

    // stop iteration exception
    StopIteration = function () {};
    StopIteration.prototype = new Error();
    StopIteration.name = 'StopIteration';
    StopIteration.message = 'StopIteration';

    NodeIterator.prototype.next = function() {
        if(this.current.left !== null && this.current.left_visited === false) {
            this.current.left_visited = true;
            this.current = this.current.left;
            return;
        }
        if(this.current.right !== null && this.current.right_visited === false) {
            this.current.right_visited = true;
            this.current = this.current.right;
            return;
        }
        if(this.current.parent !== null){
            this.current = this.current.parent;
            this.next();
            return;
        }else
            throw StopIteration;
    };

    Node.prototype.__iterator__ = function() {
        return new NodeIterator(this);
    };



    // Dungeon

    function Dungeon(width, height, unit_square, seed) {

        this.width = Math.floor(width) || 80;
        this.height = Math.floor(height) || 60;
        this.unit_square = unit_square || 32;
        this.rooms = [];
        this.corridors = [];
        this.entrance = new Vec2(0,0);
        this.exit = new Vec2(0,0);

        // Setup grid for pathfinding
        this.grid = new Array(height);
        for(var i = 0; i<this.height; i++) {
            this.grid[i] = new Array(width);
            for(var j = 0; j<this.width; j++) {
                this.grid[i][j] = 0;
            }
        }

        // Setup mersenne twister rand
        if(typeof seed === 'undefined') {
            this.MTW = new MersenneTwister();
            this.seed = this.MTW.GetSeed();
        } else {
            this.seed = seed;
            this.MTW = new MersenneTwister(this.seed);
        }

        // Setup easystar pathfinding library
        this.PATH = new EasyStar.js();
        this.PATH.setAcceptableTiles([0]);
        this.PATH.setGrid(this.grid);

        // Root node of the bsp tree
        this.rootNode = new Node(null, new AABB(0,0,this.width, this.height), null, null);
        
        // Debug info
        this.showDebug = true;
        this._debugContext = {};
        this._debugSquare = 32;
    }

    Dungeon.prototype.setupDebug = function (context, unit_square) {
        this._debugContext = context;
        this._debugSquare = unit_square;
    };

    Dungeon.prototype._splitSpace = function(node) {
        var space = node.data;

        // Choose how to split
        var ratio = space.size.x / space.size.y;
        var splitVertical = true;
        if(ratio < 1.0)
            splitVertical = false;

        var split = this.MTW.random();
        do {
            split = this.MTW.random();
        } while(split < 0.4 || split > 0.6)

        // Split / Calc subspaces
        var subspaceA, subspaceB;

        if(splitVertical) {
            var splitX = space.position.x + Math.floor(split * space.size.x);
            subspaceA = new AABB(space.position.x, space.position.y,
                                 Math.floor(split * space.size.x), space.size.y);
            subspaceB = new AABB(splitX, space.position.y,
                                 Math.floor((1-split) * space.size.x), space.size.y);
        } else {
            var splitY = space.position.y + Math.floor(split * space.size.y);
            subspaceA = new AABB(space.position.x, space.position.y,
                                 space.size.x, Math.floor(split * space.size.y));
            subspaceB = new AABB(space.position.x, splitY,
                                 space.size.x, Math.floor((1-split) * space.size.y));
        }

        // DEBUG DRAW
        if( this.showDebug ) {
            this._debugContext.fillStyle = "rgb(" + Math.floor(0+this.MTW.random()*255) + "," + Math.floor(0+this.MTW.random()*255) + "," + Math.floor(0+this.MTW.random()*255) + ")";
            this._debugContext.fillRect( 
                this._debugSquare*subspaceA.position.x,
                this._debugSquare*subspaceA.position.y,
                this._debugSquare*subspaceA.size.x,
                this._debugSquare*subspaceA.size.y );
            this._debugContext.fillStyle = "rgb(" + Math.floor(0+this.MTW.random()*255) + "," + Math.floor(0+this.MTW.random()*255) + "," + Math.floor(0+this.MTW.random()*255) + ")";
            this._debugContext.fillRect( 
                this._debugSquare*subspaceB.position.x,
                this._debugSquare*subspaceB.position.y,
                this._debugSquare*subspaceB.size.x,
                this._debugSquare*subspaceB.size.y );
        }
        // DEBUG DRAW

        // Create and setup nodes
        var childA, childB;
        childA = node.addLeftChild(subspaceA);
        childB = node.addRightChild(subspaceB);

        // Choice: should i split more? (and continue the recursion)
        if(subspaceA.size.x > 7 && subspaceA.size.y > 6)
            this._splitSpace(childA);
        if(subspaceB.size.x > 7 && subspaceB.size.y > 6)
            this._splitSpace(childB);

    };


    Dungeon.prototype._flattenAndDigCorridors = function (node, rooms, corridors) {
        var it = new NodeIterator(node); // Tree iterator
        try {
            while (it.current !== null) {
                // Check if we are on leaf (room) and it
                // matches our criteria (width and height > 2)
                if (it.current.left == null && it.current.right == null &&
                    it.current.data.size.x > 2 && it.current.data.size.y > 2) {
                    rooms.push(it.current.data);
                } else {
                // Create a corridor between the
                // subspaces (left and right children)
                    var spaceA = it.current.left.data;
                    var spaceB = it.current.right.data;
                    var centerA = new Vec2( spaceA.position.x + Math.floor(spaceA.size.x/2),
                                            spaceA.position.y + Math.floor(spaceA.size.y/2));
                    var centerB = new Vec2( spaceB.position.x + Math.floor(spaceB.size.x/2),
                                            spaceB.position.y + Math.floor(spaceB.size.y/2));
                    this.PATH.findPath ( centerA.x, centerA.y,
                                    centerB.x, centerB.y,
                                    function (path) {
                                        if (path === null) {
                                            alert("Cant create corridor!");
                                        } else {
                                            corridors.push(path);
                                            if ( this.showDebug ) {
                                                var pathString = "Path: ";
                                                for(var i = 0; i<path.length; i++)
                                                    pathString += "[" + path[i].x + ", " + path[i].y + "]";
                                                console.log(pathString);
                                            }
                                        }
                                    });
                    this.PATH.calculate();
                }
                it.next();
            }
        } catch (e) {
            console.log(e.message);
        }
    };


    Dungeon.prototype._setupEntranceAndExit = function () {
        // Entrance
        var i = Math.floor( this.MTW.random() * this.rooms.length/2 );
        var entrRoom = this.rooms[i];
        this.entrance.x = this.unit_square * Math.floor(entrRoom.position.x + entrRoom.size.x/2);
        this.entrance.y = this.unit_square * Math.floor(entrRoom.position.y + entrRoom.size.y/2);

        // Exit
        var j = Math.floor( this.rooms.length/2 + this.MTW.random() * Math.floor(this.rooms.length/2) );
        var exitRoom = this.rooms[j];
        this.exit.x = this.unit_square * Math.floor(exitRoom.position.x + exitRoom.size.x/2);
        this.exit.y = this.unit_square * Math.floor(exitRoom.position.y + exitRoom.size.y/2);
    };


    Dungeon.prototype.Generate = function(seed) {
        this._splitSpace(this.rootNode);
        this._flattenAndDigCorridors(this.rootNode, this.rooms, this.corridors);
        this._setupEntranceAndExit();
    };


    Dungeon.prototype.SetSeed = function (seed) {
        if(typeof seed === "undefined") {
            this.MTW = new MersenneTwister();
        } else {
            this.seed = seed || this.seed;
            this.MTW = new MersenneTwister(this.seed);
        }
    };


    Dungeon.prototype.Clear = function () {
        delete this.rootNode;
        this.rootNode = new Node(null, new AABB(0,0,this.width, this.height), null, null);
        this.rooms = [];
        this.corridors = [];
    };
    

    Dungeon.prototype.Draw = function(context, images) {
        // Draw rooms
        for(var i = 0; i<this.rooms.length; i++) {
            var x = this.rooms[i].position.x;
            var y = this.rooms[i].position.y;
            var w = this.rooms[i].size.x;
            var h = this.rooms[i].size.y;
            for(var j = x+1; j<(x+w-1); j++) {
                for(var k = y+1; k<(y+h-1); k++) {
                    context.drawImage(images.floor, this.unit_square*j, this.unit_square*k);
                }
            }
        }

        // Draw corridors
        for(var i = 0; i<this.corridors.length; i++) {
            var corridor = this.corridors[i];
            for(var j = 0; j<corridor.length; j++) {
                context.drawImage(images.floor, this.unit_square*corridor[j].x, this.unit_square*corridor[j].y);
            }
        }

        // Draw entrance and exit
        context.drawImage( images.enter, this.entrance.x, this.entrance.y);
        context.drawImage( images.exit, this.exit.x, this.exit.y);
    };

